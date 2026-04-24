import { useCallback } from "react";

import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";
import type { GeneratedImageItem, PreciseReferenceRow, UiMode, V4CharEditorRow, VibeTransferReferenceRow } from "@/components/aiImage/types";

import { buildGenerateContext, buildHistoryRowsFromGenerateResult, finalizeGenerateResult, resolveFocusedGenerateContext, validateGenerateContext } from "@/components/aiImage/controller/generateActions";
import { generatedItemKey, getNovelAiFreeOnlyMessage, resolveInpaintModel } from "@/components/aiImage/helpers";
import { isDirectorToolDisabled } from "@/components/aiImage/constants";
import { runDirectorToolAction } from "@/components/aiImage/controller/directorActions";

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
  directorTool: any;
  activeDirectorTool: any;
  directorColorizePrompt: string;
  directorEmotionExtraPrompt: string;
  directorColorizeDefry: number;
  directorEmotionDefry: number;
  directorEmotion: any;
  historyRowByResultMatchKey: Map<string, any>;
  readImageSize: (dataUrl: string) => Promise<{ width: number; height: number }>;
  resolveInfillMaskBase64ForUi: (targetUiMode: UiMode) => string;
  resolveSeparatedInfillMaskBase64ForUi: (targetUiMode: UiMode) => Promise<string>;
  resolveBlendInfillMaskDataUrlForUi: (targetUiMode: UiMode) => Promise<string>;
  setError: (value: string) => void;
  setLoading: (value: boolean) => void;
  setPendingPreviewAction: (value: any) => void;
  setDirectorOutputPreview: (value: any) => void;
  setResults: (value: any) => void;
  setSelectedResultIndex: (value: number) => void;
  setSelectedHistoryPreviewKey: (value: string | null) => void;
  setSimpleSeed: (value: number) => void;
  setProSeed: (value: number) => void;
  setDirectorSourceItems: (value: any) => void;
  setDirectorSourcePreview: (value: any) => void;
  refreshHistory: () => Promise<void>;
  showErrorToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
  generateNovelImageViaProxy: (args: any) => Promise<any>;
  augmentNovelImageViaProxy: (args: any) => Promise<any>;
  addAiImageHistoryBatch: (rows: any[]) => Promise<void>;
}

