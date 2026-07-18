import type { Dispatch, SetStateAction } from "react";

import { useCallback } from "react";

import type {
  ActivePreviewAction,
  AiImageGenerationMode,
  DirectorToolId,
  DirectorToolOption,
  GeneratedImageItem,
  InpaintFocusRect,
  UiMode,
  V4CharEditorRow,
} from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

import { DEFAULT_IMAGE_MODEL, DEFAULT_PRO_IMAGE_SETTINGS } from "@/components/aiImage/constants";
import { runDirectorToolAction } from "@/components/aiImage/controller/directorActions";
import {
  buildGenerateContext,
  buildHistoryRowsFromGenerateResult,
  finalizeGenerateResult,
  resolveInpaintGenerateContext,
  validateGenerateContext,
} from "@/components/aiImage/controller/generateActions";
import { generatedItemKey, resolveInpaintModel } from "@/components/aiImage/helpers";

type GenerateNovelImageViaProxy = typeof import("@/components/aiImage/api").generateNovelImageViaProxy;
type AugmentNovelImageViaProxy = typeof import("@/components/aiImage/api").augmentNovelImageViaProxy;
type AddAiImageHistoryBatch = typeof import("@/utils/aiImageHistoryDb").addAiImageHistoryBatch;

type UseAiImageGenerationActionsOptions = {
  uiMode: UiMode;
  mode: AiImageGenerationMode;
  model: string;
  isDirectorToolsOpen: boolean;
  selectedPreviewResult: GeneratedImageItem | null;
  prompt: string;
  negativePrompt: string;
  simplePrompt: string;
  simpleNegativePrompt: string;
  simpleInfillPrompt: string;
  proInfillPrompt: string;
  simpleInfillNegativePrompt: string;
  proInfillNegativePrompt: string;
  infillAppendPrompt: string;
  width: number;
  height: number;
  seed: number;
  steps: number;
  scale: number;
  sampler: string;
  noiseSchedule: string;
  cfgRescale: number;
  ucPreset: number;
  qualityToggle: boolean;
  cfgDelay: boolean;
  dynamicThresholding: boolean;
  currentInfillStrength: number;
  currentInfillNoise: number;
  infillFocusedArea: InpaintFocusRect | null;
  overlayOriginalImage: boolean;
  sourceImageBase64: string;
  sourceImageDataUrl: string;
  sourceImageSize: { width: number; height: number } | null;
  infillMaskDataUrl: string;
  v4Chars: V4CharEditorRow[];
  v4UseCoords: boolean;
  v4UseOrder: boolean;
  activeStyleTags: string[];
  activeStyleNegativeTags: string[];
  directorInputPreview: GeneratedImageItem | null;
  directorTool: DirectorToolOption;
  activeDirectorTool: DirectorToolId;
  directorColorizePrompt: string;
  directorColorizeDefry: number;
  historyRowByResultMatchKey: Map<string, AiImageHistoryRow>;
  readImageSize: (dataUrl: string) => Promise<{ width: number; height: number }>;
  resolveInfillMaskBase64ForUi: (targetUiMode: UiMode) => string;
  setIsDirectorToolsOpen: Dispatch<SetStateAction<boolean>>;
  setError: (value: string) => void;
  setLoading: (value: boolean) => void;
  setPendingPreviewAction: Dispatch<SetStateAction<ActivePreviewAction>>;
  setDirectorOutputPreview: Dispatch<SetStateAction<GeneratedImageItem | null>>;
  setResults: Dispatch<SetStateAction<GeneratedImageItem[]>>;
  setSelectedResultIndex: Dispatch<SetStateAction<number>>;
  setSelectedHistoryPreviewKey: (value: string | null) => void;
  setSimpleSeed: (value: number) => void;
  setProSeed: (value: number) => void;
  setDirectorSourceItems: Dispatch<SetStateAction<GeneratedImageItem[]>>;
  setDirectorSourcePreview: Dispatch<SetStateAction<GeneratedImageItem | null>>;
  refreshHistory: () => Promise<void>;
  showErrorToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
  generateNovelImageViaProxy: GenerateNovelImageViaProxy;
  augmentNovelImageViaProxy: AugmentNovelImageViaProxy;
  addAiImageHistoryBatch: AddAiImageHistoryBatch;
};

