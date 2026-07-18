import type { PreparedInpaintPayload } from "@/components/aiImage/inpaintFocusUtils";
import type {
  AiImageGenerationMode,
  GeneratedImageItem,
  InpaintDialogSource,
  InpaintFocusRect,
  UiMode,
  V4CharEditorRow,
  V4CharPayload,
} from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

import {
  DEFAULT_INPAINT_NEGATIVE_PROMPT,
  DEFAULT_INPAINT_PROMPT,
  DEFAULT_PRO_IMAGE_SETTINGS,
  DEFAULT_SIMPLE_IMAGE_SETTINGS,
  NOVELAI_FREE_FIXED_IMAGE_COUNT,
} from "@/components/aiImage/constants";
import {
  base64DataUrl,
  base64ToBytes,
  getClosestValidImageSize,
  getNovelAiFreeGenerationViolation,
  makeStableId,
  mergeTagString,
  sanitizeNovelAiTagInput,
} from "@/components/aiImage/helpers";
import { compositeInpaintResult, prepareInpaintPayload } from "@/components/aiImage/inpaintFocusUtils";

type GenerateImageResponse = {
  dataUrls: string[];
  seed: number;
  width: number;
  height: number;
  model: string;
};

export type GenerateContext = {
  effectiveMode: AiImageGenerationMode;
  effectivePrompt: string;
  effectiveNegative: string;
  effectiveImageCount: number;
  effectiveWidth: number;
  effectiveHeight: number;
  effectiveStrength: number;
  effectiveNoise: number;
  effectiveSourceImageBase64?: string;
  effectiveSourceImageDataUrl?: string;
  effectiveSourceImageWidth?: number;
  effectiveSourceImageHeight?: number;
  effectiveMaskBase64?: string;
  effectiveMaskDataUrl?: string;
  effectiveFocusedArea: InpaintFocusRect | null;
  effectiveOverlayOriginalImage: boolean;
  v4CharsPayload?: V4CharPayload[];
  v4UseCoordsPayload?: boolean;
  v4UseOrderPayload?: boolean;
};

type InpaintGenerateContext = {
  requestMaskBase64?: string;
  requestMaskDataUrl?: string;
  blendMaskDataUrl: string;
  resolvedCompositeMaskDataUrl: string;
  preparedInpaint: PreparedInpaintPayload | null;
  requestSourceImageBase64?: string;
  requestSourceImageWidth?: number;
  requestSourceImageHeight?: number;
  requestWidth: number;
  requestHeight: number;
  requestMaskPayloadBase64?: string;
};

type BuildGenerateContextArgs = {
  mode?: AiImageGenerationMode;
  currentMode: AiImageGenerationMode;
  uiMode: UiMode;
  simpleInfillPrompt: string;
  proInfillPrompt: string;
  simpleInfillNegativePrompt: string;
  proInfillNegativePrompt: string;
  infillAppendPrompt: string;
  prompt?: string;
  negativePrompt?: string;
  simplePrompt: string;
  promptText: string;
  simpleNegativePrompt: string;
  negativePromptText: string;
  activeStyleTags: string[];
  activeStyleNegativeTags: string[];
  width: number;
  height: number;
  strength: number;
  noise: number;
  sourceImageBase64?: string;
  sourceImageDataUrl?: string;
  sourceImageWidth?: number;
  sourceImageHeight?: number;
  maskBase64?: string;
  maskDataUrl?: string;
  focusedArea?: InpaintFocusRect | null;
  overlayOriginalImage?: boolean;
  v4Chars: V4CharEditorRow[];
  v4UseCoords: boolean;
  v4UseOrder: boolean;
};

type ResolveInpaintGenerateContextArgs = {
  context: GenerateContext;
  maskBase64?: string;
};

type ValidateGenerateContextArgs = {
  context: GenerateContext;
  inpaintContext?: InpaintGenerateContext;
  steps: number;
};

type FinalizeGenerateResultArgs = {
  context: GenerateContext;
  focusedContext: InpaintGenerateContext;
  response: GenerateImageResponse;
  toolLabel?: string;
  setResults: (value: GeneratedImageItem[]) => void;
  setSelectedResultIndex: (value: number) => void;
  setSelectedHistoryPreviewKey: (value: string | null) => void;
  uiMode: UiMode;
  seedValue?: number;
  setSimpleSeed: (value: number) => void;
  setProSeed: (value: number) => void;
};

