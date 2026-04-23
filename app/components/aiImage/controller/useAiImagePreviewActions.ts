import { zipSync } from "fflate";
import type { SetStateAction } from "react";
import { useCallback } from "react";

import type { GeneratedImageItem } from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import {
  applyPinnedPreviewSeedAction,
  applySelectedPreviewSeedAction,
  clearPinnedPreviewAction,
  downloadCurrentAction,
  openPreviewImageAction,
  selectPinnedPreviewAction,
  togglePinnedPreviewAction,
} from "@/components/aiImage/controller/previewActions";
import {
  base64ToBytes,
  dataUrlToBase64,
  extensionFromDataUrl,
  fileFromDataUrl,
  generatedItemKey,
  makeStableId,
} from "@/components/aiImage/helpers";
import { triggerBlobDownload, triggerBrowserDownload } from "@/components/aiImage/helpers";

interface UseAiImagePreviewActionsOptions {
  uiMode: "simple" | "pro";
  isDirectorToolsOpen: boolean;
  selectedPreviewResult: GeneratedImageItem | null;
  selectedPreviewIdentityKey: string | null;
  pinnedPreviewKey: string | null;
  pinnedPreviewResult: GeneratedImageItem | null;
  results: GeneratedImageItem[];
  history: AiImageHistoryRow[];
  historyRowByKey: Map<string, AiImageHistoryRow>;
  directorInputPreview: GeneratedImageItem | null;
  directorOutputPreview: GeneratedImageItem | null;
  showErrorToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
  setSelectedHistoryPreviewKey: (value: string | null) => void;
  setSelectedResultIndex: (value: number) => void;
  setDirectorSourceItems: (value: SetStateAction<GeneratedImageItem[]>) => void;
  setDirectorSourcePreview: (value: GeneratedImageItem | null) => void;
  setDirectorOutputPreview: (value: GeneratedImageItem | null) => void;
  setIsPreviewImageModalOpen: (value: boolean) => void;
  setPinnedPreviewKey: (value: string | null) => void;
  setSimpleSeed: (value: number) => void;
  setProSeed: (value: number) => void;
}

