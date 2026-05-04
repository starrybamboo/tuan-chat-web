import { useCallback, useEffect, useMemo, useState } from "react";

import type { ImportedSourceImagePayload, ResolutionSelection, UiMode } from "@/components/aiImage/types";
import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";

import {
  CUSTOM_RESOLUTION_ID,
  DEFAULT_PRO_IMAGE_SETTINGS,
  DEFAULT_SIMPLE_IMAGE_SETTINGS,
  NOISE_SCHEDULES_NAI4,
  NOVELAI_FREE_FIXED_IMAGE_COUNT,
  RESOLUTION_PRESETS,
  SAMPLERS_NAI4,
} from "@/components/aiImage/constants";
import {
  buildImportedSourceImagePayloadFromDataUrl,
  clampIntRange,
  clampRange,
  dataUrlToBase64,
  fitNovelAiImageSizeWithinAreaLimit,
  getClosestValidImageSize,
} from "@/components/aiImage/helpers";
import {
  buildRoundedRectMaskGrid,
  buildSolidInpaintMaskGrid,
  erodeMaskGrid,
  findMaskGridBounds,
  renderMaskGridToRgba,
} from "@/components/aiImage/inpaintMaskUtils";

const DEFAULT_INPAINT_STRENGTH = 1;
const DEFAULT_INPAINT_NOISE = 0;

type ReadImageSizeResult = {
  width: number;
  height: number;
};

type ReadImagePixelsResult = {
  data: Uint8ClampedArray;
} & ReadImageSizeResult;

type UseAiImageDimensionsStateOptions = {
  uiMode: UiMode;
  showSuccessToast: (message: string) => void;
  readImagePixels: (dataUrl: string) => Promise<ReadImagePixelsResult>;
  readImageSize: (dataUrl: string) => Promise<ReadImageSizeResult>;
  onSourceImageChange?: () => void;
};