type FinalizedGenerateResult = {
  generatedItems: GeneratedImageItem[];
  batchId: string;
  resultWidth: number;
  resultHeight: number;
};

type BuildHistoryRowsFromGenerateResultArgs = {
  generatedItems: GeneratedImageItem[];
  context: GenerateContext;
  response: GenerateImageResponse;
  resultWidth: number;
  resultHeight: number;
  steps: number;
  scale: number;
  sampler: string;
  noiseSchedule: string;
  cfgRescale: number;
  ucPreset: number;
  qualityToggle: boolean;
  cfgDelay: boolean;
  dynamicThresholding: boolean;
  toolLabel?: string;
  batchId: string;
};

type BuildOpenInpaintStateArgs = {
  selectedPreviewResult: GeneratedImageItem | null;
  dataUrlToBase64: (dataUrl: string) => string;
  uiMode: UiMode;
  simpleInfillPrompt: string;
  proInfillPrompt: string;
  simpleInfillNegativePrompt: string;
  proInfillNegativePrompt: string;
  selectedPreviewHistoryRow: AiImageHistoryRow | null;
  shouldSyncInpaintSource: boolean;
  infillMaskDataUrl: string;
  currentInfillStrength: number;
  infillFocusedArea: InpaintFocusRect | null;
  overlayOriginalImage: boolean;
};

function stripCharacterEditorRow(row: V4CharEditorRow): V4CharPayload {
  const { id: _id, gender: _gender, ...payload } = row;
  return payload;
}

function appendInfillTags(base: string, appended: string) {
  const normalizedBase = sanitizeNovelAiTagInput(base);
  const normalizedAppended = sanitizeNovelAiTagInput(appended);
  if (!normalizedAppended)
    return normalizedBase;

  const baseTags = normalizedBase
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
  const appendedTags = normalizedAppended
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
  if (!appendedTags.length)
    return normalizedBase;

  const seen = new Set(baseTags);
  const merged = [...baseTags];
  for (const tag of appendedTags) {
    if (seen.has(tag))
      continue;
    seen.add(tag);
    merged.push(tag);
  }
  return merged.join(", ");
}

export function buildGenerateContext(args: BuildGenerateContextArgs): GenerateContext {
  const effectiveMode = args.mode ?? args.currentMode;
  const infillPrompt = args.uiMode === "simple" ? args.simpleInfillPrompt : args.proInfillPrompt;
  const infillNegativePrompt = args.uiMode === "simple" ? args.simpleInfillNegativePrompt : args.proInfillNegativePrompt;
  const basePrompt = sanitizeNovelAiTagInput(String(effectiveMode === "infill"
    ? infillPrompt || DEFAULT_INPAINT_PROMPT
    : (args.prompt ?? (args.uiMode === "simple" ? args.simplePrompt : args.promptText))));
  const baseNegative = sanitizeNovelAiTagInput(String(effectiveMode === "infill"
    ? infillNegativePrompt || DEFAULT_INPAINT_NEGATIVE_PROMPT
    : (args.negativePrompt ?? (args.uiMode === "simple" ? args.simpleNegativePrompt : args.negativePromptText))));
  const mergeStyleTags = args.uiMode === "simple" && effectiveMode === "txt2img";
  const roundedRequestSize = getClosestValidImageSize(args.width, args.height);
  const effectivePrompt = effectiveMode === "infill"
    ? appendInfillTags(basePrompt, args.infillAppendPrompt)
    : (mergeStyleTags ? mergeTagString(basePrompt, args.activeStyleTags).trim() : basePrompt);

  return {
    effectiveMode,
    effectivePrompt,
    effectiveNegative: mergeStyleTags ? mergeTagString(baseNegative, args.activeStyleNegativeTags) : baseNegative,
    effectiveImageCount: NOVELAI_FREE_FIXED_IMAGE_COUNT,
    effectiveWidth: roundedRequestSize.width,
    effectiveHeight: roundedRequestSize.height,
    effectiveStrength: args.strength,
    effectiveNoise: args.noise,
    effectiveSourceImageBase64: effectiveMode === "infill" ? args.sourceImageBase64 : undefined,
    effectiveSourceImageDataUrl: effectiveMode === "infill" ? args.sourceImageDataUrl : undefined,
    effectiveSourceImageWidth: effectiveMode === "infill" ? args.sourceImageWidth : undefined,
    effectiveSourceImageHeight: effectiveMode === "infill" ? args.sourceImageHeight : undefined,
    effectiveMaskBase64: effectiveMode === "infill" ? args.maskBase64 : undefined,
    effectiveMaskDataUrl: effectiveMode === "infill" ? args.maskDataUrl : undefined,
    effectiveFocusedArea: effectiveMode === "infill" ? args.focusedArea ?? null : null,
    effectiveOverlayOriginalImage: effectiveMode === "infill" ? Boolean(args.overlayOriginalImage) : false,
    v4CharsPayload: args.uiMode === "pro" ? args.v4Chars.map(stripCharacterEditorRow) : undefined,
    v4UseCoordsPayload: args.uiMode === "pro" ? args.v4UseCoords : undefined,
    v4UseOrderPayload: args.uiMode === "pro" ? args.v4UseOrder : undefined,
  };
}

