import type { PreparedFocusedInpaintPayload } from "@/components/aiImage/inpaintFocusUtils";
import type {
  GeneratedImageItem,
  InpaintDialogSource,
  PreciseReferencePayload,
  PreciseReferenceRow,
  UiMode,
  V4CharEditorRow,
  V4CharPayload,
  VibeTransferReferencePayload,
  VibeTransferReferenceRow,
} from "@/components/aiImage/types";
import type { AiImageHistoryMode, AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

import {
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
  normalizeReferenceStrengthRows,
  sanitizeNovelAiTagInput,
} from "@/components/aiImage/helpers";
import { compositeFocusedInpaintResult, prepareFocusedInpaintPayload } from "@/components/aiImage/inpaintFocusUtils";

const DEFAULT_INPAINT_PROMPT = "very aesthetic, masterpiece, no text";
const DEFAULT_INPAINT_NEGATIVE_PROMPT = "nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page";

type GenerateImageResponse = {
  dataUrls: string[];
  seed: number;
  width: number;
  height: number;
  model: string;
};

type GenerateRequestOverrides = {
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
};

export type GenerateContext = {
  effectiveMode: AiImageHistoryMode;
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
  v4CharsPayload?: V4CharPayload[];
  v4UseCoordsPayload?: boolean;
  v4UseOrderPayload?: boolean;
  resolvedVibeTransferReferences: VibeTransferReferenceRow[];
  vibeTransferPayload?: VibeTransferReferencePayload[];
  preciseReferencePayload: PreciseReferencePayload | null;
};

export type FocusedGenerateContext = {
  requestMaskBase64?: string;
  requestMaskDataUrl?: string;
  blendMaskDataUrl: string;
  resolvedCompositeMaskDataUrl: string;
  focusedInpaint: PreparedFocusedInpaintPayload | null;
  requestSourceImageBase64?: string;
  requestSourceImageWidth?: number;
  requestSourceImageHeight?: number;
  requestWidth: number;
  requestHeight: number;
  requestMaskPayloadBase64?: string;
};

type BuildGenerateContextArgs = {
  mode?: AiImageHistoryMode;
  currentMode: AiImageHistoryMode;
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
  isNAI4: boolean;
  v4Chars: V4CharEditorRow[];
  v4UseCoords: boolean;
  v4UseOrder: boolean;
  normalizeReferenceStrengths: boolean;
  vibeTransferReferences: VibeTransferReferenceRow[];
  preciseReference: PreciseReferenceRow | null;
};

type ResolveFocusedGenerateContextArgs = {
  context: GenerateContext;
  maskBase64?: string;
  uiMode: UiMode;
  resolveSeparatedInfillMaskBase64ForUi: (targetUiMode: UiMode) => Promise<string>;
  resolveBlendInfillMaskDataUrlForUi: (targetUiMode: UiMode) => Promise<string>;
};

type ValidateGenerateContextArgs = {
  context: GenerateContext;
  steps: number;
};

type FinalizeGenerateResultArgs = {
  context: GenerateContext;
  focusedContext: FocusedGenerateContext;
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
  dynamicThresholding: boolean;
  smea: boolean;
  smeaDyn: boolean;
  preciseReference: PreciseReferenceRow | null;
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
  shouldSyncBaseImage: boolean;
  infillMaskDataUrl: string;
  currentInfillStrength: number;
};

function stripCharacterEditorRow(row: V4CharEditorRow): V4CharPayload {
  const { id: _id, gender: _gender, ...payload } = row;
  return payload;
}

function stripReferenceEditorRow(row: VibeTransferReferenceRow): VibeTransferReferencePayload {
  const {
    id: _id,
    dataUrl: _dataUrl,
    name: _name,
    lockInformationExtracted: _lockInformationExtracted,
    ...payload
  } = row;
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
  const resolvedVibeTransferReferences = args.uiMode === "pro" && args.isNAI4
    ? (args.normalizeReferenceStrengths ? normalizeReferenceStrengthRows(args.vibeTransferReferences) : args.vibeTransferReferences)
    : [];
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
    effectiveSourceImageBase64: effectiveMode === "img2img" || effectiveMode === "infill" ? args.sourceImageBase64 : undefined,
    effectiveSourceImageDataUrl: effectiveMode === "img2img" || effectiveMode === "infill" ? args.sourceImageDataUrl : undefined,
    effectiveSourceImageWidth: effectiveMode === "img2img" || effectiveMode === "infill" ? args.sourceImageWidth : undefined,
    effectiveSourceImageHeight: effectiveMode === "img2img" || effectiveMode === "infill" ? args.sourceImageHeight : undefined,
    effectiveMaskBase64: effectiveMode === "infill" ? args.maskBase64 : undefined,
    v4CharsPayload: args.isNAI4 && args.uiMode === "pro" ? args.v4Chars.map(stripCharacterEditorRow) : undefined,
    v4UseCoordsPayload: args.uiMode === "pro" ? args.v4UseCoords : undefined,
    v4UseOrderPayload: args.uiMode === "pro" ? args.v4UseOrder : undefined,
    resolvedVibeTransferReferences,
    vibeTransferPayload: args.uiMode === "pro" && args.isNAI4
      ? resolvedVibeTransferReferences.map(stripReferenceEditorRow)
      : undefined,
    preciseReferencePayload: args.uiMode === "pro" && args.isNAI4 && args.preciseReference
      ? {
          imageBase64: args.preciseReference.imageBase64,
          strength: args.preciseReference.strength,
          informationExtracted: args.preciseReference.informationExtracted,
        }
      : null,
  };
}

