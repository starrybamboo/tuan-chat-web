import type { Dispatch, SetStateAction } from "react";

import { useCallback } from "react";

import type {
  ActivePreviewAction,
  DirectorToolId,
  DirectorToolOption,
  GeneratedImageItem,
  NovelAiEmotion,
  PreciseReferenceRow,
  UiMode,
  V4CharEditorRow,
  VibeTransferReferenceRow,
} from "@/components/aiImage/types";
import type { AiImageHistoryMode, AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

import {
  buildGenerateContext,
  buildHistoryRowsFromGenerateResult,
  finalizeGenerateResult,
  resolveFocusedGenerateContext,
  validateGenerateContext,
} from "@/components/aiImage/controller/generateActions";
import { generatedItemKey, getNovelAiFreeOnlyMessage, resolveInpaintModel } from "@/components/aiImage/helpers";
import { isDirectorToolDisabled } from "@/components/aiImage/constants";
import { runDirectorToolAction } from "@/components/aiImage/controller/directorActions";

type GenerateNovelImageViaProxy = typeof import("@/components/aiImage/api").generateNovelImageViaProxy;
type AugmentNovelImageViaProxy = typeof import("@/components/aiImage/api").augmentNovelImageViaProxy;
type AddAiImageHistoryBatch = typeof import("@/utils/aiImageHistoryDb").addAiImageHistoryBatch;

interface UseAiImageGenerationActionsOptions {
  uiMode: UiMode;
  mode: AiImageHistoryMode;
  model: string;
  isNAI4: boolean;
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
  dynamicThresholding: boolean;
  smea: boolean;
  smeaDyn: boolean;
  currentImg2imgStrength: number;
  currentImg2imgNoise: number;
  currentInfillStrength: number;
  currentInfillNoise: number;
  sourceImageBase64: string;
  sourceImageDataUrl: string;
  sourceImageSize: { width: number; height: number } | null;
  v4Chars: V4CharEditorRow[];
  v4UseCoords: boolean;
  v4UseOrder: boolean;
  normalizeReferenceStrengths: boolean;
  vibeTransferReferences: VibeTransferReferenceRow[];
  preciseReference: PreciseReferenceRow | null;
  activeStyleTags: string[];
  activeStyleNegativeTags: string[];
  directorInputPreview: GeneratedImageItem | null;
  directorTool: DirectorToolOption;
  activeDirectorTool: DirectorToolId;
  directorColorizePrompt: string;
  directorEmotionExtraPrompt: string;
  directorColorizeDefry: number;
  directorEmotionDefry: number;
  directorEmotion: NovelAiEmotion;
  historyRowByResultMatchKey: Map<string, AiImageHistoryRow>;
  readImageSize: (dataUrl: string) => Promise<{ width: number; height: number }>;
  resolveInfillMaskBase64ForUi: (targetUiMode: UiMode) => string;
  resolveSeparatedInfillMaskBase64ForUi: (targetUiMode: UiMode) => Promise<string>;
  resolveBlendInfillMaskDataUrlForUi: (targetUiMode: UiMode) => Promise<string>;
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
}

export function useAiImageGenerationActions({
  uiMode,
  mode,
  model,
  isNAI4,
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
  dynamicThresholding,
  smea,
  smeaDyn,
  currentImg2imgStrength,
  currentImg2imgNoise,
  currentInfillStrength,
  currentInfillNoise,
  sourceImageBase64,
  sourceImageDataUrl,
  sourceImageSize,
  v4Chars,
  v4UseCoords,
  v4UseOrder,
  normalizeReferenceStrengths,
  vibeTransferReferences,
  preciseReference,
  activeStyleTags,
  activeStyleNegativeTags,
  directorInputPreview,
  directorTool,
  activeDirectorTool,
  directorColorizePrompt,
  directorEmotionExtraPrompt,
  directorColorizeDefry,
  directorEmotionDefry,
  directorEmotion,
  historyRowByResultMatchKey,
  readImageSize,
  resolveInfillMaskBase64ForUi,
  resolveSeparatedInfillMaskBase64ForUi,
  resolveBlendInfillMaskDataUrlForUi,
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
    if (isDirectorToolsOpen || !selectedPreviewResult)
      return;

    const previewKey = generatedItemKey(selectedPreviewResult);
    setDirectorSourceItems((currentItems) => {
      if (currentItems.some(item => generatedItemKey(item) === previewKey))
        return currentItems;
      return [selectedPreviewResult, ...currentItems];
    });
    setDirectorSourcePreview(selectedPreviewResult);
    setDirectorOutputPreview(selectedPreviewResult);
  }, [
    isDirectorToolsOpen,
    selectedPreviewResult,
    setDirectorOutputPreview,
    setDirectorSourceItems,
    setDirectorSourcePreview,
  ]);

  const handleRunUpscale = useCallback(() => {
    if (!selectedPreviewResult)
      return;
    showErrorToast(getNovelAiFreeOnlyMessage("放大功能暂不可用。"));
  }, [selectedPreviewResult, showErrorToast]);

  const handleRunDirectorTool = useCallback(async () => {
    await runDirectorToolAction({
      directorInputPreview,
      directorTool,
      activeDirectorTool,
      isDirectorToolDisabled,
      showErrorToast,
      setError,
      setPendingPreviewAction,
      setDirectorOutputPreview,
      augmentNovelImageViaProxy,
      directorColorizePrompt,
      directorEmotionExtraPrompt,
      directorColorizeDefry,
      directorEmotionDefry,
      directorEmotion,
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
    directorEmotion,
    directorEmotionDefry,
    directorEmotionExtraPrompt,
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
    mode?: AiImageHistoryMode;
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
      strength: args?.strength ?? (targetMode === "infill" ? currentInfillStrength : currentImg2imgStrength),
      noise: args?.noise ?? (targetMode === "infill" ? currentInfillNoise : currentImg2imgNoise),
      sourceImageBase64: args?.sourceImageBase64 ?? sourceImageBase64,
      sourceImageDataUrl: args?.sourceImageDataUrl ?? sourceImageDataUrl,
      sourceImageWidth: args?.sourceImageWidth ?? sourceImageSize?.width,
      sourceImageHeight: args?.sourceImageHeight ?? sourceImageSize?.height,
      maskBase64: args?.maskBase64 ?? (targetMode === "infill" ? resolveInfillMaskBase64ForUi(uiMode) : undefined),
      isNAI4,
      v4Chars,
      v4UseCoords,
      v4UseOrder,
      normalizeReferenceStrengths,
      vibeTransferReferences,
      preciseReference,
    });

    setError("");
    setLoading(true);

    try {
      validateGenerateContext({ context, steps });

      const focusedContext = await resolveFocusedGenerateContext({
        context,
        maskBase64: args?.maskBase64,
        uiMode,
        resolveSeparatedInfillMaskBase64ForUi,
        resolveBlendInfillMaskDataUrlForUi,
      });

      if (context.effectiveMode === "infill" && typeof window !== "undefined" && window.electronAPI?.saveAiImageDebugBundle) {
        const requestBody = {
          mode: context.effectiveMode,
          model: resolveInpaintModel(model),
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
          focusedCropRect: focusedContext.focusedInpaint?.cropRect,
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
        vibeTransferReferences: context.vibeTransferPayload,
        preciseReference: context.preciseReferencePayload,
        model,
        width: focusedContext.requestWidth,
        height: focusedContext.requestHeight,
        imageCount: context.effectiveImageCount,
        steps,
        scale,
        sampler,
        noiseSchedule,
        cfgRescale,
        ucPreset,
        smea,
        smeaDyn,
        qualityToggle,
        dynamicThresholding,
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
        dynamicThresholding,
        smea,
        smeaDyn,
        preciseReference,
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
    currentImg2imgNoise,
    currentImg2imgStrength,
    currentInfillNoise,
    currentInfillStrength,
    dynamicThresholding,
    generateNovelImageViaProxy,
    height,
    isNAI4,
    mode,
    model,
    negativePrompt,
    noiseSchedule,
    normalizeReferenceStrengths,
    preciseReference,
    proInfillNegativePrompt,
    proInfillPrompt,
    prompt,
    qualityToggle,
    refreshHistory,
    resolveBlendInfillMaskDataUrlForUi,
    resolveInfillMaskBase64ForUi,
    resolveSeparatedInfillMaskBase64ForUi,
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
    smea,
    smeaDyn,
    sourceImageBase64,
    sourceImageDataUrl,
    sourceImageSize,
    steps,
    ucPreset,
    uiMode,
    v4Chars,
    v4UseCoords,
    v4UseOrder,
    vibeTransferReferences,
    width,
    sampler,
  ]);

  return {
    handleToggleDirectorTools,
    handleRunUpscale,
    handleRunDirectorTool,
    runGenerate,
  };
}