export async function resolveInpaintGenerateContext(args: ResolveInpaintGenerateContextArgs): Promise<InpaintGenerateContext> {
  const requestMaskBase64 = args.maskBase64 ?? args.context.effectiveMaskBase64;
  const requestMaskDataUrl = requestMaskBase64 ? base64DataUrl("image/png", base64ToBytes(requestMaskBase64)) : undefined;
  const resolvedCompositeMaskDataUrl = args.context.effectiveMaskDataUrl || requestMaskDataUrl || "";
  const preparedInpaint = args.context.effectiveMode === "infill"
    && args.context.effectiveSourceImageDataUrl
    && requestMaskDataUrl
    ? await prepareInpaintPayload({
        sourceDataUrl: args.context.effectiveSourceImageDataUrl,
        maskDataUrl: requestMaskDataUrl,
        focusedArea: args.context.effectiveFocusedArea,
        requestWidth: args.context.effectiveWidth,
        requestHeight: args.context.effectiveHeight,
      })
    : null;

  return {
    requestMaskBase64,
    requestMaskDataUrl,
    blendMaskDataUrl: resolvedCompositeMaskDataUrl,
    resolvedCompositeMaskDataUrl,
    preparedInpaint,
    requestSourceImageBase64: preparedInpaint?.sourceImageBase64 ?? args.context.effectiveSourceImageBase64,
    requestSourceImageWidth: preparedInpaint?.targetSize.width ?? args.context.effectiveSourceImageWidth,
    requestSourceImageHeight: preparedInpaint?.targetSize.height ?? args.context.effectiveSourceImageHeight,
    requestWidth: preparedInpaint?.targetSize.width ?? args.context.effectiveWidth,
    requestHeight: preparedInpaint?.targetSize.height ?? args.context.effectiveHeight,
    requestMaskPayloadBase64: preparedInpaint?.maskBase64 ?? requestMaskBase64,
  };
}

export function validateGenerateContext(args: ValidateGenerateContextArgs) {
  if (args.context.effectiveMode === "txt2img" && !args.context.effectivePrompt)
    throw new Error("生成前请先补全 tags。");

  const freeViolation = getNovelAiFreeGenerationViolation({
    mode: args.context.effectiveMode,
    width: args.inpaintContext?.requestWidth ?? args.context.effectiveWidth,
    height: args.inpaintContext?.requestHeight ?? args.context.effectiveHeight,
    imageCount: args.context.effectiveImageCount,
    steps: args.steps,
    sourceImageBase64: args.context.effectiveSourceImageBase64,
    sourceImageWidth: args.inpaintContext?.requestSourceImageWidth ?? args.context.effectiveSourceImageWidth,
    sourceImageHeight: args.inpaintContext?.requestSourceImageHeight ?? args.context.effectiveSourceImageHeight,
    maskBase64: args.context.effectiveMaskBase64,
  });
  if (freeViolation)
    throw new Error(freeViolation);
}