export async function resolveFocusedGenerateContext(args: ResolveFocusedGenerateContextArgs): Promise<FocusedGenerateContext> {
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

export function validateGenerateContext(args: ValidateGenerateContextArgs) {
  if (args.context.effectiveMode === "txt2img" && !args.context.effectivePrompt)
    throw new Error("生成前请先补全 tags。");

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

export async function finalizeGenerateResult(args: FinalizeGenerateResultArgs): Promise<FinalizedGenerateResult> {
  const resolvedDataUrls = args.focusedContext.focusedInpaint && args.context.effectiveSourceImageDataUrl && args.focusedContext.resolvedCompositeMaskDataUrl
    ? await Promise.all(args.response.dataUrls.map(async (dataUrl) => {
        return await compositeFocusedInpaintResult({
          sourceDataUrl: args.context.effectiveSourceImageDataUrl!,
          generatedCropDataUrl: dataUrl,
          fullMaskDataUrl: args.focusedContext.resolvedCompositeMaskDataUrl,
          cropRect: args.focusedContext.focusedInpaint!.cropRect,
        });
      }))
    : args.response.dataUrls;

  const batchId = makeStableId();
  const resultWidth = args.focusedContext.focusedInpaint
    ? (args.context.effectiveSourceImageWidth ?? args.context.effectiveWidth)
    : args.response.width;
  const resultHeight = args.focusedContext.focusedInpaint
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
    dynamicThresholding: args.dynamicThresholding,
    smea: args.smea,
    smeaDyn: args.smeaDyn,
    strength: args.context.effectiveStrength,
    noise: args.context.effectiveNoise,
    v4Chars: args.context.v4CharsPayload,
    v4UseCoords: args.context.v4UseCoordsPayload ?? false,
    v4UseOrder: args.context.v4UseOrderPayload ?? true,
    referenceImages: args.context.vibeTransferPayload?.map((reference, index) => ({
      ...reference,
      name: args.context.resolvedVibeTransferReferences[index]?.name ?? "",
      dataUrl: args.context.resolvedVibeTransferReferences[index]?.dataUrl ?? "",
    })),
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
    sourceDataUrl: args.context.effectiveMode === "img2img" || args.context.effectiveMode === "infill"
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
