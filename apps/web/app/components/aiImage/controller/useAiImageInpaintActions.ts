import { useCallback } from "react";

import type { AiImageGenerationMode, GeneratedImageItem, ImportedSourceImagePayload, InpaintDialogSource, InpaintFocusRect, InpaintSubmitPayload, UiMode } from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

import { buildOpenInpaintState } from "@/components/aiImage/controller/generateActions";
import { buildInpaintSourceStateAction, saveInpaintMaskAction } from "@/components/aiImage/controller/inpaintActions";
import { dataUrlToBase64 } from "@/components/aiImage/helpers";

type UseAiImageInpaintActionsOptions = {
  uiMode: UiMode;
  loading: boolean;
  model: string;
  width: number;
  height: number;
  seed: number;
  sourceImageDataUrl: string;
  infillMaskDataUrl: string;
  infillFocusedArea: InpaintFocusRect | null;
  overlayOriginalImage: boolean;
  simpleInfillPrompt: string;
  proInfillPrompt: string;
  simpleInfillNegativePrompt: string;
  proInfillNegativePrompt: string;
  currentInfillStrength: number;
  selectedPreviewResult: GeneratedImageItem | null;
  selectedPreviewHistoryRow: AiImageHistoryRow | null;
  history: AiImageHistoryRow[];
  inpaintDialogSource: InpaintDialogSource | null;
  readImageSize: (dataUrl: string) => Promise<{ width: number; height: number }>;
  syncSelectedPreviewToInpaintSource: () => boolean;
  syncInpaintSourceForUi: (targetUiMode: UiMode, sourceImage: ImportedSourceImagePayload) => void;
  setError: (value: string) => void;
  setInpaintDialogSource: (value: InpaintDialogSource | null) => void;
  setSimpleInfillPrompt: (value: string) => void;
  setSimpleInfillNegativePrompt: (value: string) => void;
  setSimpleEditorMode: (value: "text" | "tags") => void;
  setSimplePromptTab: (value: "prompt" | "negative") => void;
  setSimpleInfillStrength: (value: number) => void;
  setSimpleInfillMaskDataUrl: (value: string) => void;
  setSimpleInfillFocusedArea: (value: InpaintFocusRect | null) => void;
  setSimpleOverlayOriginalImage: (value: boolean) => void;
  setProInfillPrompt: (value: string) => void;
  setProInfillNegativePrompt: (value: string) => void;
  setProInfillStrength: (value: number) => void;
  setProInfillMaskDataUrl: (value: string) => void;
  setProInfillFocusedArea: (value: InpaintFocusRect | null) => void;
  setProOverlayOriginalImage: (value: boolean) => void;
  clearInfillMaskForUi: (mode: UiMode) => void;
  setModeForUi: (mode: UiMode, nextMode: AiImageGenerationMode) => void;
  showErrorToast: (message: string) => void;
};

