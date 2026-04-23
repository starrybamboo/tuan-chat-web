import type { Dispatch, DragEvent as ReactDragEvent, RefObject, SetStateAction } from "react";
import { useCallback, useEffect } from "react";

import type {
  GeneratedImageItem,
  ImageImportSource,
  ImportedSourceImagePayload,
  InternalHistoryImageDragPayload,
  MetadataImportSelectionState,
  PendingMetadataImportState,
  ProFeatureSectionKey,
  UiMode,
} from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import type { NovelAiImageMetadataResult } from "@/utils/novelaiImageMetadata";
import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";

import {
  importSourceFileAction,
  importSourceImageBytesAction,
} from "@/components/aiImage/controller/importActions";
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
  pickDirectorSourceHistoryImageAction,
  pickDirectorSourceImagesAction,
} from "@/components/aiImage/controller/directorActions";
import {
  buildImportedSourceImagePayloadFromDataUrl,
  extractImageFilesFromTransfer,
  extractInternalHistoryImageDragPayload,
  generatedItemKey,
  getNovelAiFreeOnlyMessage,
  hasFileDrag,
  hasInternalHistoryImageDrag,
} from "@/components/aiImage/helpers";
import { clearAiImageHistory } from "@/utils/aiImageHistoryDb";

type Setter<T> = Dispatch<SetStateAction<T>>;

interface UseAiImageImportActionsOptions {
  uiMode: UiMode;
  model: string;
  isDirectorToolsOpen: boolean;
  isDirectorImageDragOver: boolean;
  isPageImageDragOver: boolean;
  pendingMetadataImport: PendingMetadataImportState | null;
  metadataImportSelection: MetadataImportSelectionState;
  selectedPreviewResult: GeneratedImageItem | null;
  sourceFileInputRef: RefObject<HTMLInputElement | null>;
  setError: Setter<string>;
  setIsPageImageDragOver: Setter<boolean>;
  setPendingMetadataImport: Setter<PendingMetadataImportState | null>;
  setMetadataImportSelection: Setter<MetadataImportSelectionState>;
  setProFeatureSectionOpen: (section: ProFeatureSectionKey, open: boolean) => void;
  setDirectorSourceItems: Setter<GeneratedImageItem[]>;
  setDirectorSourcePreview: Setter<GeneratedImageItem | null>;
  setDirectorOutputPreview: Setter<GeneratedImageItem | null>;
  setIsDirectorImageDragOver: Setter<boolean>;
  setSelectedHistoryPreviewKey: Setter<string | null>;
  showErrorToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
  applySourceImageForUi: (targetUiMode: UiMode, sourceImage: ImportedSourceImagePayload, successMessage?: string) => void;
  clearSourceImageForUi: (targetUiMode: UiMode) => void;
  refreshHistory: () => Promise<void>;
  applyImportedMetadata: (metadata: NovelAiImageMetadataResult, selection: MetadataImportSelectionState) => void;
  readImageSize: (dataUrl: string) => Promise<{ width: number; height: number }>;
  readImagePixels: (dataUrl: string) => Promise<{ width: number; height: number; data: Uint8ClampedArray }>;
  extractNovelAiMetadataFromPngBytes: (bytes: Uint8Array) => NovelAiImageMetadataResult | null;
  extractNovelAiMetadataFromStealthPixels: (pixels: { width: number; height: number; data: Uint8ClampedArray }) => NovelAiImageMetadataResult | null;
  defaultMetadataImportSelection: MetadataImportSelectionState;
}

