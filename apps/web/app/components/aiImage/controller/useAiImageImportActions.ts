import type { Dispatch, DragEvent as ReactDragEvent, SetStateAction } from "react";

import { useCallback, useEffect } from "react";

import type {
  GeneratedImageItem,
  ImageImportSource,
  ImportedSourceImagePayload,
  InternalHistoryImageDragPayload,
  MetadataImportSelectionState,
  PendingMetadataImportState,
  UiMode,
} from "@/components/aiImage/types";
import type { NovelAiImageMetadataResult } from "@/utils/media/novelaiImageMetadata";

import {
  pickDirectorSourceHistoryImageAction,
  pickDirectorSourceImagesAction,
} from "@/components/aiImage/controller/directorActions";
import {
  historyImageDragStartAction,
  pageImageDragEnterAction,
  pageImageDragLeaveAction,
  pageImageDragOverAction,
  pageImageDropAction,
  pasteSourceImageAction,
  pickSourceHistoryImageAction,
} from "@/components/aiImage/controller/dndActions";
import {
  importSourceFileAction,
  importSourceImageBytesAction,
} from "@/components/aiImage/controller/importActions";
import {
  buildImportedSourceImagePayloadFromDataUrl,
  extractImageFilesFromTransfer,
  extractInternalHistoryImageDragPayload,
  generatedItemKey,
  hasFileDrag,
  hasInternalHistoryImageDrag,
} from "@/components/aiImage/helpers";
import { clearAiImageHistory } from "@/utils/aiImageHistoryDb";

type Setter<T> = Dispatch<SetStateAction<T>>;

function formatImageImportError(prefix: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  return detail ? `${prefix}：${detail}` : prefix;
}

type UseAiImageImportActionsOptions = {
  uiMode: UiMode;
  model: string;
  isDirectorToolsOpen: boolean;
  isDirectorImageDragOver: boolean;
  isPageImageDragOver: boolean;
  pendingMetadataImport: PendingMetadataImportState | null;
  metadataImportSelection: MetadataImportSelectionState;
  selectedPreviewResult: GeneratedImageItem | null;
  setError: Setter<string>;
  setIsPageImageDragOver: Setter<boolean>;
  setPendingMetadataImport: Setter<PendingMetadataImportState | null>;
  setMetadataImportSelection: Setter<MetadataImportSelectionState>;
  openImportedImageInpaint: (sourceImage: ImportedSourceImagePayload) => void;
  setDirectorSourceItems: Setter<GeneratedImageItem[]>;
  setDirectorSourcePreview: Setter<GeneratedImageItem | null>;
  setDirectorOutputPreview: Setter<GeneratedImageItem | null>;
  setIsDirectorImageDragOver: Setter<boolean>;
  setSelectedHistoryPreviewKey: Setter<string | null>;
  showErrorToast: (message: string) => void;
  syncInpaintSourceForUi: (targetUiMode: UiMode, sourceImage: ImportedSourceImagePayload) => void;
  clearSourceImageForUi: (targetUiMode: UiMode) => void;
  refreshHistory: () => Promise<void>;
  applyImportedMetadata: (metadata: NovelAiImageMetadataResult, selection: MetadataImportSelectionState) => void;
  readImageSize: (dataUrl: string) => Promise<{ width: number; height: number }>;
  readImagePixels: (dataUrl: string) => Promise<{ width: number; height: number; data: Uint8ClampedArray }>;
  extractNovelAiMetadataFromPngBytes: (bytes: Uint8Array) => NovelAiImageMetadataResult | null;
  extractNovelAiMetadataFromStealthPixels: (pixels: { width: number; height: number; data: Uint8ClampedArray }) => NovelAiImageMetadataResult | null;
  defaultMetadataImportSelection: MetadataImportSelectionState;
};