export function useAiImageInpaintActions({
  uiMode,
  loading,
  model,
  width,
  height,
  seed,
  sourceImageDataUrl,
  infillMaskDataUrl,
  infillFocusedArea,
  overlayOriginalImage,
  simpleInfillPrompt,
  proInfillPrompt,
  simpleInfillNegativePrompt,
  proInfillNegativePrompt,
  currentInfillStrength,
  selectedPreviewResult,
  selectedPreviewHistoryRow,
  history,
  inpaintDialogSource,
  readImageSize,
  syncSelectedPreviewToInpaintSource,
  syncInpaintSourceForUi,
  setError,
  setInpaintDialogSource,
  setSimpleInfillPrompt,
  setSimpleInfillNegativePrompt,
  setSimpleEditorMode,
  setSimplePromptTab,
  setSimpleInfillStrength,
  setSimpleInfillMaskDataUrl,
  setSimpleInfillFocusedArea,
  setSimpleOverlayOriginalImage,
  setProInfillPrompt,
  setProInfillNegativePrompt,
  setProInfillStrength,
  setProInfillMaskDataUrl,
  setProInfillFocusedArea,
  setProOverlayOriginalImage,
  clearInfillMaskForUi,
  setModeForUi,
  showErrorToast,
}: UseAiImageInpaintActionsOptions) {
  const handleOpenInpaint = useCallback(() => {
    const preview = selectedPreviewResult;
    if (!preview)
      return;

    const shouldSyncInpaintSource = sourceImageDataUrl !== preview.dataUrl;
    if (shouldSyncInpaintSource && !syncSelectedPreviewToInpaintSource())
      return;

    const sourceImageBase64 = dataUrlToBase64(preview.dataUrl);
    if (!sourceImageBase64) {
      showErrorToast("Failed to prepare preview image for Inpaint.");
      return;
    }

    setError("");
    setInpaintDialogSource(buildOpenInpaintState({
      selectedPreviewResult: preview,
      selectedPreviewHistoryRow,
      shouldSyncInpaintSource,
      dataUrlToBase64,
      infillMaskDataUrl,
      uiMode,
      simpleInfillPrompt,
      proInfillPrompt,
      simpleInfillNegativePrompt,
      proInfillNegativePrompt,
      currentInfillStrength,
      infillFocusedArea,
      overlayOriginalImage,
    }));
  }, [
    syncSelectedPreviewToInpaintSource,
    currentInfillStrength,
    infillMaskDataUrl,
    infillFocusedArea,
    overlayOriginalImage,
    proInfillNegativePrompt,
    proInfillPrompt,
    selectedPreviewHistoryRow,
    selectedPreviewResult,
    setError,
    setInpaintDialogSource,
    showErrorToast,
    simpleInfillNegativePrompt,
    simpleInfillPrompt,
    sourceImageDataUrl,
    uiMode,
  ]);

  const handleEditInpaintMask = useCallback(async () => {
    try {
      const nextState = await buildInpaintSourceStateAction({
        sourceImageDataUrl,
        readImageSize,
        history,
        uiMode,
        simpleInfillPrompt,
        proInfillPrompt,
        simpleInfillNegativePrompt,
        proInfillNegativePrompt,
        infillMaskDataUrl,
        width,
        height,
        seed,
        model,
        currentInfillStrength,
        infillFocusedArea,
        overlayOriginalImage,
      });
      if (!nextState)
        return;
      setError("");
      setInpaintDialogSource(nextState);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showErrorToast(message);
    }
  }, [
    currentInfillStrength,
    height,
    history,
    infillMaskDataUrl,
    infillFocusedArea,
    model,
    overlayOriginalImage,
    proInfillNegativePrompt,
    proInfillPrompt,
    readImageSize,
    seed,
    setError,
    setInpaintDialogSource,
    showErrorToast,
    simpleInfillNegativePrompt,
    simpleInfillPrompt,
    sourceImageDataUrl,
    uiMode,
    width,
  ]);

  const handleCloseInpaintDialog = useCallback(() => {
    if (loading)
      return;
    setError("");
    setInpaintDialogSource(null);
  }, [loading, setError, setInpaintDialogSource]);

  const handleSaveInpaintMask = useCallback((payload: InpaintSubmitPayload) => {
    saveInpaintMaskAction({
      inpaintDialogSource,
      payload,
      setSimpleInfillPrompt,
      setSimpleInfillNegativePrompt,
      setSimpleEditorMode,
      setSimplePromptTab,
      setSimpleInfillStrength,
      setSimpleInfillMaskDataUrl,
      setSimpleInfillFocusedArea,
      setSimpleOverlayOriginalImage,
      setProInfillPrompt,
      setProInfillNegativePrompt,
      setProInfillStrength,
      setProInfillMaskDataUrl,
      setProInfillFocusedArea,
      setProOverlayOriginalImage,
      setError,
      setModeForUi,
      setInpaintDialogSource,
      syncInpaintSourceForUi,
    });
  }, [
    inpaintDialogSource,
    setError,
    setInpaintDialogSource,
    setModeForUi,
    setProInfillMaskDataUrl,
    setProInfillFocusedArea,
    setProInfillNegativePrompt,
    setProInfillPrompt,
    setProInfillStrength,
    setProOverlayOriginalImage,
    setSimpleEditorMode,
    setSimpleInfillMaskDataUrl,
    setSimpleInfillFocusedArea,
    setSimpleInfillNegativePrompt,
    setSimpleInfillPrompt,
    setSimpleInfillStrength,
    setSimpleOverlayOriginalImage,
    setSimplePromptTab,
    syncInpaintSourceForUi,
  ]);

  const handleReturnFromInfillSettings = useCallback(() => {
    clearInfillMaskForUi(uiMode);
    setModeForUi(uiMode, "txt2img");
  }, [clearInfillMaskForUi, setModeForUi, uiMode]);

  return {
    handleOpenInpaint,
    handleEditInpaintMask,
    handleCloseInpaintDialog,
    handleSaveInpaintMask,
    handleReturnFromInfillSettings,
  };
}
