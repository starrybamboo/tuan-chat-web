import { useCallback, useEffect, useState } from "react";

import type { AiImageGenerationMode, ImportedSourceImagePayload, InpaintFocusRect, ResolutionSelection, UiMode } from "@/components/aiImage/types";
import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";

import {
  CUSTOM_RESOLUTION_ID,
  DEFAULT_INPAINT_NOISE,
  DEFAULT_INPAINT_STRENGTH,
  DEFAULT_OVERLAY_ORIGINAL_IMAGE,
  DEFAULT_PRO_IMAGE_SETTINGS,
  DEFAULT_SIMPLE_IMAGE_SETTINGS,
  NOISE_SCHEDULES_NAI4,
  RESOLUTION_PRESETS,
  SAMPLERS_NAI4,
} from "@/components/aiImage/constants";
import {
  clampRange,
  dataUrlToBase64,
  getClosestValidImageSize,
} from "@/components/aiImage/helpers";
type ReadImageSizeResult = {
  width: number;
  height: number;
};

type UseAiImageDimensionsStateOptions = {
  uiMode: UiMode;
  showSuccessToast: (message: string) => void;
  onSourceImageChange?: () => void;
};

export function useAiImageDimensionsState({
  uiMode,
  showSuccessToast,
  onSourceImageChange,
}: UseAiImageDimensionsStateOptions) {
  const [simpleMode, setSimpleMode] = useState<AiImageGenerationMode>("txt2img");
  const [proMode, setProMode] = useState<AiImageGenerationMode>("txt2img");
  const [simpleSourceImageDataUrl, setSimpleSourceImageDataUrl] = useState("");
  const [simpleSourceImageBase64, setSimpleSourceImageBase64] = useState("");
  const [simpleSourceImageSize, setSimpleSourceImageSize] = useState<ReadImageSizeResult | null>(null);
  const [proSourceImageDataUrl, setProSourceImageDataUrl] = useState("");
  const [proSourceImageBase64, setProSourceImageBase64] = useState("");
  const [proSourceImageSize, setProSourceImageSize] = useState<ReadImageSizeResult | null>(null);
  const [simpleInfillMaskDataUrl, setSimpleInfillMaskDataUrl] = useState("");
  const [proInfillMaskDataUrl, setProInfillMaskDataUrl] = useState("");
  const [simpleInfillFocusedArea, setSimpleInfillFocusedArea] = useState<InpaintFocusRect | null>(null);
  const [proInfillFocusedArea, setProInfillFocusedArea] = useState<InpaintFocusRect | null>(null);
  const [simpleOverlayOriginalImage, setSimpleOverlayOriginalImage] = useState(DEFAULT_OVERLAY_ORIGINAL_IMAGE);
  const [proOverlayOriginalImage, setProOverlayOriginalImage] = useState(DEFAULT_OVERLAY_ORIGINAL_IMAGE);

  const [simpleWidth, setSimpleWidth] = useState<number>(DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
  const [simpleHeight, setSimpleHeight] = useState<number>(DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
  const [simpleWidthInput, setSimpleWidthInput] = useState<string>(String(DEFAULT_SIMPLE_IMAGE_SETTINGS.width));
  const [simpleHeightInput, setSimpleHeightInput] = useState<string>(String(DEFAULT_SIMPLE_IMAGE_SETTINGS.height));
  const [simpleSeed, setSimpleSeed] = useState<number>(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);
  const [simpleResolutionSelection, setSimpleResolutionSelection] = useState<ResolutionSelection>(DEFAULT_SIMPLE_IMAGE_SETTINGS.simpleResolutionSelection);
  const [proWidth, setProWidth] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.width);
  const [proHeight, setProHeight] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.height);
  const [proWidthInput, setProWidthInput] = useState<string>(String(DEFAULT_PRO_IMAGE_SETTINGS.width));
  const [proHeightInput, setProHeightInput] = useState<string>(String(DEFAULT_PRO_IMAGE_SETTINGS.height));
  const [proResolutionSelection, setProResolutionSelection] = useState<ResolutionSelection>(DEFAULT_PRO_IMAGE_SETTINGS.simpleResolutionSelection);
  const [proSteps, setProSteps] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.steps);
  const [proScale, setProScale] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.scale);
  const [proSampler, setProSampler] = useState<string>(DEFAULT_PRO_IMAGE_SETTINGS.sampler);
  const [proNoiseSchedule, setProNoiseSchedule] = useState<string>(DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
  const [proCfgRescale, setProCfgRescale] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
  const [proUcPreset, setProUcPreset] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
  const [proQualityToggle, setProQualityToggle] = useState<boolean>(DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
  const [proCfgDelay, setProCfgDelay] = useState<boolean>(DEFAULT_PRO_IMAGE_SETTINGS.cfgDelay);
  const [proDynamicThresholding, setProDynamicThresholding] = useState<boolean>(DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
  const [proSeed, setProSeed] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.seed);
  const [simpleInfillStrength, setSimpleInfillStrength] = useState<number>(DEFAULT_INPAINT_STRENGTH);
  const [simpleInfillNoise, setSimpleInfillNoise] = useState<number>(DEFAULT_INPAINT_NOISE);
  const [proInfillStrength, setProInfillStrength] = useState<number>(DEFAULT_INPAINT_STRENGTH);
  const [proInfillNoise, setProInfillNoise] = useState<number>(DEFAULT_INPAINT_NOISE);

  const samplerOptions = SAMPLERS_NAI4;
  const noiseScheduleOptions = NOISE_SCHEDULES_NAI4;
  const mode = uiMode === "simple" ? simpleMode : proMode;
  const width = uiMode === "simple" ? simpleWidth : proWidth;
  const height = uiMode === "simple" ? simpleHeight : proHeight;
  const widthInput = uiMode === "simple" ? simpleWidthInput : proWidthInput;
  const heightInput = uiMode === "simple" ? simpleHeightInput : proHeightInput;
  const steps = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.steps : proSteps;
  const scale = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.scale : proScale;
  const sampler = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.sampler : proSampler;
  const noiseSchedule = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.noiseSchedule : proNoiseSchedule;
  const cfgRescale = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.cfgRescale : proCfgRescale;
  const ucPreset = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.ucPreset : proUcPreset;
  const qualityToggle = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.qualityToggle : proQualityToggle;
  const cfgDelay = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.cfgDelay : proCfgDelay;
  const dynamicThresholding = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.dynamicThresholding : proDynamicThresholding;
  const seed = uiMode === "simple" ? simpleSeed : proSeed;
  const sourceImageDataUrl = uiMode === "simple" ? simpleSourceImageDataUrl : proSourceImageDataUrl;
  const sourceImageBase64 = uiMode === "simple" ? simpleSourceImageBase64 : proSourceImageBase64;
  const sourceImageSize = uiMode === "simple" ? simpleSourceImageSize : proSourceImageSize;
  const infillMaskDataUrl = uiMode === "simple" ? simpleInfillMaskDataUrl : proInfillMaskDataUrl;
  const infillFocusedArea = uiMode === "simple" ? simpleInfillFocusedArea : proInfillFocusedArea;
  const overlayOriginalImage = uiMode === "simple" ? simpleOverlayOriginalImage : proOverlayOriginalImage;
  const currentInfillStrength = uiMode === "simple" ? simpleInfillStrength : proInfillStrength;
  const currentInfillNoise = uiMode === "simple" ? simpleInfillNoise : proInfillNoise;
  const strength = mode === "infill" ? currentInfillStrength : DEFAULT_PRO_IMAGE_SETTINGS.strength;
  const roundedRequestedSize = getClosestValidImageSize(width, height);
  const hasCompleteDimensionInputs = widthInput.trim().length > 0 && heightInput.trim().length > 0;
  const seedIsRandom = !Number.isFinite(seed) || seed < 0;

  const inferResolutionSelection = useCallback((nextWidth: number, nextHeight: number): ResolutionSelection => {
    return RESOLUTION_PRESETS.find(item => item.width === nextWidth && item.height === nextHeight)?.id ?? CUSTOM_RESOLUTION_ID;
  }, []);

  const clampCustomDimensionInput = useCallback((value: number | string, fallback: number) => {
    const numericValue = Math.floor(Number(value));
    if (!Number.isFinite(numericValue))
      return fallback;
    return Math.max(1, numericValue);
  }, []);

  const syncDimensionInputsForUi = useCallback((targetUiMode: UiMode, nextWidth: number, nextHeight: number) => {
    if (targetUiMode === "simple") {
      setSimpleWidthInput(String(nextWidth));
      setSimpleHeightInput(String(nextHeight));
      return;
    }
    setProWidthInput(String(nextWidth));
    setProHeightInput(String(nextHeight));
  }, []);

  const setModeForUi = useCallback((targetUiMode: UiMode, nextMode: AiImageGenerationMode) => {
    if (targetUiMode === "simple") {
      setSimpleMode(nextMode);
      return;
    }
    setProMode(nextMode);
  }, []);

  const clearInfillMaskForUi = useCallback((targetUiMode: UiMode) => {
    if (targetUiMode === "simple") {
      setSimpleInfillMaskDataUrl("");
      setSimpleInfillFocusedArea(null);
      setSimpleOverlayOriginalImage(DEFAULT_OVERLAY_ORIGINAL_IMAGE);
      return;
    }
    setProInfillMaskDataUrl("");
    setProInfillFocusedArea(null);
    setProOverlayOriginalImage(DEFAULT_OVERLAY_ORIGINAL_IMAGE);
  }, []);

  const syncSourceImageSizeForUi = useCallback((targetUiMode: UiMode, nextWidth?: number | null, nextHeight?: number | null) => {
    if (!nextWidth || !nextHeight)
      return;
    const normalizedSize = getClosestValidImageSize(nextWidth, nextHeight);
    if (targetUiMode === "simple") {
      setSimpleWidth(normalizedSize.width);
      setSimpleHeight(normalizedSize.height);
      setSimpleResolutionSelection(inferResolutionSelection(normalizedSize.width, normalizedSize.height));
      syncDimensionInputsForUi("simple", normalizedSize.width, normalizedSize.height);
      return;
    }
    setProWidth(normalizedSize.width);
    setProHeight(normalizedSize.height);
    setProResolutionSelection(inferResolutionSelection(normalizedSize.width, normalizedSize.height));
    syncDimensionInputsForUi("pro", normalizedSize.width, normalizedSize.height);
  }, [inferResolutionSelection, syncDimensionInputsForUi]);

  const clearSourceImageForUi = useCallback((targetUiMode: UiMode) => {
    setModeForUi(targetUiMode, "txt2img");
    clearInfillMaskForUi(targetUiMode);
    onSourceImageChange?.();
    if (targetUiMode === "simple") {
      setSimpleSourceImageDataUrl("");
      setSimpleSourceImageBase64("");
      setSimpleSourceImageSize(null);
      return;
    }
    setProSourceImageDataUrl("");
    setProSourceImageBase64("");
    setProSourceImageSize(null);
  }, [clearInfillMaskForUi, onSourceImageChange, setModeForUi]);

  const syncInpaintSourceForUi = useCallback((targetUiMode: UiMode, sourceImage: ImportedSourceImagePayload) => {
    const nextSourceImageSize = sourceImage.width && sourceImage.height
      ? { width: sourceImage.width, height: sourceImage.height }
      : null;
    clearInfillMaskForUi(targetUiMode);
    if (targetUiMode === "simple") {
      setSimpleSourceImageDataUrl(sourceImage.dataUrl);
      setSimpleSourceImageBase64(sourceImage.imageBase64);
      setSimpleSourceImageSize(nextSourceImageSize);
    }
    else {
      setProSourceImageDataUrl(sourceImage.dataUrl);
      setProSourceImageBase64(sourceImage.imageBase64);
      setProSourceImageSize(nextSourceImageSize);
    }
    syncSourceImageSizeForUi(targetUiMode, sourceImage.width, sourceImage.height);
    onSourceImageChange?.();
  }, [clearInfillMaskForUi, onSourceImageChange, syncSourceImageSizeForUi]);

  const commitRoundedDimensionsForUi = useCallback((targetUiMode: UiMode) => {
    if (targetUiMode === "simple") {
      if (!simpleWidthInput.trim() || !simpleHeightInput.trim())
        return;
      const rounded = getClosestValidImageSize(simpleWidth, simpleHeight);
      setSimpleWidth(rounded.width);
      setSimpleHeight(rounded.height);
      setSimpleResolutionSelection(inferResolutionSelection(rounded.width, rounded.height));
      syncDimensionInputsForUi("simple", rounded.width, rounded.height);
      return;
    }
    if (!proWidthInput.trim() || !proHeightInput.trim())
      return;
    const rounded = getClosestValidImageSize(proWidth, proHeight);
    setProWidth(rounded.width);
    setProHeight(rounded.height);
    setProResolutionSelection(inferResolutionSelection(rounded.width, rounded.height));
    syncDimensionInputsForUi("pro", rounded.width, rounded.height);
  }, [inferResolutionSelection, proHeight, proHeightInput, proWidth, proWidthInput, simpleHeight, simpleHeightInput, simpleWidth, simpleWidthInput, syncDimensionInputsForUi]);

  const resolveInfillMaskBase64ForUi = useCallback((targetUiMode: UiMode) => {
    const dataUrl = targetUiMode === "simple" ? simpleInfillMaskDataUrl : proInfillMaskDataUrl;
    return dataUrlToBase64(dataUrl) || "";
  }, [proInfillMaskDataUrl, simpleInfillMaskDataUrl]);

  useEffect(() => {
    if (mode !== "infill")
      return;
    if (!sourceImageDataUrl || !sourceImageBase64 || !infillMaskDataUrl)
      queueMicrotask(() => setModeForUi(uiMode, "txt2img"));
  }, [infillMaskDataUrl, mode, setModeForUi, sourceImageBase64, sourceImageDataUrl, uiMode]);

  useEffect(() => {
    if (!samplerOptions.some(option => option === proSampler))
      queueMicrotask(() => setProSampler(samplerOptions[0]));
  }, [proSampler, samplerOptions]);

  useEffect(() => {
    if (!noiseScheduleOptions.length)
      return;
    if (!noiseScheduleOptions.some(option => option === proNoiseSchedule))
      queueMicrotask(() => setProNoiseSchedule(noiseScheduleOptions[0]));
  }, [noiseScheduleOptions, proNoiseSchedule]);

  useEffect(() => {
    if (uiMode !== "simple" || simpleResolutionSelection === CUSTOM_RESOLUTION_ID)
      return;
    const matchedPresetId = inferResolutionSelection(simpleWidth, simpleHeight);
    if (matchedPresetId !== simpleResolutionSelection)
      queueMicrotask(() => setSimpleResolutionSelection(matchedPresetId));
  }, [inferResolutionSelection, simpleHeight, simpleResolutionSelection, simpleWidth, uiMode]);

  useEffect(() => {
    if (uiMode !== "pro" || proResolutionSelection === CUSTOM_RESOLUTION_ID)
      return;
    const matchedPresetId = inferResolutionSelection(proWidth, proHeight);
    if (matchedPresetId !== proResolutionSelection)
      queueMicrotask(() => setProResolutionSelection(matchedPresetId));
  }, [inferResolutionSelection, proHeight, proResolutionSelection, proWidth, uiMode]);

  useEffect(() => {
    if (uiMode !== "simple" || simpleResolutionSelection !== CUSTOM_RESOLUTION_ID)
      return;
    const nextWidth = clampCustomDimensionInput(simpleWidth, DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
    const nextHeight = clampCustomDimensionInput(simpleHeight, DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
    if (nextWidth === simpleWidth && nextHeight === simpleHeight)
      return;
    queueMicrotask(() => setSimpleWidth(nextWidth));
    queueMicrotask(() => setSimpleHeight(nextHeight));
    queueMicrotask(() => syncDimensionInputsForUi("simple", nextWidth, nextHeight));
  }, [clampCustomDimensionInput, simpleHeight, simpleResolutionSelection, simpleWidth, syncDimensionInputsForUi, uiMode]);

  useEffect(() => {
    if (uiMode !== "pro" || proResolutionSelection !== CUSTOM_RESOLUTION_ID)
      return;
    const nextWidth = clampCustomDimensionInput(proWidth, DEFAULT_PRO_IMAGE_SETTINGS.width);
    const nextHeight = clampCustomDimensionInput(proHeight, DEFAULT_PRO_IMAGE_SETTINGS.height);
    if (nextWidth === proWidth && nextHeight === proHeight)
      return;
    queueMicrotask(() => setProWidth(nextWidth));
    queueMicrotask(() => setProHeight(nextHeight));
    queueMicrotask(() => syncDimensionInputsForUi("pro", nextWidth, nextHeight));
  }, [clampCustomDimensionInput, proHeight, proResolutionSelection, proWidth, syncDimensionInputsForUi, uiMode]);

  const applyInfillStrengthAndNoise = useCallback((targetUiMode: UiMode, targetMode: AiImageHistoryMode | undefined, nextStrength: number | undefined, nextNoise: number | undefined) => {
    if (targetMode !== "infill")
      return;
    if (targetUiMode === "simple") {
      if (nextStrength != null)
        setSimpleInfillStrength(clampRange(nextStrength, 0.01, 1, DEFAULT_INPAINT_STRENGTH));
      if (nextNoise != null)
        setSimpleInfillNoise(clampRange(nextNoise, 0, 0.99, DEFAULT_INPAINT_NOISE));
      return;
    }
    if (nextStrength != null)
      setProInfillStrength(clampRange(nextStrength, 0.01, 1, DEFAULT_INPAINT_STRENGTH));
    if (nextNoise != null)
      setProInfillNoise(clampRange(nextNoise, 0, 0.99, DEFAULT_INPAINT_NOISE));
  }, []);

  const handleSelectSimpleResolutionPreset = useCallback((selection: ResolutionSelection) => {
    if (selection === CUSTOM_RESOLUTION_ID) {
      setSimpleResolutionSelection(CUSTOM_RESOLUTION_ID);
      return;
    }
    const preset = RESOLUTION_PRESETS.find(item => item.id === selection);
    if (!preset)
      return;
    setSimpleResolutionSelection(preset.id);
    setSimpleWidth(preset.width);
    setSimpleHeight(preset.height);
    syncDimensionInputsForUi("simple", preset.width, preset.height);
  }, [syncDimensionInputsForUi]);

  const handleSelectProResolutionPreset = useCallback((selection: ResolutionSelection) => {
    if (selection === CUSTOM_RESOLUTION_ID) {
      setProResolutionSelection(CUSTOM_RESOLUTION_ID);
      return;
    }
    const preset = RESOLUTION_PRESETS.find(item => item.id === selection);
    if (!preset)
      return;
    setProResolutionSelection(preset.id);
    setProWidth(preset.width);
    setProHeight(preset.height);
    syncDimensionInputsForUi("pro", preset.width, preset.height);
  }, [syncDimensionInputsForUi]);

  const handleSimpleWidthChange = useCallback((value: string) => {
    setSimpleResolutionSelection(CUSTOM_RESOLUTION_ID);
    const trimmedValue = value.trim();
    setSimpleWidthInput(trimmedValue);
    if (!trimmedValue)
      return;
    const nextHeight = clampCustomDimensionInput(simpleHeight, DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
    const nextWidth = clampCustomDimensionInput(trimmedValue, simpleWidth || DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
    setSimpleWidth(nextWidth);
    setSimpleHeight(nextHeight);
    syncDimensionInputsForUi("simple", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, simpleHeight, simpleWidth, syncDimensionInputsForUi]);

  const handleProWidthChange = useCallback((value: string) => {
    setProResolutionSelection(CUSTOM_RESOLUTION_ID);
    const trimmedValue = value.trim();
    setProWidthInput(trimmedValue);
    if (!trimmedValue)
      return;
    const nextHeight = clampCustomDimensionInput(proHeight, DEFAULT_PRO_IMAGE_SETTINGS.height);
    const nextWidth = clampCustomDimensionInput(trimmedValue, proWidth || DEFAULT_PRO_IMAGE_SETTINGS.width);
    setProWidth(nextWidth);
    setProHeight(nextHeight);
    syncDimensionInputsForUi("pro", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, proHeight, proWidth, syncDimensionInputsForUi]);

  const handleSimpleHeightChange = useCallback((value: string) => {
    setSimpleResolutionSelection(CUSTOM_RESOLUTION_ID);
    const trimmedValue = value.trim();
    setSimpleHeightInput(trimmedValue);
    if (!trimmedValue)
      return;
    const nextWidth = clampCustomDimensionInput(simpleWidth, DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
    const nextHeight = clampCustomDimensionInput(trimmedValue, simpleHeight || DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
    setSimpleWidth(nextWidth);
    setSimpleHeight(nextHeight);
    syncDimensionInputsForUi("simple", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, simpleHeight, simpleWidth, syncDimensionInputsForUi]);

  const handleProHeightChange = useCallback((value: string) => {
    setProResolutionSelection(CUSTOM_RESOLUTION_ID);
    const trimmedValue = value.trim();
    setProHeightInput(trimmedValue);
    if (!trimmedValue)
      return;
    const nextWidth = clampCustomDimensionInput(proWidth, DEFAULT_PRO_IMAGE_SETTINGS.width);
    const nextHeight = clampCustomDimensionInput(trimmedValue, proHeight || DEFAULT_PRO_IMAGE_SETTINGS.height);
    setProWidth(nextWidth);
    setProHeight(nextHeight);
    syncDimensionInputsForUi("pro", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, proHeight, proWidth, syncDimensionInputsForUi]);

  const handleSwapImageDimensions = useCallback(() => {
    const nextWidth = clampCustomDimensionInput(proHeight, DEFAULT_PRO_IMAGE_SETTINGS.height);
    const nextHeight = clampCustomDimensionInput(proWidth, DEFAULT_PRO_IMAGE_SETTINGS.width);
    setProWidth(nextWidth);
    setProHeight(nextHeight);
    setProResolutionSelection(CUSTOM_RESOLUTION_ID);
    syncDimensionInputsForUi("pro", nextWidth, nextHeight);
  }, [clampCustomDimensionInput, proHeight, proWidth, syncDimensionInputsForUi]);

  const handleResetCurrentImageSettings = useCallback(() => {
    if (uiMode === "simple") {
      setSimpleWidth(DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
      setSimpleHeight(DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
      setSimpleInfillStrength(DEFAULT_INPAINT_STRENGTH);
      setSimpleInfillNoise(DEFAULT_INPAINT_NOISE);
      setSimpleInfillFocusedArea(null);
      setSimpleOverlayOriginalImage(DEFAULT_OVERLAY_ORIGINAL_IMAGE);
      setSimpleSeed(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);
      setSimpleResolutionSelection(DEFAULT_SIMPLE_IMAGE_SETTINGS.simpleResolutionSelection);
      syncDimensionInputsForUi("simple", DEFAULT_SIMPLE_IMAGE_SETTINGS.width, DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
      showSuccessToast("已重置快速模式图像设置。");
      return;
    }
    setProWidth(DEFAULT_PRO_IMAGE_SETTINGS.width);
    setProHeight(DEFAULT_PRO_IMAGE_SETTINGS.height);
    setProSteps(DEFAULT_PRO_IMAGE_SETTINGS.steps);
    setProScale(DEFAULT_PRO_IMAGE_SETTINGS.scale);
    setProSampler(DEFAULT_PRO_IMAGE_SETTINGS.sampler);
    setProNoiseSchedule(DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
    setProCfgRescale(DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
    setProUcPreset(DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
    setProQualityToggle(DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
    setProCfgDelay(DEFAULT_PRO_IMAGE_SETTINGS.cfgDelay);
    setProDynamicThresholding(DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
    setProInfillStrength(DEFAULT_INPAINT_STRENGTH);
    setProInfillNoise(DEFAULT_INPAINT_NOISE);
    setProInfillFocusedArea(null);
    setProOverlayOriginalImage(DEFAULT_OVERLAY_ORIGINAL_IMAGE);
    setProSeed(DEFAULT_PRO_IMAGE_SETTINGS.seed);
    setProResolutionSelection(DEFAULT_PRO_IMAGE_SETTINGS.simpleResolutionSelection);
    syncDimensionInputsForUi("pro", DEFAULT_PRO_IMAGE_SETTINGS.width, DEFAULT_PRO_IMAGE_SETTINGS.height);
    showSuccessToast("已重置当前图像设置。");
  }, [showSuccessToast, syncDimensionInputsForUi, uiMode]);

  const setStrength = useCallback((value: number) => {
    if (uiMode === "simple") {
      setSimpleInfillStrength(value);
      return;
    }
    setProInfillStrength(value);
  }, [uiMode]);

  const setSeed = useCallback((value: number) => {
    if (uiMode === "simple") {
      setSimpleSeed(value);
      return;
    }
    setProSeed(value);
  }, [uiMode]);

  return {
    samplerOptions,
    noiseScheduleOptions,
    simpleMode,
    mode,
    setModeForUi,
    sourceImageDataUrl,
    sourceImageBase64,
    sourceImageSize,
    setSimpleInfillMaskDataUrl,
    setProInfillMaskDataUrl,
    infillMaskDataUrl,
    setSimpleInfillFocusedArea,
    setProInfillFocusedArea,
    infillFocusedArea,
    setSimpleOverlayOriginalImage,
    setProOverlayOriginalImage,
    overlayOriginalImage,
    clearInfillMaskForUi,
    width,
    height,
    widthInput,
    heightInput,
    roundedRequestedSize,
    hasCompleteDimensionInputs,
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
    strength,
    seed,
    seedIsRandom,
    simpleWidth,
    setSimpleWidth,
    simpleHeight,
    setSimpleHeight,
    setSimpleSeed,
    simpleResolutionSelection,
    setSimpleResolutionSelection,
    proWidth,
    setProWidth,
    proHeight,
    setProHeight,
    proResolutionSelection,
    setProResolutionSelection,
    setProSteps,
    setProScale,
    setProSampler,
    setProNoiseSchedule,
    setProCfgRescale,
    setProUcPreset,
    setProQualityToggle,
    setProCfgDelay,
    setProDynamicThresholding,
    setProSeed,
    setSimpleInfillStrength,
    setSimpleInfillNoise,
    setProInfillStrength,
    inferResolutionSelection,
    applyInfillStrengthAndNoise,
    clearSourceImageForUi,
    syncInpaintSourceForUi,
    resolveInfillMaskBase64ForUi,
    handleSelectSimpleResolutionPreset,
    handleSelectProResolutionPreset,
    handleSimpleWidthChange,
    handleProWidthChange,
    handleSimpleHeightChange,
    handleProHeightChange,
    handleSwapImageDimensions,
    handleCommitSimpleDimensions: () => commitRoundedDimensionsForUi("simple"),
    handleCommitProDimensions: () => commitRoundedDimensionsForUi("pro"),
    handleResetCurrentImageSettings,
    setSteps: setProSteps,
    setScale: setProScale,
    setSampler: setProSampler,
    setNoiseSchedule: setProNoiseSchedule,
    setCfgRescale: setProCfgRescale,
    setDynamicThresholding: setProDynamicThresholding,
    setStrength,
    setSeed,
  };
}
