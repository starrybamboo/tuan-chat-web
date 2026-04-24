import type {
  PreciseReferencePayload,
  V4CharPayload,
  V4PromptCenter,
  VibeTransferReferencePayload,
} from "@/components/aiImage/types";
import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";
import type { AiGenerateImageRequest } from "../../../../api/novelai/models/AiGenerateImageRequest";

import {
  DEFAULT_IMAGE_MODEL,
  NOVELAI_FREE_FIXED_IMAGE_COUNT,
  NOVELAI_FREE_MAX_STEPS,
} from "@/components/aiImage/constants";
import {
  clamp01,
  clampIntRange,
  clampRange,
  getClosestValidImageSize,
  getNovelAiFreeGenerationViolation,
  isNaiV4Family,
  resolveInpaintModel,
  sanitizeNovelAiTagInput,
} from "@/components/aiImage/helpers";
import { resolveBackendGenerateImageUrl } from "@/components/aiImage/api/backendUrls";
import { requestNovelAiBinaryViaProxy } from "@/components/aiImage/api/requestBinary";

export async function generateNovelImageViaProxy(args: {
  mode: AiImageHistoryMode;
  sourceImageBase64?: string;
  sourceImageWidth?: number;
  sourceImageHeight?: number;
  maskBase64?: string;
  strength: number;
  noise: number;
  prompt?: string;
  negativePrompt: string;
  v4Chars?: V4CharPayload[];
  v4UseCoords?: boolean;
  v4UseOrder?: boolean;
  vibeTransferReferences?: VibeTransferReferencePayload[];
  preciseReference?: PreciseReferencePayload | null;
  model: string;
  width: number;
  height: number;
  imageCount: number;
  steps: number;
  scale: number;
  sampler: string;
  noiseSchedule: string;
  cfgRescale: number;
  ucPreset: number;
  smea: boolean;
  smeaDyn: boolean;
  qualityToggle: boolean;
  dynamicThresholding: boolean;
  seed?: number;
}) {
  const prompt = sanitizeNovelAiTagInput(String(args.prompt || ""));
  if (!prompt && args.prompt == null)
    throw new Error("缺少 prompt。");

  const freeViolation = getNovelAiFreeGenerationViolation({
    mode: args.mode,
    width: args.width,
    height: args.height,
    imageCount: args.imageCount,
    steps: args.steps,
    sourceImageBase64: args.sourceImageBase64,
    sourceImageWidth: args.sourceImageWidth,
    sourceImageHeight: args.sourceImageHeight,
    maskBase64: args.maskBase64,
    vibeTransferReferenceCount: args.vibeTransferReferences?.length ?? 0,
    hasPreciseReference: Boolean(args.preciseReference),
  });
  if (freeViolation)
    throw new Error(freeViolation);

  const negativePrompt = sanitizeNovelAiTagInput(String(args.negativePrompt || ""));
  const model = String(args.model || DEFAULT_IMAGE_MODEL);
  const requestModel = args.mode === "infill" ? resolveInpaintModel(model) : model;

  const isNAI3 = requestModel === "nai-diffusion-3";
  const isNAI4 = isNaiV4Family(requestModel);

  const seed = typeof args.seed === "number" ? args.seed : Math.floor(Math.random() * 2 ** 32);
  const normalizedSize = getClosestValidImageSize(args.width, args.height);
  const width = normalizedSize.width;
  const height = normalizedSize.height;
  const imageCount = NOVELAI_FREE_FIXED_IMAGE_COUNT;

  const resolvedSampler = args.sampler === "k_euler_a" ? "k_euler_ancestral" : args.sampler;
  const normalizedSeed = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : Math.floor(Math.random() * 2 ** 32);
  const extraNoiseSeed = normalizedSeed > 0 ? normalizedSeed - 1 : 0;
  const isInfillMode = args.mode === "infill";

  const parameters: Record<string, any> = {
    seed: normalizedSeed,
    width,
    height,
    n_samples: imageCount,
    steps: clampIntRange(args.steps, 1, NOVELAI_FREE_MAX_STEPS, NOVELAI_FREE_MAX_STEPS),
    scale: Number(args.scale),
    sampler: resolvedSampler,
    negative_prompt: negativePrompt,
    ucPreset: clampIntRange(args.ucPreset, 0, 2, 2),
    qualityToggle: isInfillMode ? true : Boolean(args.qualityToggle),
    dynamic_thresholding: Boolean(args.dynamicThresholding),
  };

  if (args.mode === "img2img") {
    const imageBase64 = String(args.sourceImageBase64 || "").trim();
    if (!imageBase64)
      throw new Error("img2img 缺少源图（sourceImageBase64）。");

    const strength = Number.isFinite(args.strength) ? Number(args.strength) : 0.7;
    const noise = Number.isFinite(args.noise) ? Number(args.noise) : 0.2;
    parameters.image = imageBase64;
    parameters.strength = Math.max(0, Math.min(1, strength));
    parameters.noise = Math.max(0, Math.min(1, noise));
  }
  else if (args.mode === "infill") {
    const imageBase64 = String(args.sourceImageBase64 || "").trim();
    const maskBase64 = String(args.maskBase64 || "").trim();
    if (!imageBase64)
      throw new Error("infill 缺少源图（sourceImageBase64）。");
    if (!maskBase64)
      throw new Error("infill 缺少蒙版（maskBase64）。");

    const strength = Number.isFinite(args.strength) ? Number(args.strength) : 0.7;
    const noise = Number.isFinite(args.noise) ? Number(args.noise) : 0.2;
    parameters.image = imageBase64;
    parameters.mask = maskBase64;
    parameters.strength = Math.max(0, Math.min(1, strength));
    parameters.noise = Math.max(0, Math.min(1, noise));
    parameters.inpaintImg2ImgStrength = Math.max(0, Math.min(1, strength));
    parameters.img2img = {
      strength: parameters.inpaintImg2ImgStrength,
      color_correct: true,
    };
  }

  if (isNAI3 || isNAI4) {
    parameters.params_version = 3;
    parameters.legacy = false;
    parameters.legacy_v3_extend = false;
    parameters.noise_schedule = args.noiseSchedule;
    if (isInfillMode) {
      parameters.add_original_image = false;
      parameters.autoSmea = false;
      parameters.legacy_uc = false;
      parameters.normalize_reference_strength_multiple = true;
      parameters.image_format = "png";
      parameters.stream = "msgpack";
      parameters.extra_noise_seed = extraNoiseSeed;
    }

    if (isNAI4) {
      const cfgRescale = Number.isFinite(args.cfgRescale) ? Number(args.cfgRescale) : 0;
      const useCoords = isInfillMode ? true : Boolean(args.v4UseCoords);
      const useOrder = args.v4UseOrder == null ? true : Boolean(args.v4UseOrder);
      const v4Chars = Array.isArray(args.v4Chars) ? args.v4Chars : [];
      const charCenters: V4PromptCenter[] = [];
      const charCaptionsPositive = v4Chars.map((item) => {
        const center: V4PromptCenter = {
          x: clamp01(item.centerX, 0.5),
          y: clamp01(item.centerY, 0.5),
        };
        charCenters.push(center);
        return {
          char_caption: sanitizeNovelAiTagInput(String(item.prompt || "")),
          centers: [center],
        };
      });
      const charCaptionsNegative = v4Chars.map((item, index) => {
        const center = charCenters[index] || { x: 0.5, y: 0.5 };
        return {
          char_caption: sanitizeNovelAiTagInput(String(item.negativePrompt || "")),
          centers: [center],
        };
      });

      parameters.cfg_rescale = cfgRescale;
      parameters.characterPrompts = [];
      parameters.controlnet_strength = 1;
      parameters.deliberate_euler_ancestral_bug = false;
      parameters.prefer_brownian = true;
      parameters.reference_image_multiple = (args.vibeTransferReferences || []).map(item => item.imageBase64);
      parameters.reference_information_extracted_multiple = (args.vibeTransferReferences || []).map(item => clampRange(item.informationExtracted, 0, 1, 1));
      parameters.reference_strength_multiple = (args.vibeTransferReferences || []).map(item => clampRange(item.strength, 0, 1, 1));
      if (args.preciseReference?.imageBase64) {
        parameters.reference_image = args.preciseReference.imageBase64;
        parameters.reference_strength = clampRange(args.preciseReference.strength, 0, 1, 1);
        parameters.reference_information_extracted = clampRange(args.preciseReference.informationExtracted, 0, 1, 1);
      }
      parameters.skip_cfg_above_sigma = null;
      parameters.use_coords = useCoords;
      parameters.v4_prompt = {
        caption: {
          base_caption: prompt,
          char_captions: charCaptionsPositive,
        },
        use_coords: parameters.use_coords,
        use_order: useOrder,
      };
      parameters.v4_negative_prompt = {
        caption: {
          base_caption: negativePrompt,
          char_captions: charCaptionsNegative,
        },
      };
    }
    else if (isNAI3) {
      const smea = Boolean(args.smea);
      const smeaDyn = Boolean(args.smeaDyn);
      parameters.sm_dyn = smeaDyn;
      parameters.sm = smea || smeaDyn;

      if (
        (resolvedSampler === "k_euler_ancestral" || resolvedSampler === "k_dpmpp_2s_ancestral")
        && args.noiseSchedule === "karras"
      ) {
        parameters.noise_schedule = "native";
      }
      if (resolvedSampler === "ddim_v3") {
        parameters.sm = false;
        parameters.sm_dyn = false;
        delete parameters.noise_schedule;
      }
      if (Number.isFinite(parameters.scale) && parameters.scale > 10)
        parameters.scale = parameters.scale / 2;
    }
  }

  const payload: AiGenerateImageRequest = {
    input: prompt,
    model: requestModel as unknown as AiGenerateImageRequest.model,
    action: (args.mode === "img2img"
      ? "img2img"
      : args.mode === "infill"
        ? "infill"
        : "generate") as AiGenerateImageRequest.action,
    parameters,
  };

  const requestUrl = resolveBackendGenerateImageUrl();
  console.warn("[ai-image] request generate-image via backend", {
    requestUrl,
    action: payload.action,
    model: payload.model,
  });
  const dataUrls = await requestNovelAiBinaryViaProxy(requestUrl, payload, { multipart: true });
  return { dataUrls, seed, width, height, model: requestModel };
}