export async function finalizeGenerateResult(args: FinalizeGenerateResultArgs): Promise<FinalizedGenerateResult> {
  const resolvedDataUrls = args.focusedContext.preparedInpaint && args.context.effectiveSourceImageDataUrl && args.focusedContext.resolvedCompositeMaskDataUrl
    ? await Promise.all(args.response.dataUrls.map(async (dataUrl) => {
        return await compositeInpaintResult({
          sourceDataUrl: args.context.effectiveSourceImageDataUrl!,
          generatedDataUrl: dataUrl,
          fullMaskDataUrl: args.focusedContext.resolvedCompositeMaskDataUrl,
          cropRect: args.focusedContext.preparedInpaint!.cropRect,
          overlayOriginalImage: args.context.effectiveOverlayOriginalImage,
        });
      }))
    : args.response.dataUrls;

  const batchId = makeStableId();
  const resultWidth = args.focusedContext.preparedInpaint?.cropRect
    ? (args.context.effectiveSourceImageWidth ?? args.context.effectiveWidth)
    : args.response.width;
  const resultHeight = args.focusedContext.preparedInpaint?.cropRect
    ? (args.context.effectiveSourceImageHeight ?? args.context.effectiveHeight)
    : args.response.height;
  const generatedItems = resolvedDataUrls.map((dataUrl, batchIndex) => ({
    dataUrl,
    seed: args.response.seed,
    width: resultWidth,
    height: resultHeight,
    model: args.response.model,
    batchId,
    batchIndex,
    batchSize: resolvedDataUrls.length,
    toolLabel: args.toolLabel,
  } satisfies GeneratedImageItem));

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

export function buildHistoryRowsFromGenerateResult(args: BuildHistoryRowsFromGenerateResultArgs): Array<Omit<AiImageHistoryRow, "id">> {
  return args.generatedItems.map(item => ({
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
    cfgDelay: args.cfgDelay,
    dynamicThresholding: args.dynamicThresholding,
    strength: args.context.effectiveStrength,
    noise: args.context.effectiveNoise,
    inpaintFocusedArea: args.context.effectiveFocusedArea,
    overlayOriginalImage: args.context.effectiveOverlayOriginalImage,
    v4Chars: args.context.v4CharsPayload,
    v4UseCoords: args.context.v4UseCoordsPayload ?? false,
    v4UseOrder: args.context.v4UseOrderPayload ?? true,
    dataUrl: item.dataUrl,
    toolLabel: args.toolLabel,
    sourceDataUrl: args.context.effectiveMode === "infill"
      ? args.context.effectiveSourceImageDataUrl
      : undefined,
    batchId: args.batchId,
    batchIndex: item.batchIndex,
    batchSize: item.batchSize,
  }));
}

export function buildOpenInpaintState(args: BuildOpenInpaintStateArgs): InpaintDialogSource | null {
  const preview = args.selectedPreviewResult;
  if (!preview)
    return null;

  const sourceImageBase64 = args.dataUrlToBase64(preview.dataUrl);
  if (!sourceImageBase64)
    throw new Error("当前预览图无法转换为局部重绘底图。");

  const currentInfillPrompt = args.uiMode === "simple" ? args.simpleInfillPrompt : args.proInfillPrompt;
  const currentInfillNegativePrompt = args.uiMode === "simple" ? args.simpleInfillNegativePrompt : args.proInfillNegativePrompt;
  const sourcePrompt = String(args.selectedPreviewHistoryRow?.prompt || "").trim();
  const sourceNegativePrompt = String(args.selectedPreviewHistoryRow?.negativePrompt || "").trim();

  return {
    dataUrl: preview.dataUrl,
    imageBase64: sourceImageBase64,
    maskDataUrl: args.shouldSyncInpaintSource ? "" : args.infillMaskDataUrl,
    width: preview.width,
    height: preview.height,
    seed: preview.seed,
    model: preview.model,
    mode: args.uiMode,
    prompt: args.shouldSyncInpaintSource
      ? sourcePrompt || currentInfillPrompt || DEFAULT_INPAINT_PROMPT
      : currentInfillPrompt || sourcePrompt || DEFAULT_INPAINT_PROMPT,
    negativePrompt: args.shouldSyncInpaintSource
      ? sourceNegativePrompt || currentInfillNegativePrompt || DEFAULT_INPAINT_NEGATIVE_PROMPT
      : currentInfillNegativePrompt || sourceNegativePrompt || DEFAULT_INPAINT_NEGATIVE_PROMPT,
    strength: args.currentInfillStrength,
    focusedArea: args.shouldSyncInpaintSource ? null : args.infillFocusedArea,
    overlayOriginalImage: args.shouldSyncInpaintSource ? false : args.overlayOriginalImage,
  };
}