export function useAiImageImportActions({
  uiMode,
  model,
  isDirectorToolsOpen,
  isDirectorImageDragOver,
  isPageImageDragOver,
  pendingMetadataImport,
  metadataImportSelection,
  selectedPreviewResult,
  sourceFileInputRef,
  setError,
  setIsPageImageDragOver,
  setPendingMetadataImport,
  setMetadataImportSelection,
  setProFeatureSectionOpen,
  setDirectorSourceItems,
  setDirectorSourcePreview,
  setDirectorOutputPreview,
  setIsDirectorImageDragOver,
  setSelectedHistoryPreviewKey,
  showErrorToast,
  showSuccessToast,
  applySourceImageForUi,
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
    target?: "img2img";
  }) => {
    await importSourceImageBytesAction({
      bytes: args.bytes,
      mime: args.mime,
      name: args.name,
      source: args.source,
      imageCount: args.imageCount,
      target: args.target,
      uiMode,
      setError,
      setIsPageImageDragOver,
      readImageSize,
      applySourceImageForUi,
      setPendingMetadataImport,
      defaultMetadataImportSelection,
      setMetadataImportSelection,
      extractNovelAiMetadataFromPngBytes,
      extractNovelAiMetadataFromStealthPixels,
      readImagePixels,
    });
  }, [
    applySourceImageForUi,
    defaultMetadataImportSelection,
    extractNovelAiMetadataFromPngBytes,
    extractNovelAiMetadataFromStealthPixels,
    readImagePixels,
    readImageSize,
    setError,
    setIsPageImageDragOver,
    setMetadataImportSelection,
    setPendingMetadataImport,
    uiMode,
  ]);

  const handlePickSourceImage = useCallback(async (
    file: File,
    options?: { source?: ImageImportSource; imageCount?: number; target?: "img2img" },
  ) => {
    await importSourceFileAction({
      file,
      options,
      importSourceImageBytes: handleImportSourceImageBytes,
    });
  }, [handleImportSourceImageBytes]);

  const handlePickDirectorSourceImages = useCallback(async (files: FileList | File[]) => {
    await pickDirectorSourceImagesAction({
      files,
      showErrorToast,
      model,
      readImageSize,
      setDirectorSourceItems,
      setDirectorSourcePreview,
      setDirectorOutputPreview,
    });
  }, [model, readImageSize, setDirectorOutputPreview, setDirectorSourceItems, setDirectorSourcePreview, showErrorToast]);

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
    await pickSourceHistoryImageAction({
      payload,
      options,
      setIsPageImageDragOver,
      showErrorToast,
      handleImportSourceImageBytes,
    });
  }, [handleImportSourceImageBytes, setIsPageImageDragOver, showErrorToast]);

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
    if (uiMode === "pro")
      setProFeatureSectionOpen("baseImage", true);
  }, [clearSourceImageForUi, setIsPageImageDragOver, setProFeatureSectionOpen, uiMode]);

  const handleOpenSourceImagePicker = useCallback(() => {
    sourceFileInputRef.current?.click();
  }, [sourceFileInputRef]);

  const handleCloseMetadataImportDialog = useCallback(() => {
    setPendingMetadataImport(null);
    setMetadataImportSelection(defaultMetadataImportSelection);
  }, [defaultMetadataImportSelection, setMetadataImportSelection, setPendingMetadataImport]);

  const handleImportSourceImageTarget = useCallback((target: "img2img" | "vibe" | "precise") => {
    if (!pendingMetadataImport)
      return;

    if (target === "img2img")
      applySourceImageForUi(uiMode, pendingMetadataImport.sourceImage, "Base image applied.");

    setPendingMetadataImport(null);
    setMetadataImportSelection(defaultMetadataImportSelection);
  }, [applySourceImageForUi, defaultMetadataImportSelection, pendingMetadataImport, setMetadataImportSelection, setPendingMetadataImport, uiMode]);

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

  const handlePickVibeReferences = useCallback(async (files: FileList | File[]) => {
    void files;
    showErrorToast(getNovelAiFreeOnlyMessage("Vibe Transfer is disabled."));
    setProFeatureSectionOpen("vibeTransfer", true);
  }, [setProFeatureSectionOpen, showErrorToast]);

  const handlePickPreciseReference = useCallback(async (file: File) => {
    void file;
    showErrorToast(getNovelAiFreeOnlyMessage("Precise Reference is disabled."));
    setProFeatureSectionOpen("preciseReference", true);
  }, [setProFeatureSectionOpen, showErrorToast]);

  const handleClearHistory = useCallback(async () => {
    await clearAiImageHistory();
    setSelectedHistoryPreviewKey(null);
    await refreshHistory();
  }, [refreshHistory, setSelectedHistoryPreviewKey]);

  const applySelectedPreviewAsBaseImage = useCallback((showToast = false) => {
    if (!selectedPreviewResult)
      return false;

    const sourceImage = buildImportedSourceImagePayloadFromDataUrl({
      dataUrl: selectedPreviewResult.dataUrl,
      width: selectedPreviewResult.width,
      height: selectedPreviewResult.height,
    });
    if (!sourceImage) {
      showErrorToast("Failed to read preview image as base image.");
      return false;
    }

    applySourceImageForUi(uiMode, sourceImage);
    if (showToast)
      showSuccessToast("Preview applied as base image.");
    return true;
  }, [applySourceImageForUi, selectedPreviewResult, showErrorToast, showSuccessToast, uiMode]);

  const handleUseSelectedResultAsBaseImage = useCallback(() => {
    void applySelectedPreviewAsBaseImage(true);
  }, [applySelectedPreviewAsBaseImage]);

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
  }, [setDirectorSourceItems, setDirectorSourcePreview, setDirectorOutputPreview]);

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
      showErrorToast("Drag-and-drop currently supports image files only.");
      return;
    }

    setIsDirectorImageDragOver(false);
    void handlePickDirectorSourceImages(files);
  }, [handlePickDirectorSourceHistoryImage, handlePickDirectorSourceImages, setIsDirectorImageDragOver, showErrorToast]);

  const handleSyncDirectorSourceFromCurrentPreview = useCallback(() => {
    if (!selectedPreviewResult)
      return;
    setDirectorSourcePreview(selectedPreviewResult);
    setDirectorOutputPreview(null);
    showSuccessToast("Synced the current preview to the director input.");
  }, [selectedPreviewResult, setDirectorOutputPreview, setDirectorSourcePreview, showSuccessToast]);

  return {
    handleImportSourceImageBytes,
    handlePickSourceImage,
    handlePickDirectorSourceImages,
    handlePickDirectorSourceHistoryImage,
    handlePickSourceHistoryImage,
    handleHistoryImageDragStart,
    handlePageImageDragEnter,
    handlePageImageDragLeave,
    handlePageImageDragOver,
    handlePageImageDrop,
    handleClearSourceImage,
    handleOpenSourceImagePicker,
    handleCloseMetadataImportDialog,
    handleImportSourceImageTarget,
    handleConfirmMetadataImport,
    handlePickVibeReferences,
    handlePickPreciseReference,
    handleClearHistory,
    applySelectedPreviewAsBaseImage,
    handleUseSelectedResultAsBaseImage,
    handleSelectDirectorSourceItem,
    handleRemoveDirectorSourceItem,
    handleDirectorImageDragEnter,
    handleDirectorImageDragLeave,
    handleDirectorImageDragOver,
    handleDirectorImageDrop,
    handleSyncDirectorSourceFromCurrentPreview,
  };
}