export function useAiImageDimensionsState({
  uiMode,
  showSuccessToast,
  readImagePixels,
  readImageSize,
  onSourceImageChange,
}: UseAiImageDimensionsStateOptions) {
  const [simpleMode, setSimpleMode] = useState<AiImageHistoryMode>("txt2img");
  const [proMode, setProMode] = useState<AiImageHistoryMode>("txt2img");
  const [simpleSourceImageDataUrl, setSimpleSourceImageDataUrl] = useState("");
  const [simpleSourceImageBase64, setSimpleSourceImageBase64] = useState("");
  const [simpleSourceImageSize, setSimpleSourceImageSize] = useState<ReadImageSizeResult | null>(null);
  const [proSourceImageDataUrl, setProSourceImageDataUrl] = useState("");
  const [proSourceImageBase64, setProSourceImageBase64] = useState("");
  const [proSourceImageSize, setProSourceImageSize] = useState<ReadImageSizeResult | null>(null);
  const [simpleInfillMaskDataUrl, setSimpleInfillMaskDataUrl] = useState("");
  const [proInfillMaskDataUrl, setProInfillMaskDataUrl] = useState("");

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
  const [proImageCount, setProImageCount] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.imageCount);
  const [proSteps, setProSteps] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.steps);
  const [proScale, setProScale] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.scale);
  const [proSampler, setProSampler] = useState<string>(DEFAULT_PRO_IMAGE_SETTINGS.sampler);
  const [proNoiseSchedule, setProNoiseSchedule] = useState<string>(DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
  const [proCfgRescale, setProCfgRescale] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
  const [proUcPreset, setProUcPreset] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
  const [proSmea, setProSmea] = useState<boolean>(DEFAULT_PRO_IMAGE_SETTINGS.smea);
  const [proSmeaDyn, setProSmeaDyn] = useState<boolean>(DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
  const [proQualityToggle, setProQualityToggle] = useState<boolean>(DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
  const [proDynamicThresholding, setProDynamicThresholding] = useState<boolean>(DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
  const [proSeed, setProSeed] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.seed);
  const [simpleImg2imgStrength, setSimpleImg2imgStrength] = useState<number>(DEFAULT_SIMPLE_IMAGE_SETTINGS.strength);
  const [simpleImg2imgNoise, setSimpleImg2imgNoise] = useState<number>(DEFAULT_SIMPLE_IMAGE_SETTINGS.noise);
  const [proImg2imgStrength, setProImg2imgStrength] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.strength);
  const [proImg2imgNoise, setProImg2imgNoise] = useState<number>(DEFAULT_PRO_IMAGE_SETTINGS.noise);
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
  const imageCount = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.imageCount : proImageCount;
  const steps = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.steps : proSteps;
  const scale = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.scale : proScale;
  const sampler = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.sampler : proSampler;
  const noiseSchedule = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.noiseSchedule : proNoiseSchedule;
  const cfgRescale = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.cfgRescale : proCfgRescale;
  const ucPreset = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.ucPreset : proUcPreset;
  const qualityToggle = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.qualityToggle : proQualityToggle;
  const dynamicThresholding = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.dynamicThresholding : proDynamicThresholding;
  const smea = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.smea : proSmea;
  const smeaDyn = uiMode === "simple" ? DEFAULT_SIMPLE_IMAGE_SETTINGS.smeaDyn : proSmeaDyn;
  const seed = uiMode === "simple" ? simpleSeed : proSeed;
  const sourceImageDataUrl = uiMode === "simple" ? simpleSourceImageDataUrl : proSourceImageDataUrl;
  const sourceImageBase64 = uiMode === "simple" ? simpleSourceImageBase64 : proSourceImageBase64;
  const sourceImageSize = uiMode === "simple" ? simpleSourceImageSize : proSourceImageSize;
  const infillMaskDataUrl = uiMode === "simple" ? simpleInfillMaskDataUrl : proInfillMaskDataUrl;
  const currentImg2imgStrength = uiMode === "simple" ? simpleImg2imgStrength : proImg2imgStrength;
  const currentImg2imgNoise = uiMode === "simple" ? simpleImg2imgNoise : proImg2imgNoise;
  const currentInfillStrength = uiMode === "simple" ? simpleInfillStrength : proInfillStrength;
  const currentInfillNoise = uiMode === "simple" ? simpleInfillNoise : proInfillNoise;
  const strength = mode === "infill" ? currentInfillStrength : currentImg2imgStrength;
  const noise = mode === "infill" ? currentInfillNoise : currentImg2imgNoise;
  const roundedRequestedSize = getClosestValidImageSize(width, height);
  const hasCompleteDimensionInputs = widthInput.trim().length > 0 && heightInput.trim().length > 0;
  const imageCountLimit = NOVELAI_FREE_FIXED_IMAGE_COUNT;
  const activeResolutionPreset = useMemo(() => {
    return RESOLUTION_PRESETS.find(item => item.width === proWidth && item.height === proHeight) || null;
  }, [proHeight, proWidth]);
  const simpleResolutionArea = simpleWidth * simpleHeight;
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

  const setModeForUi = useCallback((targetUiMode: UiMode, nextMode: AiImageHistoryMode) => {
    if (targetUiMode === "simple") {
      setSimpleMode(nextMode);
      return;
    }
    setProMode(nextMode);
  }, []);

  const clearInfillMaskForUi = useCallback((targetUiMode: UiMode) => {
    if (targetUiMode === "simple") {
      setSimpleInfillMaskDataUrl("");
      return;
    }
    setProInfillMaskDataUrl("");
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

  const applySourceImageForUi = useCallback((targetUiMode: UiMode, sourceImage: ImportedSourceImagePayload, successMessage?: string) => {
    const nextSourceImageSize = sourceImage.width && sourceImage.height
      ? { width: sourceImage.width, height: sourceImage.height }
      : null;
    setModeForUi(targetUiMode, "img2img");
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
    if (successMessage)
      showSuccessToast(successMessage);
    onSourceImageChange?.();
  }, [clearInfillMaskForUi, onSourceImageChange, setModeForUi, showSuccessToast, syncSourceImageSizeForUi]);

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

  const resolveSeparatedInfillMaskBase64ForUi = useCallback(async (targetUiMode: UiMode) => {
    const dataUrl = targetUiMode === "simple" ? simpleInfillMaskDataUrl : proInfillMaskDataUrl;
    if (!dataUrl)
      return "";
    const pixels = await readImagePixels(dataUrl);
    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = pixels.width;
    baseCanvas.height = pixels.height;
    const baseContext = baseCanvas.getContext("2d");
    if (!baseContext)
      throw new Error("Inpaint 蒙版处理失败。");
    const solidMask = buildSolidInpaintMaskGrid(pixels.data, pixels.width, pixels.height, { closeRadius: 3 });
    const maskBounds = findMaskGridBounds(solidMask, pixels.width, pixels.height);
    const requestMask = maskBounds
      ? buildRoundedRectMaskGrid(maskBounds, pixels.width, pixels.height, {
          padding: clampIntRange(Math.round(Math.max(maskBounds.width, maskBounds.height) * 0.18), 18, 72, 36),
          cornerRadius: clampIntRange(Math.round(Math.min(maskBounds.width, maskBounds.height) * 0.16), 12, 48, 24),
        })
      : solidMask;
    const imageData = baseContext.createImageData(pixels.width, pixels.height);
    imageData.data.set(renderMaskGridToRgba(requestMask));
    baseContext.putImageData(imageData, 0, 0);
    const expandedCanvas = document.createElement("canvas");
    expandedCanvas.width = pixels.width;
    expandedCanvas.height = pixels.height;
    const expandedContext = expandedCanvas.getContext("2d");
    if (!expandedContext)
      throw new Error("Inpaint 蒙版扩张失败。");
    expandedContext.fillStyle = "#000";
    expandedContext.fillRect(0, 0, expandedCanvas.width, expandedCanvas.height);
    for (let offsetY = -4; offsetY <= 4; offsetY += 1) {
      for (let offsetX = -4; offsetX <= 4; offsetX += 1) {
        if (offsetX * offsetX + offsetY * offsetY > 16)
          continue;
        expandedContext.drawImage(baseCanvas, offsetX, offsetY);
      }
    }
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = pixels.width;
    finalCanvas.height = pixels.height;
    const finalContext = finalCanvas.getContext("2d");
    if (!finalContext)
      throw new Error("Inpaint 蒙版羽化失败。");
    finalContext.fillStyle = "#000";
    finalContext.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    if ("filter" in finalContext)
      finalContext.filter = "blur(4px)";
    finalContext.drawImage(expandedCanvas, 0, 0);
    if ("filter" in finalContext)
      finalContext.filter = "none";
    return dataUrlToBase64(finalCanvas.toDataURL("image/png")) || "";
  }, [proInfillMaskDataUrl, readImagePixels, simpleInfillMaskDataUrl]);

  const resolveBlendInfillMaskDataUrlForUi = useCallback(async (targetUiMode: UiMode) => {
    const dataUrl = targetUiMode === "simple" ? simpleInfillMaskDataUrl : proInfillMaskDataUrl;
    if (!dataUrl)
      return "";
    const pixels = await readImagePixels(dataUrl);
    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = pixels.width;
    baseCanvas.height = pixels.height;
    const baseContext = baseCanvas.getContext("2d");
    if (!baseContext)
      throw new Error("Inpaint 混合蒙版处理失败。");
    const solidMask = buildSolidInpaintMaskGrid(pixels.data, pixels.width, pixels.height, { closeRadius: 1 });
    const maskBounds = findMaskGridBounds(solidMask, pixels.width, pixels.height);
    const insetRadius = maskBounds
      ? clampIntRange(Math.round(Math.min(maskBounds.width, maskBounds.height) * 0.04), 2, 12, 6)
      : 6;
    const blendMask = erodeMaskGrid(solidMask, pixels.width, pixels.height, insetRadius);
    const imageData = baseContext.createImageData(pixels.width, pixels.height);
    imageData.data.set(renderMaskGridToRgba(blendMask));
    baseContext.putImageData(imageData, 0, 0);
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = pixels.width;
    finalCanvas.height = pixels.height;
    const finalContext = finalCanvas.getContext("2d");
    if (!finalContext)
      throw new Error("Inpaint 混合蒙版羽化失败。");
    finalContext.fillStyle = "#000";
    finalContext.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    if ("filter" in finalContext)
      finalContext.filter = "blur(2px)";
    finalContext.drawImage(baseCanvas, 0, 0);
    if ("filter" in finalContext)
      finalContext.filter = "none";
    return finalCanvas.toDataURL("image/png");
  }, [proInfillMaskDataUrl, readImagePixels, simpleInfillMaskDataUrl]);

  const restoreSourceImageForUi = useCallback((targetUiMode: UiMode, args: {
    dataUrl?: string | null;
    name?: string;
    width?: number | null;
    height?: number | null;
  }) => {
    const sourceImage = buildImportedSourceImagePayloadFromDataUrl({
      dataUrl: String(args.dataUrl || ""),
      name: args.name,
      width: args.width,
      height: args.height,
    });
    if (!sourceImage) {
      clearSourceImageForUi(targetUiMode);
      return false;
    }
    applySourceImageForUi(targetUiMode, sourceImage);
    return true;
  }, [applySourceImageForUi, clearSourceImageForUi]);

  useEffect(() => {
    if (mode !== "infill")
      return;
    if (!sourceImageDataUrl || !sourceImageBase64 || !infillMaskDataUrl)
      queueMicrotask(() => setModeForUi(uiMode, sourceImageDataUrl ? "img2img" : "txt2img"));
  }, [infillMaskDataUrl, mode, setModeForUi, sourceImageBase64, sourceImageDataUrl, uiMode]);

  useEffect(() => {
    if (!samplerOptions.includes(proSampler as any))
      queueMicrotask(() => setProSampler(samplerOptions[0]));
  }, [proSampler, samplerOptions]);

  useEffect(() => {
    if (!noiseScheduleOptions.length)
      return;
    if (!noiseScheduleOptions.includes(proNoiseSchedule as any))
      queueMicrotask(() => setProNoiseSchedule(noiseScheduleOptions[0]));
  }, [noiseScheduleOptions, proNoiseSchedule]);

  useEffect(() => {
    if (proImageCount > imageCountLimit)
      queueMicrotask(() => setProImageCount(imageCountLimit));
  }, [imageCountLimit, proImageCount]);

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

  const applyModeStrengthAndNoise = useCallback((targetUiMode: UiMode, targetMode: AiImageHistoryMode | undefined, nextStrength: number | undefined, nextNoise: number | undefined) => {
    const normalizedMode = targetMode === "infill" ? "infill" : "img2img";
    if (targetUiMode === "simple") {
      if (normalizedMode === "infill") {
        if (nextStrength != null)
          setSimpleInfillStrength(clampRange(nextStrength, 0.01, 1, DEFAULT_INPAINT_STRENGTH));
        if (nextNoise != null)
          setSimpleInfillNoise(clampRange(nextNoise, 0, 0.99, DEFAULT_INPAINT_NOISE));
        return;
      }
      if (nextStrength != null)
        setSimpleImg2imgStrength(clampRange(nextStrength, 0.01, 1, DEFAULT_SIMPLE_IMAGE_SETTINGS.strength));
      if (nextNoise != null)
        setSimpleImg2imgNoise(clampRange(nextNoise, 0, 0.99, DEFAULT_SIMPLE_IMAGE_SETTINGS.noise));
      return;
    }
    if (normalizedMode === "infill") {
      if (nextStrength != null)
        setProInfillStrength(clampRange(nextStrength, 0.01, 1, DEFAULT_INPAINT_STRENGTH));
      if (nextNoise != null)
        setProInfillNoise(clampRange(nextNoise, 0, 0.99, DEFAULT_INPAINT_NOISE));
      return;
    }
    if (nextStrength != null)
      setProImg2imgStrength(clampRange(nextStrength, 0.01, 1, DEFAULT_PRO_IMAGE_SETTINGS.strength));
    if (nextNoise != null)
      setProImg2imgNoise(clampRange(nextNoise, 0, 0.99, DEFAULT_PRO_IMAGE_SETTINGS.noise));
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

  const handleCropToClosestValidSize = useCallback(async () => {
    let targetWidth = proWidth;
    let targetHeight = proHeight;
    if (sourceImageDataUrl) {
      try {
        const sourceSize = await readImageSize(sourceImageDataUrl);
        targetWidth = sourceSize.width;
        targetHeight = sourceSize.height;
      }
      catch {
        // noop
      }
    }
    const normalizedSize = fitNovelAiImageSizeWithinAreaLimit(targetWidth, targetHeight);
    setProWidth(normalizedSize.width);
    setProHeight(normalizedSize.height);
    setProResolutionSelection(inferResolutionSelection(normalizedSize.width, normalizedSize.height));
    syncDimensionInputsForUi("pro", normalizedSize.width, normalizedSize.height);
    showSuccessToast(sourceImageDataUrl ? "已按 Base Img 裁到最近合法尺寸。" : "已把当前尺寸裁到最近合法尺寸。");
  }, [inferResolutionSelection, proHeight, proWidth, readImageSize, showSuccessToast, sourceImageDataUrl, syncDimensionInputsForUi]);

  const handleResetCurrentImageSettings = useCallback(() => {
    if (uiMode === "simple") {
      setSimpleWidth(DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
      setSimpleHeight(DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
      setSimpleImg2imgStrength(DEFAULT_SIMPLE_IMAGE_SETTINGS.strength);
      setSimpleImg2imgNoise(DEFAULT_SIMPLE_IMAGE_SETTINGS.noise);
      setSimpleInfillStrength(DEFAULT_INPAINT_STRENGTH);
      setSimpleInfillNoise(DEFAULT_INPAINT_NOISE);
      setSimpleSeed(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);
      setSimpleResolutionSelection(DEFAULT_SIMPLE_IMAGE_SETTINGS.simpleResolutionSelection);
      syncDimensionInputsForUi("simple", DEFAULT_SIMPLE_IMAGE_SETTINGS.width, DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
      showSuccessToast("已重置快速模式图像设置。");
      return;
    }
    setProWidth(DEFAULT_PRO_IMAGE_SETTINGS.width);
    setProHeight(DEFAULT_PRO_IMAGE_SETTINGS.height);
    setProImageCount(DEFAULT_PRO_IMAGE_SETTINGS.imageCount);
    setProSteps(DEFAULT_PRO_IMAGE_SETTINGS.steps);
    setProScale(DEFAULT_PRO_IMAGE_SETTINGS.scale);
    setProSampler(DEFAULT_PRO_IMAGE_SETTINGS.sampler);
    setProNoiseSchedule(DEFAULT_PRO_IMAGE_SETTINGS.noiseSchedule);
    setProCfgRescale(DEFAULT_PRO_IMAGE_SETTINGS.cfgRescale);
    setProUcPreset(DEFAULT_PRO_IMAGE_SETTINGS.ucPreset);
    setProQualityToggle(DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle);
    setProDynamicThresholding(DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding);
    setProSmea(DEFAULT_PRO_IMAGE_SETTINGS.smea);
    setProSmeaDyn(DEFAULT_PRO_IMAGE_SETTINGS.smeaDyn);
    setProImg2imgStrength(DEFAULT_PRO_IMAGE_SETTINGS.strength);
    setProImg2imgNoise(DEFAULT_PRO_IMAGE_SETTINGS.noise);
    setProInfillStrength(DEFAULT_INPAINT_STRENGTH);
    setProInfillNoise(DEFAULT_INPAINT_NOISE);
    setProSeed(DEFAULT_PRO_IMAGE_SETTINGS.seed);
    setProResolutionSelection(DEFAULT_PRO_IMAGE_SETTINGS.simpleResolutionSelection);
    syncDimensionInputsForUi("pro", DEFAULT_PRO_IMAGE_SETTINGS.width, DEFAULT_PRO_IMAGE_SETTINGS.height);
    showSuccessToast("已重置当前图像设置。");
  }, [showSuccessToast, syncDimensionInputsForUi, uiMode]);

  const setWidth = useCallback((value: number) => {
    if (uiMode === "simple") {
      setSimpleWidth(value);
      return;
    }
    setProWidth(value);
  }, [uiMode]);

  const setHeight = useCallback((value: number) => {
    if (uiMode === "simple") {
      setSimpleHeight(value);
      return;
    }
    setProHeight(value);
  }, [uiMode]);

  const setStrength = useCallback((value: number) => {
    if (mode === "infill") {
      if (uiMode === "simple") {
        setSimpleInfillStrength(value);
        return;
      }
      setProInfillStrength(value);
      return;
    }
    if (uiMode === "simple") {
      setSimpleImg2imgStrength(value);
      return;
    }
    setProImg2imgStrength(value);
  }, [mode, uiMode]);

  const setNoise = useCallback((value: number) => {
    if (mode === "infill") {
      if (uiMode === "simple") {
        setSimpleInfillNoise(value);
        return;
      }
      setProInfillNoise(value);
      return;
    }
    if (uiMode === "simple") {
      setSimpleImg2imgNoise(value);
      return;
    }
    setProImg2imgNoise(value);
  }, [mode, uiMode]);

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
    proMode,
    mode,
    setModeForUi,
    simpleSourceImageDataUrl,
    setSimpleSourceImageDataUrl,
    simpleSourceImageBase64,
    setSimpleSourceImageBase64,
    simpleSourceImageSize,
    setSimpleSourceImageSize,
    proSourceImageDataUrl,
    setProSourceImageDataUrl,
    proSourceImageBase64,
    setProSourceImageBase64,
    proSourceImageSize,
    setProSourceImageSize,
    sourceImageDataUrl,
    sourceImageBase64,
    sourceImageSize,
    simpleInfillMaskDataUrl,
    setSimpleInfillMaskDataUrl,
    proInfillMaskDataUrl,
    setProInfillMaskDataUrl,
    infillMaskDataUrl,
    clearInfillMaskForUi,
    width,
    height,
    widthInput,
    heightInput,
    roundedRequestedSize,
    hasCompleteDimensionInputs,
    imageCount,
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
    strength,
    noise,
    seed,
    seedIsRandom,
    imageCountLimit,
    simpleWidth,
    setSimpleWidth,
    simpleHeight,
    setSimpleHeight,
    simpleWidthInput,
    simpleHeightInput,
    simpleSeed,
    setSimpleSeed,
    simpleResolutionSelection,
    setSimpleResolutionSelection,
    proWidth,
    setProWidth,
    proHeight,
    setProHeight,
    proWidthInput,
    proHeightInput,
    proResolutionSelection,
    setProResolutionSelection,
    proImageCount,
    setProImageCount,
    proSteps,
    setProSteps,
    proScale,
    setProScale,
    proSampler,
    setProSampler,
    proNoiseSchedule,
    setProNoiseSchedule,
    proCfgRescale,
    setProCfgRescale,
    proUcPreset,
    setProUcPreset,
    proSmea,
    setProSmea,
    proSmeaDyn,
    setProSmeaDyn,
    proQualityToggle,
    setProQualityToggle,
    proDynamicThresholding,
    setProDynamicThresholding,
    proSeed,
    setProSeed,
    simpleImg2imgStrength,
    setSimpleImg2imgStrength,
    simpleImg2imgNoise,
    setSimpleImg2imgNoise,
    proImg2imgStrength,
    setProImg2imgStrength,
    proImg2imgNoise,
    setProImg2imgNoise,
    simpleInfillStrength,
    setSimpleInfillStrength,
    simpleInfillNoise,
    setSimpleInfillNoise,
    proInfillStrength,
    setProInfillStrength,
    proInfillNoise,
    setProInfillNoise,
    inferResolutionSelection,
    applyModeStrengthAndNoise,
    clearSourceImageForUi,
    applySourceImageForUi,
    resolveInfillMaskBase64ForUi,
    resolveSeparatedInfillMaskBase64ForUi,
    resolveBlendInfillMaskDataUrlForUi,
    restoreSourceImageForUi,
    activeResolutionPreset,
    simpleResolutionArea,
    handleSelectSimpleResolutionPreset,
    handleSelectProResolutionPreset,
    handleSimpleWidthChange,
    handleProWidthChange,
    handleSimpleHeightChange,
    handleProHeightChange,
    handleSwapImageDimensions,
    handleCommitSimpleDimensions: () => commitRoundedDimensionsForUi("simple"),
    handleCommitProDimensions: () => commitRoundedDimensionsForUi("pro"),
    handleCropToClosestValidSize,
    handleResetCurrentImageSettings,
    handleClearSeed: () => {
      if (uiMode === "simple")
        setSimpleSeed(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);
      else
        setProSeed(DEFAULT_PRO_IMAGE_SETTINGS.seed);
    },
    setWidth,
    setHeight,
    setImageCount: setProImageCount,
    setSteps: setProSteps,
    setScale: setProScale,
    setSampler: setProSampler,
    setNoiseSchedule: setProNoiseSchedule,
    setCfgRescale: setProCfgRescale,
    setUcPreset: setProUcPreset,
    setQualityToggle: setProQualityToggle,
    setDynamicThresholding: setProDynamicThresholding,
    setSmea: setProSmea,
    setSmeaDyn: setProSmeaDyn,
    setStrength,
    setNoise,
    setSeed,
  };
}