export function useAiImagePreviewActions({
  uiMode,
  isDirectorToolsOpen,
  selectedPreviewResult,
  selectedPreviewIdentityKey,
  pinnedPreviewKey,
  pinnedPreviewResult,
  results,
  history,
  historyRowByKey,
  directorInputPreview,
  directorOutputPreview,
  showErrorToast,
  showSuccessToast,
  setSelectedHistoryPreviewKey,
  setSelectedResultIndex,
  setDirectorSourceItems,
  setDirectorSourcePreview,
  setDirectorOutputPreview,
  setIsPreviewImageModalOpen,
  setPinnedPreviewKey,
  setSimpleSeed,
  setProSeed,
}: UseAiImagePreviewActionsOptions) {
  const handleSelectCurrentResult = useCallback((index: number) => {
    setSelectedHistoryPreviewKey(null);
    setSelectedResultIndex(index);
    if (isDirectorToolsOpen)
      setDirectorOutputPreview(null);
  }, [isDirectorToolsOpen, setDirectorOutputPreview, setSelectedHistoryPreviewKey, setSelectedResultIndex]);

  const handlePreviewHistoryRow = useCallback((row: AiImageHistoryRow) => {
    const rowKey = `id:${row.id ?? `temp:${row.createdAt}-${row.seed}-${row.batchIndex ?? 0}`}`;
    setSelectedHistoryPreviewKey(rowKey);
    if (isDirectorToolsOpen)
      setDirectorOutputPreview(null);
  }, [isDirectorToolsOpen, setDirectorOutputPreview, setSelectedHistoryPreviewKey]);

  const handleClearCurrentDisplayedImage = useCallback(() => {
    if (!selectedPreviewResult)
      return;
    setSelectedHistoryPreviewKey(null);
    setSelectedResultIndex(-1);
    setDirectorSourcePreview(null);
    setDirectorOutputPreview(null);
    setIsPreviewImageModalOpen(false);
  }, [
    selectedPreviewResult,
    setDirectorOutputPreview,
    setDirectorSourcePreview,
    setIsPreviewImageModalOpen,
    setSelectedHistoryPreviewKey,
    setSelectedResultIndex,
  ]);

  const createDirectorSourceClone = useCallback((image: GeneratedImageItem) => {
    return {
      ...image,
      batchId: makeStableId(),
      batchIndex: 0,
      batchSize: 1,
    } satisfies GeneratedImageItem;
  }, []);

  const addDirectorImageToSourceRail = useCallback((image: GeneratedImageItem | null) => {
    if (!image)
      return false;
    const clone = createDirectorSourceClone(image);
    setDirectorSourceItems(prev => [clone, ...prev]);
    setDirectorSourcePreview(clone);
    setDirectorOutputPreview(null);
    return clone;
  }, [createDirectorSourceClone, setDirectorOutputPreview, setDirectorSourceItems, setDirectorSourcePreview]);

  const copyGeneratedImageToClipboard = useCallback(async (image: GeneratedImageItem | null, successMessage: string) => {
    if (!image)
      return;
    if (typeof navigator === "undefined" || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      showErrorToast("Clipboard image copy is not supported in this environment.");
      return;
    }

    try {
      const file = fileFromDataUrl(
        image.dataUrl,
        `nai_preview.${extensionFromDataUrl(image.dataUrl)}`,
      );
      await navigator.clipboard.write([
        new ClipboardItem({
          [file.type || "image/png"]: file,
        }),
      ]);
      showSuccessToast(successMessage);
    }
    catch {
      showErrorToast("Failed to copy image. Please try again.");
    }
  }, [showErrorToast, showSuccessToast]);

  const downloadGeneratedImage = useCallback((image: GeneratedImageItem | null, filePrefix: string) => {
    if (!image)
      return;
    triggerBrowserDownload(
      image.dataUrl,
      `${filePrefix}_${image.seed}_${image.batchIndex + 1}.${extensionFromDataUrl(image.dataUrl)}`,
    );
  }, []);

  const handleRunDirectorInputUpscale = useCallback(async () => {
    if (!directorInputPreview)
      return;
    showErrorToast("Upscale is disabled.");
  }, [directorInputPreview, showErrorToast]);

  const handleAddDirectorDisplayedToSourceRail = useCallback(() => {
    const clone = addDirectorImageToSourceRail(directorOutputPreview ?? selectedPreviewResult);
    if (!clone)
      return;
    showSuccessToast("Added the current right-side image to the source rail.");
  }, [addDirectorImageToSourceRail, directorOutputPreview, selectedPreviewResult, showSuccessToast]);

  const handleCopyDirectorInputImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(directorInputPreview, "Copied the current left image.");
  }, [copyGeneratedImageToClipboard, directorInputPreview]);

  const handleCopyDirectorOutputImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(directorOutputPreview ?? selectedPreviewResult, "Copied the current right image.");
  }, [copyGeneratedImageToClipboard, directorOutputPreview, selectedPreviewResult]);

  const handleDownloadDirectorOutputImage = useCallback(() => {
    downloadGeneratedImage(directorOutputPreview ?? selectedPreviewResult, "nai_director");
  }, [directorOutputPreview, downloadGeneratedImage, selectedPreviewResult]);

  const handleClearPinnedPreview = useCallback(() => {
    clearPinnedPreviewAction({
      pinnedPreviewKey,
      setPinnedPreviewKey,
      showSuccessToast,
    });
  }, [pinnedPreviewKey, setPinnedPreviewKey, showSuccessToast]);

  const handleSelectPinnedPreview = useCallback(() => {
    selectPinnedPreviewAction({
      pinnedPreviewKey,
      results,
      generatedItemKey,
      handleSelectCurrentResult,
      historyRowByKey,
      handlePreviewHistoryRow,
    });
  }, [handlePreviewHistoryRow, handleSelectCurrentResult, historyRowByKey, pinnedPreviewKey, results]);

  const handleApplyPinnedPreviewSeed = useCallback(() => {
    applyPinnedPreviewSeedAction({
      pinnedPreviewResult,
      uiMode,
      setSimpleSeed,
      setProSeed,
      showSuccessToast,
    });
  }, [pinnedPreviewResult, setProSeed, setSimpleSeed, showSuccessToast, uiMode]);

  const handleOpenPreviewImage = useCallback(() => {
    openPreviewImageAction({
      selectedPreviewResult,
      setIsPreviewImageModalOpen,
    });
  }, [selectedPreviewResult, setIsPreviewImageModalOpen]);

  const handleTogglePinnedPreview = useCallback(() => {
    togglePinnedPreviewAction({
      selectedPreviewResult,
      selectedPreviewIdentityKey,
      pinnedPreviewKey,
      setPinnedPreviewKey,
      showSuccessToast,
    });
  }, [pinnedPreviewKey, selectedPreviewIdentityKey, selectedPreviewResult, setPinnedPreviewKey, showSuccessToast]);

  const handleApplySelectedPreviewSeed = useCallback(() => {
    applySelectedPreviewSeedAction({
      selectedPreviewResult,
      uiMode,
      setSimpleSeed,
      setProSeed,
      showSuccessToast,
    });
  }, [selectedPreviewResult, setProSeed, setSimpleSeed, showSuccessToast, uiMode]);

  const handleCopySelectedPreviewImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(selectedPreviewResult, "Copied the current image.");
  }, [copyGeneratedImageToClipboard, selectedPreviewResult]);

  const handleDownloadCurrent = useCallback(() => {
    downloadCurrentAction({
      selectedPreviewResult,
      downloadGeneratedImage,
    });
  }, [downloadGeneratedImage, selectedPreviewResult]);

  const handleDownloadAll = useCallback(() => {
    if (!history.length)
      return;
    const archiveEntries = history.reduce<Record<string, Uint8Array>>((acc, row, index) => {
      const entryName = `nai_${row.seed}_${(row.batchIndex ?? 0) + 1}_${row.id ?? row.createdAt ?? index + 1}.${extensionFromDataUrl(row.dataUrl)}`;
      acc[entryName] = base64ToBytes(dataUrlToBase64(row.dataUrl));
      return acc;
    }, {});
    const archive = zipSync(archiveEntries);
    triggerBlobDownload(new Blob([archive], { type: "application/zip" }), `nai_history_${Date.now()}.zip`);
  }, [history]);

  return {
    handleSelectCurrentResult,
    handlePreviewHistoryRow,
    handleClearCurrentDisplayedImage,
    handleRunDirectorInputUpscale,
    handleAddDirectorDisplayedToSourceRail,
    handleCopyDirectorInputImage,
    handleCopyDirectorOutputImage,
    handleDownloadDirectorOutputImage,
    handleClearPinnedPreview,
    handleSelectPinnedPreview,
    handleApplyPinnedPreviewSeed,
    handleOpenPreviewImage,
    handleTogglePinnedPreview,
    handleApplySelectedPreviewSeed,
    handleCopySelectedPreviewImage,
    handleDownloadCurrent,
    handleDownloadAll,
  };
}
