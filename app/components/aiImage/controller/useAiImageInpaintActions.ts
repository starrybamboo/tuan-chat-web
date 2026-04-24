import { useCallback } from "react";

import type { GeneratedImageItem, InpaintDialogSource, InpaintSubmitPayload, UiMode } from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";

import { buildOpenInpaintState } from "@/components/aiImage/controller/generateActions";
import { buildBaseImageInpaintStateAction, saveInpaintMaskAction } from "@/components/aiImage/controller/inpaintActions";
import { dataUrlToBase64, resolveSimpleGenerateMode } from "@/components/aiImage/helpers";

interface UseAiImageInpaintActionsOptions {
  uiMode: UiMode;
  loading: boolean;
  mode: AiImageHistoryMode;
  model: string;
  width: number;
  height: number;
  seed: number;
  sourceImageDataUrl: string;
  infillMaskDataUrl: string;
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
  applySelectedPreviewAsBaseImage: () => boolean;
  setError: (value: string) => void;
  setInpaintDialogSource: (value: InpaintDialogSource | null) => void;
  setSimpleInfillPrompt: (value: string) => void;
  setSimpleInfillNegativePrompt: (value: string) => void;
  setSimpleEditorMode: (value: "text" | "tags") => void;
  setSimplePromptTab: (value: "prompt" | "negative") => void;
  setSimpleInfillStrength: (value: number) => void;
  setSimpleInfillMaskDataUrl: (value: string) => void;
  setProInfillPrompt: (value: string) => void;
  setProInfillNegativePrompt: (value: string) => void;
  setProInfillStrength: (value: number) => void;
  setProInfillMaskDataUrl: (value: string) => void;
  clearInfillMaskForUi: (mode: UiMode) => void;
  setModeForUi: (mode: UiMode, nextMode: AiImageHistoryMode) => void;
  showErrorToast: (message: string) => void;
}

export function useAiImageInpaintActions({
  uiMode,
  loading,
  mode,
  model,
  width,
  height,
  seed,
  sourceImageDataUrl,
  infillMaskDataUrl,
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
  applySelectedPreviewAsBaseImage,
  setError,
  setInpaintDialogSource,
  setSimpleInfillPrompt,
  setSimpleInfillNegativePrompt,
  setSimpleEditorMode,
  setSimplePromptTab,
  setSimpleInfillStrength,
  setSimpleInfillMaskDataUrl,
  setProInfillPrompt,
  setProInfillNegativePrompt,
  setProInfillStrength,
  setProInfillMaskDataUrl,
  clearInfillMaskForUi,
  setModeForUi,
  showErrorToast,
}: UseAiImageInpaintActionsOptions) {
  const handleOpenInpaint = useCallback(() => {
    const preview = selectedPreviewResult;
    if (!preview)
      return;

    const shouldSyncBaseImage = sourceImageDataUrl !== preview.dataUrl;
    if (shouldSyncBaseImage && !applySelectedPreviewAsBaseImage())
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
      shouldSyncBaseImage,
      dataUrlToBase64,
      infillMaskDataUrl,
      uiMode,
      simpleInfillPrompt,
      proInfillPrompt,
      simpleInfillNegativePrompt,
      proInfillNegativePrompt,
      currentInfillStrength,
    }));
  }, [
    applySelectedPreviewAsBaseImage,
    currentInfillStrength,
    infillMaskDataUrl,
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

  const handleOpenBaseImageInpaint = useCallback(async () => {
    try {
      const nextState = await buildBaseImageInpaintStateAction({
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
    model,
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
      setProInfillPrompt,
      setProInfillNegativePrompt,
      setProInfillStrength,
      setProInfillMaskDataUrl,
      setError,
      setModeForUi,
      setInpaintDialogSource,
    });
  }, [
    inpaintDialogSource,
    setError,
    setInpaintDialogSource,
    setModeForUi,
    setProInfillMaskDataUrl,
    setProInfillNegativePrompt,
    setProInfillPrompt,
    setProInfillStrength,
    setSimpleEditorMode,
    setSimpleInfillMaskDataUrl,
    setSimpleInfillNegativePrompt,
    setSimpleInfillPrompt,
    setSimpleInfillStrength,
    setSimplePromptTab,
  ]);

  const handleReturnFromInfillSettings = useCallback(() => {
    setModeForUi(uiMode, sourceImageDataUrl ? "img2img" : "txt2img");
  }, [setModeForUi, sourceImageDataUrl, uiMode]);

  const handleClearInfillMask = useCallback(() => {
    clearInfillMaskForUi(uiMode);
    setModeForUi(uiMode, sourceImageDataUrl ? "img2img" : "txt2img");
  }, [clearInfillMaskForUi, setModeForUi, sourceImageDataUrl, uiMode]);

  return {
    handleOpenInpaint,
    handleOpenBaseImageInpaint,
    handleCloseInpaintDialog,
    handleSaveInpaintMask,
    handleReturnFromInfillSettings,
    handleClearInfillMask,
  };
}