export function useAiImageGenerationActions({
  uiMode,
  mode,
  model,
  isDirectorToolsOpen,
  selectedPreviewResult,
  prompt,
  negativePrompt,
  simplePrompt,
  simpleNegativePrompt,
  simpleInfillPrompt,
  proInfillPrompt,
  simpleInfillNegativePrompt,
  proInfillNegativePrompt,
  infillAppendPrompt,
  width,
  height,
  seed,
  steps,
  scale,
  sampler,
  noiseSchedule,
  cfgRescale,
  ucPreset,
  qualityToggle,
  cfgDelay,
  dynamicThresholding,
  currentInfillStrength,
  currentInfillNoise,
  infillFocusedArea,
  overlayOriginalImage,
  sourceImageBase64,
  sourceImageDataUrl,
  sourceImageSize,
  infillMaskDataUrl,
  v4Chars,
  v4UseCoords,
  v4UseOrder,
  activeStyleTags,
  activeStyleNegativeTags,
  directorInputPreview,
  directorTool,
  activeDirectorTool,
  directorColorizePrompt,
  directorColorizeDefry,
  historyRowByResultMatchKey,
  readImageSize,
  resolveInfillMaskBase64ForUi,
  setIsDirectorToolsOpen,
  setError,
  setLoading,
  setPendingPreviewAction,
  setDirectorOutputPreview,
  setResults,
  setSelectedResultIndex,
  setSelectedHistoryPreviewKey,
  setSimpleSeed,
  setProSeed,
  setDirectorSourceItems,
  setDirectorSourcePreview,
  refreshHistory,
  showErrorToast,
  showSuccessToast,
  generateNovelImageViaProxy,
  augmentNovelImageViaProxy,
  addAiImageHistoryBatch,
}: UseAiImageGenerationActionsOptions) {
  const handleToggleDirectorTools = useCallback(() => {
    if (isDirectorToolsOpen) {
      setIsDirectorToolsOpen(false);
      return;
    }
    if (!selectedPreviewResult)
      return;

    const previewKey = generatedItemKey(selectedPreviewResult);
    setDirectorSourceItems((currentItems) => {
      if (currentItems.some(item => generatedItemKey(item) === previewKey))
        return currentItems;
      return [selectedPreviewResult, ...currentItems];
    });
    setDirectorSourcePreview(selectedPreviewResult);
    setDirectorOutputPreview(selectedPreviewResult);
    setIsDirectorToolsOpen(true);
  }, [
    isDirectorToolsOpen,
    selectedPreviewResult,
    setDirectorOutputPreview,
    setDirectorSourceItems,
    setDirectorSourcePreview,
    setIsDirectorToolsOpen,
  ]);

  const handleRunDirectorTool = useCallback(async () => {
    await runDirectorToolAction({
      directorInputPreview,
      directorTool,
      activeDirectorTool,
      showErrorToast,
      setError,
      setPendingPreviewAction,
      setDirectorOutputPreview,
      augmentNovelImageViaProxy,
      directorColorizePrompt,
      directorColorizeDefry,
      readImageSize,
      model,
      historyRowByResultMatchKey,
      setResults,
      setSelectedResultIndex,
      setSelectedHistoryPreviewKey,
      addAiImageHistoryBatch,
      refreshHistory,
      showSuccessToast,
    });
  }, [
    activeDirectorTool,
    addAiImageHistoryBatch,
    augmentNovelImageViaProxy,
    directorColorizeDefry,
    directorColorizePrompt,
    directorInputPreview,
    directorTool,
    historyRowByResultMatchKey,
    model,
    readImageSize,
    refreshHistory,
    setDirectorOutputPreview,
    setError,
    setPendingPreviewAction,
    setResults,
    setSelectedHistoryPreviewKey,
    setSelectedResultIndex,
    showErrorToast,
    showSuccessToast,
  ]);

  const runGenerate = useCallback(async (args?: {
    prompt?: string;
    negativePrompt?: string;
    mode?: AiImageGenerationMode;
    sourceImageBase64?: string;
    sourceImageDataUrl?: string;
    sourceImageWidth?: number;
    sourceImageHeight?: number;
    maskBase64?: string;
    width?: number;
    height?: number;
    strength?: number;
    noise?: number;
    toolLabel?: string;
  }) => {
    const targetMode = args?.mode ?? mode;
    const context = buildGenerateContext({
      mode: args?.mode,
      currentMode: mode,
      uiMode,
      simpleInfillPrompt,
      proInfillPrompt,
      simpleInfillNegativePrompt,
      proInfillNegativePrompt,
      infillAppendPrompt,
      prompt: args?.prompt,
      negativePrompt: args?.negativePrompt,
      simplePrompt,
      promptText: prompt,
      simpleNegativePrompt,
      negativePromptText: negativePrompt,
      activeStyleTags,
      activeStyleNegativeTags,
      width: args?.width ?? width,
      height: args?.height ?? height,
      strength: args?.strength ?? (targetMode === "infill" ? currentInfillStrength : DEFAULT_PRO_IMAGE_SETTINGS.strength),
      noise: args?.noise ?? (targetMode === "infill" ? currentInfillNoise : DEFAULT_PRO_IMAGE_SETTINGS.noise),
      sourceImageBase64: args?.sourceImageBase64 ?? sourceImageBase64,
      sourceImageDataUrl: args?.sourceImageDataUrl ?? sourceImageDataUrl,
      sourceImageWidth: args?.sourceImageWidth ?? sourceImageSize?.width,
      sourceImageHeight: args?.sourceImageHeight ?? sourceImageSize?.height,
      maskBase64: args?.maskBase64 ?? (targetMode === "infill" ? resolveInfillMaskBase64ForUi(uiMode) : undefined),
      maskDataUrl: targetMode === "infill" ? infillMaskDataUrl : undefined,
      focusedArea: targetMode === "infill" ? infillFocusedArea : null,
      overlayOriginalImage: targetMode === "infill" ? overlayOriginalImage : false,
      v4Chars,
      v4UseCoords,
      v4UseOrder,
    });

    setError("");
    setLoading(true);

    try {
      const focusedContext = await resolveInpaintGenerateContext({
        context,
        maskBase64: args?.maskBase64,
      });
      validateGenerateContext({ context, inpaintContext: focusedContext, steps });

      if (context.effectiveMode === "infill" && typeof window !== "undefined" && window.electronAPI?.saveAiImageDebugBundle) {
        const requestBody = {
          mode: context.effectiveMode,
          model: resolveInpaintModel(DEFAULT_IMAGE_MODEL),
          width: focusedContext.requestWidth,
          height: focusedContext.requestHeight,
          strength: context.effectiveStrength,
          noise: context.effectiveNoise,
          prompt: context.effectivePrompt,
          negativePrompt: context.effectiveNegative,
          sampler,
          noiseSchedule,
          cfgRescale,
          ucPreset,
          qualityToggle,
          dynamicThresholding,
          sourceImageWidth: focusedContext.requestSourceImageWidth,
          sourceImageHeight: focusedContext.requestSourceImageHeight,
          focusedCropRect: focusedContext.preparedInpaint?.cropRect,
          overlayOriginalImage: context.effectiveOverlayOriginalImage,
        };
        void window.electronAPI.saveAiImageDebugBundle({
          category: "infill",
          sourceDataUrl: context.effectiveSourceImageDataUrl,
          requestMaskDataUrl: focusedContext.requestMaskDataUrl,
          requestBody,
        });
      }

      const seedInput = Number(seed);
      const seedValue = Number.isFinite(seedInput) && seedInput >= 0 ? Math.floor(seedInput) : undefined;
      const response = await generateNovelImageViaProxy({
        mode: context.effectiveMode,
        sourceImageBase64: focusedContext.requestSourceImageBase64,
        sourceImageWidth: focusedContext.requestSourceImageWidth,
        sourceImageHeight: focusedContext.requestSourceImageHeight,
        maskBase64: focusedContext.requestMaskPayloadBase64,
        strength: context.effectiveStrength,
        noise: context.effectiveNoise,
        prompt: context.effectivePrompt,
        negativePrompt: context.effectiveNegative,
        v4Chars: context.v4CharsPayload,
        v4UseCoords: context.v4UseCoordsPayload,
        v4UseOrder: context.v4UseOrderPayload,
        width: focusedContext.requestWidth,
        height: focusedContext.requestHeight,
        imageCount: context.effectiveImageCount,
        steps,
        scale,
        sampler,
        noiseSchedule,
        cfgRescale,
        ucPreset,
        qualityToggle,
        cfgDelay,
        dynamicThresholding,
        overlayOriginalImage: context.effectiveOverlayOriginalImage,
        seed: seedValue,
      });

      const finalized = await finalizeGenerateResult({
        context,
        focusedContext,
        response,
        toolLabel: args?.toolLabel,
        setResults,
        setSelectedResultIndex,
        setSelectedHistoryPreviewKey,
        uiMode,
        seedValue,
        setSimpleSeed,
        setProSeed,
      });

      const historyRows = buildHistoryRowsFromGenerateResult({
        generatedItems: finalized.generatedItems,
        context,
        response,
        resultWidth: finalized.resultWidth,
        resultHeight: finalized.resultHeight,
        steps,
        scale,
        sampler,
        noiseSchedule,
        cfgRescale,
        ucPreset,
        qualityToggle,
        cfgDelay,
        dynamicThresholding,
        toolLabel: args?.toolLabel,
        batchId: finalized.batchId,
      });

      await addAiImageHistoryBatch(historyRows);
      await refreshHistory();
      return true;
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (context.effectiveMode === "infill")
        setError(message);
      else
        showErrorToast(message);
      return false;
    }
    finally {
      setLoading(false);
    }
  }, [
    activeStyleNegativeTags,
    activeStyleTags,
    addAiImageHistoryBatch,
    cfgRescale,
    cfgDelay,
    currentInfillNoise,
    currentInfillStrength,
    infillFocusedArea,
    infillMaskDataUrl,
    dynamicThresholding,
    generateNovelImageViaProxy,
    height,
    infillAppendPrompt,
    mode,
    negativePrompt,
    noiseSchedule,
    overlayOriginalImage,
    proInfillNegativePrompt,
    proInfillPrompt,
    prompt,
    qualityToggle,
    refreshHistory,
    resolveInfillMaskBase64ForUi,
    scale,
    seed,
    setError,
    setLoading,
    setProSeed,
    setResults,
    setSelectedHistoryPreviewKey,
    setSelectedResultIndex,
    setSimpleSeed,
    showErrorToast,
    simpleInfillNegativePrompt,
    simpleInfillPrompt,
    simpleNegativePrompt,
    simplePrompt,
    sourceImageBase64,
    sourceImageDataUrl,
    sourceImageSize,
    steps,
    ucPreset,
    uiMode,
    v4Chars,
    v4UseCoords,
    v4UseOrder,
    width,
    sampler,
  ]);

  return {
    handleToggleDirectorTools,
    handleRunDirectorTool,
    runGenerate,
  };
}