export function useAiImageGenerationActions(options: UseAiImageGenerationActionsOptions) {
  const handleToggleDirectorTools = useCallback(() => {
    if (!options.isDirectorToolsOpen && options.selectedPreviewResult) {
      const previewKey = generatedItemKey(options.selectedPreviewResult);
      options.setDirectorSourceItems((currentItems: GeneratedImageItem[]) => {
        if (currentItems.some(item => generatedItemKey(item) === previewKey))
          return currentItems;
        return [options.selectedPreviewResult as GeneratedImageItem, ...currentItems];
      });
      options.setDirectorSourcePreview(options.selectedPreviewResult);
      options.setDirectorOutputPreview(options.selectedPreviewResult);
    }
  }, [options]);

  const handleRunUpscale = useCallback(async () => {
    if (!options.selectedPreviewResult)
      return;
    options.showErrorToast(getNovelAiFreeOnlyMessage("Upscale is disabled."));
  }, [options]);

  const handleRunDirectorTool = useCallback(async () => {
    await runDirectorToolAction({
      directorInputPreview: options.directorInputPreview,
      directorTool: options.directorTool,
      activeDirectorTool: options.activeDirectorTool,
      isDirectorToolDisabled,
      showErrorToast: options.showErrorToast,
      setError: options.setError,
      setPendingPreviewAction: options.setPendingPreviewAction,
      setDirectorOutputPreview: options.setDirectorOutputPreview,
      augmentNovelImageViaProxy: options.augmentNovelImageViaProxy,
      directorColorizePrompt: options.directorColorizePrompt,
      directorEmotionExtraPrompt: options.directorEmotionExtraPrompt,
      directorColorizeDefry: options.directorColorizeDefry,
      directorEmotionDefry: options.directorEmotionDefry,
      directorEmotion: options.directorEmotion,
      readImageSize: options.readImageSize,
      model: options.model,
      historyRowByResultMatchKey: options.historyRowByResultMatchKey,
      setResults: options.setResults,
      setSelectedResultIndex: options.setSelectedResultIndex,
      setSelectedHistoryPreviewKey: options.setSelectedHistoryPreviewKey,
      addAiImageHistoryBatch: options.addAiImageHistoryBatch,
      refreshHistory: options.refreshHistory,
      showSuccessToast: options.showSuccessToast,
    });
  }, [options]);

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
    const context = buildGenerateContext({
      mode: args?.mode,
      currentMode: options.mode,
      uiMode: options.uiMode,
      simpleInfillPrompt: options.simpleInfillPrompt,
      proInfillPrompt: options.proInfillPrompt,
      simpleInfillNegativePrompt: options.simpleInfillNegativePrompt,
      proInfillNegativePrompt: options.proInfillNegativePrompt,
      prompt: args?.prompt,
      negativePrompt: args?.negativePrompt,
      simplePrompt: options.simplePrompt,
      promptText: options.prompt,
      simpleNegativePrompt: options.simpleNegativePrompt,
      negativePromptText: options.negativePrompt,
      activeStyleTags: options.activeStyleTags,
      activeStyleNegativeTags: options.activeStyleNegativeTags,
      width: args?.width ?? options.width,
      height: args?.height ?? options.height,
      strength: args?.strength ?? ((args?.mode ?? options.mode) === "infill" ? options.currentInfillStrength : options.currentImg2imgStrength),
      noise: args?.noise ?? ((args?.mode ?? options.mode) === "infill" ? options.currentInfillNoise : options.currentImg2imgNoise),
      sourceImageBase64: args?.sourceImageBase64 ?? options.sourceImageBase64,
      sourceImageDataUrl: args?.sourceImageDataUrl ?? options.sourceImageDataUrl,
      sourceImageWidth: args?.sourceImageWidth ?? options.sourceImageSize?.width,
      sourceImageHeight: args?.sourceImageHeight ?? options.sourceImageSize?.height,
      maskBase64: args?.maskBase64 ?? ((args?.mode ?? options.mode) === "infill" ? options.resolveInfillMaskBase64ForUi(options.uiMode) : undefined),
      isNAI4: options.isNAI4,
      v4Chars: options.v4Chars,
      v4UseCoords: options.v4UseCoords,
      v4UseOrder: options.v4UseOrder,
      normalizeReferenceStrengths: options.normalizeReferenceStrengths,
      vibeTransferReferences: options.vibeTransferReferences,
      preciseReference: options.preciseReference,
    });

    options.setError("");
    options.setLoading(true);
    try {
      validateGenerateContext({ context, steps: options.steps });

      const focusedContext = await resolveFocusedGenerateContext({
        context,
        maskBase64: args?.maskBase64,
        uiMode: options.uiMode,
        resolveSeparatedInfillMaskBase64ForUi: options.resolveSeparatedInfillMaskBase64ForUi,
        resolveBlendInfillMaskDataUrlForUi: options.resolveBlendInfillMaskDataUrlForUi,
      });

      if (context.effectiveMode === "infill" && typeof window !== "undefined" && window.electronAPI?.saveAiImageDebugBundle) {
        const requestBody = {
          mode: context.effectiveMode,
          model: resolveInpaintModel(options.model),
          width: focusedContext.requestWidth,
          height: focusedContext.requestHeight,
          strength: context.effectiveStrength,
          noise: context.effectiveNoise,
          prompt: context.effectivePrompt,
          negativePrompt: context.effectiveNegative,
          sampler: options.sampler,
          noiseSchedule: options.noiseSchedule,
          cfgRescale: options.cfgRescale,
          ucPreset: options.ucPreset,
          qualityToggle: options.qualityToggle,
          dynamicThresholding: options.dynamicThresholding,
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

      const seedInput = Number(options.seed);
      const seedValue = Number.isFinite(seedInput) && seedInput >= 0 ? Math.floor(seedInput) : undefined;
      const response = await options.generateNovelImageViaProxy({
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
        model: options.model,
        width: focusedContext.requestWidth,
        height: focusedContext.requestHeight,
        imageCount: context.effectiveImageCount,
        steps: options.steps,
        scale: options.scale,
        sampler: options.sampler,
        noiseSchedule: options.noiseSchedule,
        cfgRescale: options.cfgRescale,
        ucPreset: options.ucPreset,
        smea: options.smea,
        smeaDyn: options.smeaDyn,
        qualityToggle: options.qualityToggle,
        dynamicThresholding: options.dynamicThresholding,
        seed: seedValue,
      });

      const finalized = await finalizeGenerateResult({
        context,
        focusedContext,
        response,
        toolLabel: args?.toolLabel,
        setResults: options.setResults,
        setSelectedResultIndex: options.setSelectedResultIndex,
        setSelectedHistoryPreviewKey: options.setSelectedHistoryPreviewKey,
        uiMode: options.uiMode,
        seedValue,
        setSimpleSeed: options.setSimpleSeed,
        setProSeed: options.setProSeed,
      });

      await options.addAiImageHistoryBatch(buildHistoryRowsFromGenerateResult({
        generatedItems: finalized.generatedItems,
        context,
        response,
        resultWidth: finalized.resultWidth,
        resultHeight: finalized.resultHeight,
        steps: options.steps,
        scale: options.scale,
        sampler: options.sampler,
        noiseSchedule: options.noiseSchedule,
        cfgRescale: options.cfgRescale,
        ucPreset: options.ucPreset,
        qualityToggle: options.qualityToggle,
        dynamicThresholding: options.dynamicThresholding,
        smea: options.smea,
        smeaDyn: options.smeaDyn,
        preciseReference: options.preciseReference,
        toolLabel: args?.toolLabel,
        batchId: finalized.batchId,
      }));
      await options.refreshHistory();
      return true;
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (context.effectiveMode === "infill")
        options.setError(message);
      else
        options.showErrorToast(message);
      return false;
    }
    finally {
      options.setLoading(false);
    }
  }, [options]);

  return {
    handleToggleDirectorTools,
    handleRunUpscale,
    handleRunDirectorTool,
    runGenerate,
  };
}
