import type {
  GeneratedImageItem,
  UiMode,
} from "@/components/aiImage/types";
import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";

import {
  DEFAULT_PRO_IMAGE_SETTINGS,
  DEFAULT_SIMPLE_IMAGE_SETTINGS,
  NOVELAI_FREE_FIXED_IMAGE_COUNT,
} from "@/components/aiImage/constants";
import {
  base64DataUrl,
  base64ToBytes,
  generatedItemKey,
  getClosestValidImageSize,
  getNovelAiFreeGenerationViolation,
  makeStableId,
  mergeTagString,
  normalizeReferenceStrengthRows,
  resolveInpaintModel,
  sanitizeNovelAiTagInput,
} from "@/components/aiImage/helpers";
import { compositeFocusedInpaintResult, prepareFocusedInpaintPayload } from "@/components/aiImage/inpaintFocusUtils";

const DEFAULT_INPAINT_PROMPT = "very aesthetic, masterpiece, no text";
const DEFAULT_INPAINT_NEGATIVE_PROMPT = "nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page";

export function buildGenerateContext(args: Record<string, any>) {
  const effectiveMode = args.mode ?? args.currentMode;
  const infillPrompt = args.uiMode === "simple" ? args.simpleInfillPrompt : args.proInfillPrompt;
  const infillNegativePrompt = args.uiMode === "simple" ? args.simpleInfillNegativePrompt : args.proInfillNegativePrompt;
  const basePrompt = sanitizeNovelAiTagInput(String(args.prompt ?? (effectiveMode === "infill"
    ? infillPrompt || DEFAULT_INPAINT_PROMPT
    : (args.uiMode === "simple" ? args.simplePrompt : args.promptText))));
  const baseNegative = sanitizeNovelAiTagInput(String(args.negativePrompt ?? (effectiveMode === "infill"
    ? infillNegativePrompt || DEFAULT_INPAINT_NEGATIVE_PROMPT
    : (args.uiMode === "simple" ? args.simpleNegativePrompt : args.negativePromptText))));
  const mergeStyleTags = args.uiMode === "simple" && effectiveMode === "txt2img";
  const effectiveImageCount = NOVELAI_FREE_FIXED_IMAGE_COUNT;
  const effectivePrompt = mergeStyleTags ? mergeTagString(basePrompt, args.activeStyleTags).trim() : basePrompt;
  const effectiveNegative = mergeStyleTags ? mergeTagString(baseNegative, args.activeStyleNegativeTags) : baseNegative;
  const roundedRequestSize = getClosestValidImageSize(args.width, args.height);
  const effectiveWidth = roundedRequestSize.width;
  const effectiveHeight = roundedRequestSize.height;
  const effectiveStrength = args.strength;
  const effectiveNoise = args.noise;
  const usesSourceImage = effectiveMode === "img2img" || effectiveMode === "infill";
  const effectiveSourceImageBase64 = usesSourceImage ? args.sourceImageBase64 : undefined;
  const effectiveSourceImageDataUrl = usesSourceImage ? args.sourceImageDataUrl : undefined;
  const effectiveSourceImageWidth = usesSourceImage ? args.sourceImageWidth : undefined;
  const effectiveSourceImageHeight = usesSourceImage ? args.sourceImageHeight : undefined;
  const effectiveMaskBase64 = effectiveMode === "infill" ? args.maskBase64 : undefined;
  const v4CharsPayload = args.isNAI4 && args.uiMode === "pro" ? args.v4Chars.map(({ id, gender, ...rest }: any) => rest) : undefined;
  const v4UseCoordsPayload = args.uiMode === "pro" ? args.v4UseCoords : undefined;
  const v4UseOrderPayload = args.uiMode === "pro" ? args.v4UseOrder : undefined;
  const resolvedVibeTransferReferences = args.uiMode === "pro" && args.isNAI4
    ? (args.normalizeReferenceStrengths ? normalizeReferenceStrengthRows(args.vibeTransferReferences) : args.vibeTransferReferences)
    : [];
  const vibeTransferPayload = args.uiMode === "pro" && args.isNAI4
    ? resolvedVibeTransferReferences.map(({ imageBase64, id, dataUrl, name, lockInformationExtracted, ...rest }: any) => rest)
    : undefined;
  const preciseReferencePayload = args.uiMode === "pro" && args.isNAI4 && args.preciseReference
    ? {
        imageBase64: args.preciseReference.imageBase64,
        strength: args.preciseReference.strength,
        informationExtracted: args.preciseReference.informationExtracted,
      }
    : null;

  return {
    effectiveMode,
    effectivePrompt,
    effectiveNegative,
    effectiveImageCount,
    effectiveWidth,
    effectiveHeight,
    effectiveStrength,
    effectiveNoise,
    effectiveSourceImageBase64,
    effectiveSourceImageDataUrl,
    effectiveSourceImageWidth,
    effectiveSourceImageHeight,
    effectiveMaskBase64,
    v4CharsPayload,
    v4UseCoordsPayload,
    v4UseOrderPayload,
    resolvedVibeTransferReferences,
    vibeTransferPayload,
    preciseReferencePayload,
  };
}

