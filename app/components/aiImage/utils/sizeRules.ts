import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";

import {
  AVAILABLE_MODEL_OPTIONS,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_PRO_IMAGE_SETTINGS,
  NOVELAI_DIMENSION_MIN,
  NOVELAI_DIMENSION_STEP,
  NOVELAI_FREE_FIXED_IMAGE_COUNT,
  NOVELAI_FREE_MAX_IMAGE_AREA,
  NOVELAI_FREE_MAX_STEPS,
  NOVELAI_FREE_ONLY_NOTICE,
} from "@/components/aiImage/constants";

export function clampToMultipleOf64(value: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0)
    return fallback;
  return Math.max(NOVELAI_DIMENSION_MIN, Math.round(num / NOVELAI_DIMENSION_STEP) * NOVELAI_DIMENSION_STEP);
}

export function getNovelAiImageArea(width: number, height: number) {
  const normalizedWidth = Math.max(0, Math.floor(Number(width) || 0));
  const normalizedHeight = Math.max(0, Math.floor(Number(height) || 0));
  return normalizedWidth * normalizedHeight;
}

export function isNovelAiImageAreaWithinLimit(width: number, height: number) {
  return getNovelAiImageArea(width, height) <= NOVELAI_FREE_MAX_IMAGE_AREA;
}

export function clampSimpleModeDimension(value: number, otherDimension: number, fallback: number) {
  const normalizedOther = clampToMultipleOf64(otherDimension, fallback);
  const normalizedValue = clampToMultipleOf64(value, fallback);
  const maxByArea = Math.max(
    NOVELAI_DIMENSION_MIN,
    Math.floor(NOVELAI_FREE_MAX_IMAGE_AREA / Math.max(NOVELAI_DIMENSION_MIN, normalizedOther) / NOVELAI_DIMENSION_STEP) * NOVELAI_DIMENSION_STEP,
  );
  return Math.max(NOVELAI_DIMENSION_MIN, Math.min(normalizedValue, maxByArea));
}

export function getClosestValidImageSize(rawWidth: number, rawHeight: number) {
  return {
    width: clampToMultipleOf64(rawWidth, DEFAULT_PRO_IMAGE_SETTINGS.width),
    height: clampToMultipleOf64(rawHeight, DEFAULT_PRO_IMAGE_SETTINGS.height),
  };
}

export function fitNovelAiImageSizeWithinAreaLimit(rawWidth: number, rawHeight: number) {
  let { width, height } = getClosestValidImageSize(rawWidth, rawHeight);
  if (isNovelAiImageAreaWithinLimit(width, height))
    return { width, height };

  const area = getNovelAiImageArea(width, height);
  const scale = Math.sqrt(NOVELAI_FREE_MAX_IMAGE_AREA / Math.max(1, area));
  width = clampToMultipleOf64(width * scale, DEFAULT_PRO_IMAGE_SETTINGS.width);
  height = clampToMultipleOf64(height * scale, DEFAULT_PRO_IMAGE_SETTINGS.height);

  while (!isNovelAiImageAreaWithinLimit(width, height)) {
    if (width >= height && width > NOVELAI_DIMENSION_MIN) {
      width -= NOVELAI_DIMENSION_STEP;
      continue;
    }
    if (height > NOVELAI_DIMENSION_MIN) {
      height -= NOVELAI_DIMENSION_STEP;
      continue;
    }
    break;
  }

  return {
    width: Math.max(NOVELAI_DIMENSION_MIN, width),
    height: Math.max(NOVELAI_DIMENSION_MIN, height),
  };
}

export function getNovelAiFreeOnlyMessage(detail?: string) {
  const suffix = String(detail || "").trim();
  return suffix ? `${NOVELAI_FREE_ONLY_NOTICE} ${suffix}` : NOVELAI_FREE_ONLY_NOTICE;
}

export function getNovelAiFreeGenerationViolation(args: {
  mode: AiImageHistoryMode;
  width: number;
  height: number;
  imageCount: number;
  steps: number;
  sourceImageBase64?: string;
  sourceImageWidth?: number;
  sourceImageHeight?: number;
  maskBase64?: string;
  vibeTransferReferenceCount?: number;
  hasPreciseReference?: boolean;
}) {
  if (args.mode === "infill") {
    if (!String(args.sourceImageBase64 || "").trim())
      return "Inpaint 缺少源图。";
    if (!String(args.maskBase64 || "").trim())
      return "Inpaint 缺少蒙版。";
  }
  else if (args.mode === "img2img") {
    if (!String(args.sourceImageBase64 || "").trim())
      return "Base Img 缺少源图。";
  }
  else if (args.mode !== "txt2img") {
    return getNovelAiFreeOnlyMessage("当前模式暂未开放。");
  }
  const sourceImageWidth = Math.floor(Number(args.sourceImageWidth));
  const sourceImageHeight = Math.floor(Number(args.sourceImageHeight));
  if (
    Number.isFinite(sourceImageWidth)
    && Number.isFinite(sourceImageHeight)
    && !isNovelAiImageAreaWithinLimit(sourceImageWidth, sourceImageHeight)
  ) {
    return getNovelAiFreeOnlyMessage("导入图像总面积不能超过 1024x1024。");
  }
  if ((args.vibeTransferReferenceCount ?? 0) > 0 || args.hasPreciseReference)
    return getNovelAiFreeOnlyMessage("Reference Image、Vibe Transfer、Precise Reference 已禁用。");
  if (args.imageCount !== NOVELAI_FREE_FIXED_IMAGE_COUNT)
    return getNovelAiFreeOnlyMessage("当前仅允许单张生成。");
  if (args.steps > NOVELAI_FREE_MAX_STEPS)
    return getNovelAiFreeOnlyMessage("当前仅允许 steps <= 28。");
  if (!isNovelAiImageAreaWithinLimit(args.width, args.height))
    return getNovelAiFreeOnlyMessage("当前仅允许宽高乘积不超过 1024x1024。");
  return null;
}

export function resolveFixedImageModel() {
  if (AVAILABLE_MODEL_OPTIONS.includes(DEFAULT_IMAGE_MODEL))
    return DEFAULT_IMAGE_MODEL;
  return AVAILABLE_MODEL_OPTIONS[0];
}
