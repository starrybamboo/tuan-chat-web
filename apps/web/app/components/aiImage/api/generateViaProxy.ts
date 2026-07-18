import type {
  AiImageGenerationMode,
  V4CharPayload,
  V4PromptCenter,
} from "@/components/aiImage/types";

import { resolveBackendGenerateImageUrl } from "@/components/aiImage/api/backendUrls";
import { requestNovelAiBinaryViaProxy } from "@/components/aiImage/api/requestBinary";
import {
  DEFAULT_IMAGE_MODEL,
  NOVELAI_FREE_FIXED_IMAGE_COUNT,
  NOVELAI_FREE_MAX_STEPS,
} from "@/components/aiImage/constants";
import {
  clamp01,
  clampIntRange,
  getClosestValidImageSize,
  getNovelAiFreeGenerationViolation,
  resolveInpaintModel,
  sanitizeNovelAiTagInput,
} from "@/components/aiImage/helpers";

import type { AiGenerateImageRequest } from "../../../../api/novelai/models/AiGenerateImageRequest";

const NOVELAI_V4_CFG_DELAY_SIGMA = 19;
const NOVELAI_V4_BASE_LATENT_WIDTH = 104;
const NOVELAI_V4_BASE_LATENT_HEIGHT = 152;

export function resolveNovelAiCfgDelaySigma(width: number, height: number) {
  const latentWidth = Math.max(1, Math.floor(Number(width) / 8));
  const latentHeight = Math.max(1, Math.floor(Number(height) / 8));
  const resolutionScale = Math.sqrt(
    (latentWidth * latentHeight)
    / (NOVELAI_V4_BASE_LATENT_WIDTH * NOVELAI_V4_BASE_LATENT_HEIGHT),
  );
  return NOVELAI_V4_CFG_DELAY_SIGMA * resolutionScale;
}

export async function generateNovelImageViaProxy(args: {
  mode: AiImageGenerationMode;
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
  width: number;
  height: number;
  imageCount: number;
  steps: number;
  scale: number;
  sampler: string;
  noiseSchedule: string;
  cfgRescale: number;
  ucPreset: number;
  qualityToggle: boolean;
  cfgDelay: boolean;
  dynamicThresholding: boolean;
  overlayOriginalImage?: boolean;
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
  });
  if (freeViolation)
    throw new Error(freeViolation);

  const negativePrompt = sanitizeNovelAiTagInput(String(args.negativePrompt || ""));
  const requestModel = args.mode === "infill" ? resolveInpaintModel(DEFAULT_IMAGE_MODEL) : DEFAULT_IMAGE_MODEL;

  const seed = typeof args.seed === "number" ? args.seed : Math.floor(Math.random() * 2 ** 32);
  const normalizedSize = getClosestValidImageSize(args.width, args.height);
  const width = normalizedSize.width;
  const height = normalizedSize.height;
  const imageCount = NOVELAI_FREE_FIXED_IMAGE_COUNT;

  const resolvedSampler = args.sampler === "k_euler_a" ? "k_euler_ancestral" : args.sampler;
  const normalizedSeed = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : Math.floor(Math.random() * 2 ** 32);
  const extraNoiseSeed = normalizedSeed > 0 ? normalizedSeed - 1 : 0;
  const isInfillMode = args.mode === "infill";

  const normalizedScale = Number(args.scale);
  const parameters: Record<string, unknown> = {
    seed: normalizedSeed,
    width,
    height,
    n_samples: imageCount,
    steps: clampIntRange(args.steps, 1, NOVELAI_FREE_MAX_STEPS, NOVELAI_FREE_MAX_STEPS),
    scale: normalizedScale,
    sampler: resolvedSampler,
    negative_prompt: negativePrompt,
    ucPreset: clampIntRange(args.ucPreset, 0, 2, 2),
    qualityToggle: Boolean(args.qualityToggle),
    dynamic_thresholding: Boolean(args.dynamicThresholding),
  };

  if (args.mode === "infill") {
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
    parameters.strength = 0.7;
    parameters.noise = Math.max(0, Math.min(1, noise));
    parameters.inpaintImg2ImgStrength = Math.max(0, Math.min(1, strength));
    if (parameters.inpaintImg2ImgStrength !== 1) {
      parameters.img2img = {
        strength: parameters.inpaintImg2ImgStrength,
        color_correct: true,
      };
    }
  }

  parameters.params_version = 3;
  parameters.noise_schedule = args.noiseSchedule;
  if (isInfillMode) {
    parameters.add_original_image = Boolean(args.overlayOriginalImage);
    parameters.autoSmea = false;
    parameters.normalize_reference_strength_multiple = true;
    parameters.image_format = "png";
    parameters.stream = "msgpack";
    parameters.extra_noise_seed = extraNoiseSeed;
  }

  const cfgRescale = Number.isFinite(args.cfgRescale) ? Number(args.cfgRescale) : 0;
  const useCoords = Boolean(args.v4UseCoords);
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
  parameters.reference_image_multiple = [];
  parameters.reference_information_extracted_multiple = [];
  parameters.reference_strength_multiple = [];
  parameters.skip_cfg_above_sigma = args.cfgDelay
    ? resolveNovelAiCfgDelaySigma(width, height)
    : null;
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

  const payload: AiGenerateImageRequest = {
    input: prompt,
    model: requestModel as unknown as AiGenerateImageRequest.model,
    action: (args.mode === "infill" ? "infill" : "generate") as AiGenerateImageRequest.action,
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