export async function resolveFocusedGenerateContext(args: Record<string, any>) {
  const requestMaskBase64 = args.maskBase64 ?? (args.context.effectiveMode === "infill"
    ? await args.resolveSeparatedInfillMaskBase64ForUi(args.uiMode)
    : undefined);
  const requestMaskDataUrl = requestMaskBase64 ? base64DataUrl("image/png", base64ToBytes(requestMaskBase64)) : undefined;
  const blendMaskDataUrl = args.context.effectiveMode === "infill"
    ? await args.resolveBlendInfillMaskDataUrlForUi(args.uiMode)
    : "";
  const resolvedCompositeMaskDataUrl = blendMaskDataUrl || requestMaskDataUrl || "";
  const focusedInpaint = args.context.effectiveMode === "infill"
    && args.context.effectiveSourceImageDataUrl
    && requestMaskDataUrl
    ? await prepareFocusedInpaintPayload({
        sourceDataUrl: args.context.effectiveSourceImageDataUrl,
        maskDataUrl: requestMaskDataUrl,
      })
    : null;

  return {
    requestMaskBase64,
    requestMaskDataUrl,
    blendMaskDataUrl,
    resolvedCompositeMaskDataUrl,
    focusedInpaint,
    requestSourceImageBase64: focusedInpaint?.sourceImageBase64 ?? args.context.effectiveSourceImageBase64,
    requestSourceImageWidth: focusedInpaint?.targetSize.width ?? args.context.effectiveSourceImageWidth,
    requestSourceImageHeight: focusedInpaint?.targetSize.height ?? args.context.effectiveSourceImageHeight,
    requestWidth: focusedInpaint?.targetSize.width ?? args.context.effectiveWidth,
    requestHeight: focusedInpaint?.targetSize.height ?? args.context.effectiveHeight,
    requestMaskPayloadBase64: focusedInpaint?.maskBase64 ?? requestMaskBase64,
  };
}

export function validateGenerateContext(args: Record<string, any>) {
  if (args.context.effectiveMode === "txt2img" && !args.context.effectivePrompt)
    throw new Error("prompt 涓虹┖锛氳鍏堣ˉ鍏?tags");

  const freeViolation = getNovelAiFreeGenerationViolation({
    mode: args.context.effectiveMode,
    width: args.context.effectiveWidth,
    height: args.context.effectiveHeight,
    imageCount: args.context.effectiveImageCount,
    steps: args.steps,
    sourceImageBase64: args.context.effectiveSourceImageBase64,
    sourceImageWidth: args.context.effectiveSourceImageWidth,
    sourceImageHeight: args.context.effectiveSourceImageHeight,
    maskBase64: args.context.effectiveMaskBase64,
    vibeTransferReferenceCount: args.context.resolvedVibeTransferReferences.length,
    hasPreciseReference: Boolean(args.context.preciseReferencePayload),
  });
  if (freeViolation)
    throw new Error(freeViolation);
}

export async function finalizeGenerateResult(args: Record<string, any>) {
  const resolvedDataUrls = args.focusedContext.focusedInpaint && args.context.effectiveSourceImageDataUrl && args.focusedContext.resolvedCompositeMaskDataUrl
    ? await Promise.all(args.response.dataUrls.map(async (dataUrl: string) => {
        return await compositeFocusedInpaintResult({
          sourceDataUrl: args.context.effectiveSourceImageDataUrl,
          generatedCropDataUrl: dataUrl,
          fullMaskDataUrl: args.focusedContext.resolvedCompositeMaskDataUrl,
          cropRect: args.focusedContext.focusedInpaint.cropRect,
        });
      }))
    : args.response.dataUrls;

  const batchId = makeStableId();
  const resultWidth = args.focusedContext.focusedInpaint ? (args.context.effectiveSourceImageWidth ?? args.context.effectiveWidth) : args.response.width;
  const resultHeight = args.focusedContext.focusedInpaint ? (args.context.effectiveSourceImageHeight ?? args.context.effectiveHeight) : args.response.height;
  const generatedItems = resolvedDataUrls.map((dataUrl: string, batchIndex: number) => {
    return {
      dataUrl,
      seed: args.response.seed,
      width: resultWidth,
      height: resultHeight,
      model: args.response.model,
      batchId,
      batchIndex,
      batchSize: resolvedDataUrls.length,
      toolLabel: args.toolLabel,
    } satisfies GeneratedImageItem;
  });

  args.setResults(generatedItems);
  args.setSelectedResultIndex(0);
  args.setSelectedHistoryPreviewKey(null);
  if (args.uiMode === "simple")
    args.setSimpleSeed(args.seedValue == null ? DEFAULT_SIMPLE_IMAGE_SETTINGS.seed : args.response.seed);
  else
    args.setProSeed(args.seedValue == null ? DEFAULT_PRO_IMAGE_SETTINGS.seed : args.response.seed);

  return {
    generatedItems,
    batchId,
    resultWidth,
    resultHeight,
  };
}