export function useAiImageImportActions({
  uiMode,
  model,
  isDirectorToolsOpen,
  isDirectorImageDragOver,
  isPageImageDragOver,
  pendingMetadataImport,
  metadataImportSelection,
  selectedPreviewResult,
  setError,
  setIsPageImageDragOver,
  setPendingMetadataImport,
  setMetadataImportSelection,
  openImportedImageInpaint,
  setDirectorSourceItems,
  setDirectorSourcePreview,
  setDirectorOutputPreview,
  setIsDirectorImageDragOver,
  setSelectedHistoryPreviewKey,
  showErrorToast,
  syncInpaintSourceForUi,
  clearSourceImageForUi,
  refreshHistory,
  applyImportedMetadata,
  readImageSize,
  readImagePixels,
  extractNovelAiMetadataFromPngBytes,
  extractNovelAiMetadataFromStealthPixels,
  defaultMetadataImportSelection,
}: UseAiImageImportActionsOptions) {
  const handleImportSourceImageBytes = useCallback(async (args: {
    bytes: Uint8Array;
    mime: string;
    name: string;
    source?: ImageImportSource;
    imageCount?: number;
  }) => {
    if ((args.imageCount ?? 1) > 1) {
      showErrorToast("一次只能导入一张图片。");
      return;
    }
    await importSourceImageBytesAction({
      bytes: args.bytes,
      mime: args.mime,
      name: args.name,
      source: args.source,
      imageCount: args.imageCount,
      uiMode,
      setError,
      setIsPageImageDragOver,
      readImageSize,
      setPendingMetadataImport,
      defaultMetadataImportSelection,
      setMetadataImportSelection,
      extractNovelAiMetadataFromPngBytes,
      extractNovelAiMetadataFromStealthPixels,
      readImagePixels,
    });
  }, [
    defaultMetadataImportSelection,
    extractNovelAiMetadataFromPngBytes,
    extractNovelAiMetadataFromStealthPixels,
    readImagePixels,
    readImageSize,
    setError,
    setIsPageImageDragOver,
    setMetadataImportSelection,
    setPendingMetadataImport,
    showErrorToast,
    uiMode,
  ]);

  const handlePickSourceImage = useCallback(async (
    file: File,
    options?: { source?: ImageImportSource; imageCount?: number },
  ) => {
    try {
      await importSourceFileAction({
        file,
        options,
        importSourceImageBytes: handleImportSourceImageBytes,
      });
    }
    catch (error) {
      const message = formatImageImportError("导入图片失败", error);
      setError(message);
      showErrorToast(message);
    }
  }, [handleImportSourceImageBytes, setError, showErrorToast]);

  const handlePickDirectorSourceImages = useCallback(async (files: FileList | File[]) => {
    try {
      await pickDirectorSourceImagesAction({
        files,
        showErrorToast,
        model,
        readImageSize,
        setDirectorSourceItems,
        setDirectorSourcePreview,
        setDirectorOutputPreview,
      });
    }
    catch (error) {
      const message = formatImageImportError("导入 Director 图片失败", error);
      setError(message);
      showErrorToast(message);
    }
  }, [model, readImageSize, setDirectorOutputPreview, setDirectorSourceItems, setDirectorSourcePreview, setError, showErrorToast]);

  const handlePickDirectorSourceHistoryImage = useCallback(async (payload: InternalHistoryImageDragPayload) => {
    await pickDirectorSourceHistoryImageAction({
      payload,
      model,
      readImageSize,
      setDirectorSourceItems,
      setDirectorSourcePreview,
      setDirectorOutputPreview,
    });
  }, [model, readImageSize, setDirectorOutputPreview, setDirectorSourceItems, setDirectorSourcePreview]);

  const handlePickSourceHistoryImage = useCallback(async (
    payload: InternalHistoryImageDragPayload,
    options?: { source?: ImageImportSource; imageCount?: number },
  ) => {
    try {
      await pickSourceHistoryImageAction({
        payload,
        options,
        setIsPageImageDragOver,
        showErrorToast,
        handleImportSourceImageBytes,
      });
    }
    catch (error) {
      const message = formatImageImportError("导入历史图片失败", error);
      setError(message);
      showErrorToast(message);
    }
  }, [handleImportSourceImageBytes, setError, setIsPageImageDragOver, showErrorToast]);

  const handleHistoryImageDragStart = useCallback((
    event: ReactDragEvent<HTMLElement>,
    payload: { dataUrl: string; seed: number; batchIndex?: number },
  ) => {
    historyImageDragStartAction({
      event: event as unknown as DragEvent,
      payload,
    });
  }, []);

  const handlePageImageDragEnter = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    pageImageDragEnterAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      setIsPageImageDragOver,
    });
  }, [isDirectorToolsOpen, setIsPageImageDragOver]);

  const handlePageImageDragLeave = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    pageImageDragLeaveAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      setIsPageImageDragOver,
    });
  }, [isDirectorToolsOpen, setIsPageImageDragOver]);

  const handlePageImageDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    pageImageDragOverAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      isPageImageDragOver,
      setIsPageImageDragOver,
    });
  }, [isDirectorToolsOpen, isPageImageDragOver, setIsPageImageDragOver]);

  const handlePageImageDrop = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    void pageImageDropAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      setIsPageImageDragOver,
      showErrorToast,
      handlePickSourceHistoryImage,
      handlePickSourceImage,
    });
  }, [handlePickSourceHistoryImage, handlePickSourceImage, isDirectorToolsOpen, setIsPageImageDragOver, showErrorToast]);

  useEffect(() => {
    if (typeof document === "undefined")
      return;

    const onPaste = (event: ClipboardEvent) => {
      void pasteSourceImageAction({
        event,
        handlePickSourceImage,
      });
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handlePickSourceImage]);

  const handleClearSourceImage = useCallback(() => {
    clearSourceImageForUi(uiMode);
    setIsPageImageDragOver(false);
  }, [clearSourceImageForUi, setIsPageImageDragOver, uiMode]);

  const handleCloseMetadataImportDialog = useCallback(() => {
    setPendingMetadataImport(null);
    setMetadataImportSelection(defaultMetadataImportSelection);
  }, [defaultMetadataImportSelection, setMetadataImportSelection, setPendingMetadataImport]);

  const handleOpenImportedImageInpaint = useCallback(() => {
    if (!pendingMetadataImport)
      return;

    openImportedImageInpaint(pendingMetadataImport.sourceImage);

    setPendingMetadataImport(null);
    setMetadataImportSelection(defaultMetadataImportSelection);
  }, [defaultMetadataImportSelection, openImportedImageInpaint, pendingMetadataImport, setMetadataImportSelection, setPendingMetadataImport]);

  const handleConfirmMetadataImport = useCallback(() => {
    const pendingMetadata = pendingMetadataImport?.metadata;
    if (!pendingMetadata)
      return;

    const hasAnySelection = metadataImportSelection.prompt
      || metadataImportSelection.undesiredContent
      || metadataImportSelection.characters
      || metadataImportSelection.settings
      || metadataImportSelection.seed;
    if (!hasAnySelection)
      return;

    applyImportedMetadata(pendingMetadata, metadataImportSelection);
    setPendingMetadataImport(null);
    setMetadataImportSelection(defaultMetadataImportSelection);
  }, [applyImportedMetadata, defaultMetadataImportSelection, metadataImportSelection, pendingMetadataImport, setMetadataImportSelection, setPendingMetadataImport]);

  const handleClearHistory = useCallback(async () => {
    await clearAiImageHistory();
    setSelectedHistoryPreviewKey(null);
    await refreshHistory();
  }, [refreshHistory, setSelectedHistoryPreviewKey]);

  const syncSelectedPreviewToInpaintSource = useCallback(() => {
    if (!selectedPreviewResult)
      return false;

    const sourceImage = buildImportedSourceImagePayloadFromDataUrl({
      dataUrl: selectedPreviewResult.dataUrl,
      width: selectedPreviewResult.width,
      height: selectedPreviewResult.height,
    });
    if (!sourceImage) {
      showErrorToast("读取预览图作为 Inpaint 源图失败。");
      return false;
    }

    syncInpaintSourceForUi(uiMode, sourceImage);
    return true;
  }, [selectedPreviewResult, showErrorToast, syncInpaintSourceForUi, uiMode]);

  const handleSelectDirectorSourceItem = useCallback((item: GeneratedImageItem) => {
    setDirectorSourcePreview(item);
    setDirectorOutputPreview(null);
  }, [setDirectorOutputPreview, setDirectorSourcePreview]);

  const handleRemoveDirectorSourceItem = useCallback((item: GeneratedImageItem) => {
    const targetKey = generatedItemKey(item);
    setDirectorSourceItems((prev) => {
      const nextItems = prev.filter(entry => generatedItemKey(entry) !== targetKey);
      setDirectorSourcePreview((prevPreview) => {
        if (!prevPreview || generatedItemKey(prevPreview) !== targetKey)
          return prevPreview;
        return nextItems[0] ?? null;
      });
      return nextItems;
    });
  }, [setDirectorSourceItems, setDirectorSourcePreview]);

  const handleDirectorImageDragEnter = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    const nextIsImageDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!nextIsImageDrag)
      return;
    event.preventDefault();
    event.stopPropagation();
    setIsDirectorImageDragOver(true);
  }, [setIsDirectorImageDragOver]);

  const handleDirectorImageDragLeave = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setIsDirectorImageDragOver(false);
  }, [setIsDirectorImageDragOver]);

  const handleDirectorImageDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    const nextIsImageDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!nextIsImageDrag)
      return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (!isDirectorImageDragOver)
      setIsDirectorImageDragOver(true);
  }, [isDirectorImageDragOver, setIsDirectorImageDragOver]);

  const handleDirectorImageDrop = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    const hasImportableDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!hasImportableDrag)
      return;
    event.preventDefault();
    event.stopPropagation();

    const internalPayload = extractInternalHistoryImageDragPayload(event.dataTransfer);
    if (internalPayload) {
      setIsDirectorImageDragOver(false);
      void handlePickDirectorSourceHistoryImage(internalPayload);
      return;
    }

    const files = extractImageFilesFromTransfer(event.dataTransfer);
    if (!files.length) {
      setIsDirectorImageDragOver(false);
      showErrorToast("当前拖放仅支持图片文件。");
      return;
    }

    setIsDirectorImageDragOver(false);
    void handlePickDirectorSourceImages(files);
  }, [handlePickDirectorSourceHistoryImage, handlePickDirectorSourceImages, setIsDirectorImageDragOver, showErrorToast]);

  return {
    handlePickDirectorSourceImages,
    handleHistoryImageDragStart,
    handlePageImageDragEnter,
    handlePageImageDragLeave,
    handlePageImageDragOver,
    handlePageImageDrop,
    handleClearSourceImage,
    handleCloseMetadataImportDialog,
    handleOpenImportedImageInpaint,
    handleConfirmMetadataImport,
    handleClearHistory,
    syncSelectedPreviewToInpaintSource,
    handleSelectDirectorSourceItem,
    handleRemoveDirectorSourceItem,
    handleDirectorImageDragEnter,
    handleDirectorImageDragLeave,
    handleDirectorImageDragOver,
    handleDirectorImageDrop,
  };
}