export function buildHistoryRowsFromGenerateResult(args: Record<string, any>) {
  return args.generatedItems.map((item: GeneratedImageItem) => ({
    createdAt: Date.now(),
    mode: args.context.effectiveMode,
    model: args.response.model,
    seed: args.response.seed,
    width: args.resultWidth,
    height: args.resultHeight,
    prompt: args.context.effectivePrompt,
    negativePrompt: args.context.effectiveNegative,
    imageCount: args.context.effectiveImageCount,
    steps: args.steps,
    scale: args.scale,
    sampler: args.sampler,
    noiseSchedule: args.noiseSchedule,
    cfgRescale: args.cfgRescale,
    ucPreset: args.ucPreset,
    qualityToggle: args.qualityToggle,
    dynamicThresholding: args.dynamicThresholding,
    smea: args.smea,
    smeaDyn: args.smeaDyn,
    strength: args.context.effectiveStrength,
    noise: args.context.effectiveNoise,
    v4Chars: args.context.v4CharsPayload,
    v4UseCoords: args.context.v4UseCoordsPayload ?? false,
    v4UseOrder: args.context.v4UseOrderPayload ?? true,
    referenceImages: args.context.resolvedVibeTransferReferences.map(({ imageBase64, id, lockInformationExtracted, ...ref }: any) => ref),
    preciseReference: args.preciseReference
      ? {
          name: args.preciseReference.name,
          dataUrl: args.preciseReference.dataUrl,
          strength: args.preciseReference.strength,
          informationExtracted: args.preciseReference.informationExtracted,
        }
      : null,
    dataUrl: item.dataUrl,
    toolLabel: args.toolLabel,
    sourceDataUrl: args.context.effectiveMode === "img2img" || args.context.effectiveMode === "infill" ? args.context.effectiveSourceImageDataUrl : undefined,
    batchId: args.batchId,
    batchIndex: item.batchIndex,
    batchSize: item.batchSize,
  }));
}

export function buildOpenInpaintState(args: Record<string, any>) {
  const preview = args.selectedPreviewResult;
  if (!preview)
    return null;

  const sourceImageBase64 = args.dataUrlToBase64(preview.dataUrl);
  if (!sourceImageBase64)
    throw new Error("褰撳墠棰勮鍥剧墖璇诲彇澶辫触锛屾棤娉曞惎鍔?Inpaint銆?");

  const currentInfillPrompt = args.uiMode === "simple" ? args.simpleInfillPrompt : args.proInfillPrompt;
  const currentInfillNegativePrompt = args.uiMode === "simple" ? args.simpleInfillNegativePrompt : args.proInfillNegativePrompt;
  const sourcePrompt = String(args.selectedPreviewHistoryRow?.prompt || "").trim();
  const sourceNegativePrompt = String(args.selectedPreviewHistoryRow?.negativePrompt || "").trim();

  return {
    dataUrl: preview.dataUrl,
    imageBase64: sourceImageBase64,
    maskDataUrl: args.shouldSyncBaseImage ? "" : args.infillMaskDataUrl,
    width: preview.width,
    height: preview.height,
    seed: preview.seed,
    model: preview.model,
    mode: args.uiMode,
    prompt: args.shouldSyncBaseImage
      ? sourcePrompt || currentInfillPrompt || DEFAULT_INPAINT_PROMPT
      : currentInfillPrompt || sourcePrompt || DEFAULT_INPAINT_PROMPT,
    negativePrompt: args.shouldSyncBaseImage
      ? sourceNegativePrompt || currentInfillNegativePrompt || DEFAULT_INPAINT_NEGATIVE_PROMPT
      : currentInfillNegativePrompt || sourceNegativePrompt || DEFAULT_INPAINT_NEGATIVE_PROMPT,
    strength: args.currentInfillStrength,
  };
}
