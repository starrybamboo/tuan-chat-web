import type { Crop, PixelCrop } from "react-image-crop";

import type { AvatarCropContext, RoleAvatarVariantCompositionConfig, SpriteCropContext, SpriteTransform } from "api";

type ImageDimensions = {
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
};

export function createAvatarCropContextFromImage(
  crop: PixelCrop | undefined,
  image: ImageDimensions | undefined | null,
  sourceSpriteFileId?: number,
): AvatarCropContext | undefined {
  if (!crop || !image?.naturalWidth || !image.naturalHeight || !image.width || !image.height) {
    return undefined;
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  return createAvatarCropContextFromSource(crop, image.naturalWidth, image.naturalHeight, scaleX, scaleY, sourceSpriteFileId);
}

export function createAvatarCropContextFromSource(
  crop: PixelCrop,
  sourceWidth: number,
  sourceHeight: number,
  scaleX = 1,
  scaleY = 1,
  sourceSpriteFileId?: number,
): AvatarCropContext | undefined {
  if (!sourceWidth || !sourceHeight || !crop.width || !crop.height) {
    return undefined;
  }

  return {
    sourceSpriteFileId,
    sourceWidth: Math.round(sourceWidth),
    sourceHeight: Math.round(sourceHeight),
    crop: {
      x: normalizeCropNumber(crop.x * scaleX),
      y: normalizeCropNumber(crop.y * scaleY),
      width: normalizeCropNumber(crop.width * scaleX),
      height: normalizeCropNumber(crop.height * scaleY),
    },
  };
}

export function createSpriteCropContextFromImage(
  crop: PixelCrop | undefined,
  image: ImageDimensions | undefined | null,
  sourceOriginFileId?: number,
): SpriteCropContext | undefined {
  if (!crop || !image?.naturalWidth || !image.naturalHeight || !image.width || !image.height) {
    return undefined;
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  return createSpriteCropContextFromSource(
    crop,
    image.naturalWidth,
    image.naturalHeight,
    scaleX,
    scaleY,
    sourceOriginFileId,
  );
}

export function createSpriteCropContextFromSource(
  crop: PixelCrop,
  sourceWidth: number,
  sourceHeight: number,
  scaleX = 1,
  scaleY = 1,
  sourceOriginFileId?: number,
): SpriteCropContext | undefined {
  if (!sourceWidth || !sourceHeight || !crop.width || !crop.height) {
    return undefined;
  }

  const normalizedCrop = {
    x: normalizeCropNumber(crop.x * scaleX),
    y: normalizeCropNumber(crop.y * scaleY),
    width: normalizeCropNumber(crop.width * scaleX),
    height: normalizeCropNumber(crop.height * scaleY),
  };

  return {
    sourceOriginFileId,
    sourceWidth: Math.round(sourceWidth),
    sourceHeight: Math.round(sourceHeight),
    crop: normalizedCrop,
    outputWidth: Math.round(normalizedCrop.width),
    outputHeight: Math.round(normalizedCrop.height),
  };
}

export function createVariantCompositionConfigFromAvatarCropContext(
  context: AvatarCropContext | undefined,
  spriteCropContext?: SpriteCropContext,
  spriteTransform?: SpriteTransform,
): RoleAvatarVariantCompositionConfig | undefined {
  if (!context?.sourceWidth || !context.sourceHeight || !context.crop?.width || !context.crop.height) {
    return undefined;
  }

  return {
    mode: "sprite_avatar_overlay",
    canvas: {
      width: Math.round(context.sourceWidth),
      height: Math.round(context.sourceHeight),
    },
    avatarSlot: {
      x: normalizeCropNumber(context.crop.x ?? 0),
      y: normalizeCropNumber(context.crop.y ?? 0),
      width: normalizeCropNumber(context.crop.width),
      height: normalizeCropNumber(context.crop.height),
    },
    spriteCrop: createVariantSpriteCropConfig(spriteCropContext),
    spriteTransform: normalizeVariantSpriteTransform(spriteTransform),
    output: {
      format: "webp",
    },
  };
}

export function createAvatarCropContextFromVariantConfig(
  config: RoleAvatarVariantCompositionConfig | undefined,
  sourceSpriteFileId?: number,
): AvatarCropContext | undefined {
  const canvas = normalizeVariantCanvas(config);
  const slot = normalizeVariantAvatarSlot(config);
  if (!canvas || !slot) {
    return undefined;
  }

  return {
    sourceSpriteFileId,
    sourceWidth: canvas.width,
    sourceHeight: canvas.height,
    crop: slot,
  };
}

export function createSpriteCropContextFromVariantConfig(
  config: RoleAvatarVariantCompositionConfig | undefined,
  sourceOriginFileId?: number,
): SpriteCropContext | undefined {
  const spriteCrop = normalizeVariantSpriteCrop(config);
  if (!spriteCrop) {
    return undefined;
  }

  return {
    sourceOriginFileId,
    sourceWidth: spriteCrop.sourceWidth,
    sourceHeight: spriteCrop.sourceHeight,
    crop: spriteCrop.crop,
    outputWidth: spriteCrop.outputWidth,
    outputHeight: spriteCrop.outputHeight,
  };
}

export function createSpriteTransformFromVariantConfig(
  config: RoleAvatarVariantCompositionConfig | undefined,
): SpriteTransform | undefined {
  return normalizeVariantSpriteTransform(config?.spriteTransform);
}

export function getVariantSpriteOutputSize(config: RoleAvatarVariantCompositionConfig | undefined) {
  const canvas = normalizeVariantCanvas(config);
  if (!canvas) {
    return undefined;
  }
  return canvas;
}

export function isImageCompatibleWithVariantConfig(
  config: RoleAvatarVariantCompositionConfig | undefined,
  image: Pick<ImageDimensions, "naturalWidth" | "naturalHeight"> | undefined | null,
): boolean {
  const canvas = normalizeVariantCanvas(config);
  if (!canvas || !image?.naturalWidth || !image.naturalHeight) {
    return false;
  }
  return Math.round(image.naturalWidth) === canvas.width
    && Math.round(image.naturalHeight) === canvas.height;
}

export function isOriginImageCompatibleWithVariantConfig(
  config: RoleAvatarVariantCompositionConfig | undefined,
  image: Pick<ImageDimensions, "naturalWidth" | "naturalHeight"> | undefined | null,
): boolean {
  const spriteCrop = normalizeVariantSpriteCrop(config);
  if (!spriteCrop || !image?.naturalWidth || !image.naturalHeight) {
    return false;
  }
  return Math.round(image.naturalWidth) === spriteCrop.sourceWidth
    && Math.round(image.naturalHeight) === spriteCrop.sourceHeight;
}

export function createPixelSpriteCropFromVariantConfig(
  config: RoleAvatarVariantCompositionConfig | undefined,
  image: ImageDimensions | undefined | null,
): { crop: Crop; pixelCrop: PixelCrop } | undefined {
  const spriteCrop = normalizeVariantSpriteCrop(config);
  if (!spriteCrop || !image?.width || !image.height || !isOriginImageCompatibleWithVariantConfig(config, image)) {
    return undefined;
  }

  const scaleX = image.width / spriteCrop.sourceWidth;
  const scaleY = image.height / spriteCrop.sourceHeight;
  const pixelCrop: PixelCrop = {
    unit: "px",
    x: normalizeCropNumber(spriteCrop.crop.x * scaleX),
    y: normalizeCropNumber(spriteCrop.crop.y * scaleY),
    width: normalizeCropNumber(spriteCrop.crop.width * scaleX),
    height: normalizeCropNumber(spriteCrop.crop.height * scaleY),
  };

  return {
    crop: {
      unit: "%",
      x: normalizeCropNumber((pixelCrop.x / image.width) * 100),
      y: normalizeCropNumber((pixelCrop.y / image.height) * 100),
      width: normalizeCropNumber((pixelCrop.width / image.width) * 100),
      height: normalizeCropNumber((pixelCrop.height / image.height) * 100),
    },
    pixelCrop,
  };
}

export function createPixelCropFromVariantConfig(
  config: RoleAvatarVariantCompositionConfig | undefined,
  image: ImageDimensions | undefined | null,
): { crop: Crop; pixelCrop: PixelCrop } | undefined {
  const canvas = normalizeVariantCanvas(config);
  const slot = normalizeVariantAvatarSlot(config);
  if (!canvas || !slot || !image?.width || !image.height || !isImageCompatibleWithVariantConfig(config, image)) {
    return undefined;
  }

  const scaleX = image.width / canvas.width;
  const scaleY = image.height / canvas.height;
  const pixelCrop: PixelCrop = {
    unit: "px",
    x: normalizeCropNumber(slot.x * scaleX),
    y: normalizeCropNumber(slot.y * scaleY),
    width: normalizeCropNumber(slot.width * scaleX),
    height: normalizeCropNumber(slot.height * scaleY),
  };

  return {
    crop: {
      unit: "%",
      x: normalizeCropNumber((pixelCrop.x / image.width) * 100),
      y: normalizeCropNumber((pixelCrop.y / image.height) * 100),
      width: normalizeCropNumber((pixelCrop.width / image.width) * 100),
      height: normalizeCropNumber((pixelCrop.height / image.height) * 100),
    },
    pixelCrop,
  };
}

function normalizeVariantCanvas(config: RoleAvatarVariantCompositionConfig | undefined) {
  const width = normalizePositiveInteger(config?.canvas?.width);
  const height = normalizePositiveInteger(config?.canvas?.height);
  if (!width || !height) {
    return undefined;
  }
  return { width, height };
}

function normalizeVariantAvatarSlot(config: RoleAvatarVariantCompositionConfig | undefined) {
  const x = normalizeFiniteNumber(config?.avatarSlot?.x);
  const y = normalizeFiniteNumber(config?.avatarSlot?.y);
  const width = normalizePositiveNumber(config?.avatarSlot?.width);
  const height = normalizePositiveNumber(config?.avatarSlot?.height);
  if (x == null || y == null || width == null || height == null) {
    return undefined;
  }
  return { x, y, width, height };
}

function createVariantSpriteCropConfig(spriteCropContext: SpriteCropContext | undefined) {
  const sourceWidth = normalizePositiveInteger(spriteCropContext?.sourceWidth);
  const sourceHeight = normalizePositiveInteger(spriteCropContext?.sourceHeight);
  const crop = normalizeContextCrop(spriteCropContext?.crop);
  const outputWidth = normalizePositiveInteger(spriteCropContext?.outputWidth) ?? (crop ? Math.round(crop.width) : undefined);
  const outputHeight = normalizePositiveInteger(spriteCropContext?.outputHeight) ?? (crop ? Math.round(crop.height) : undefined);
  if (!sourceWidth || !sourceHeight || !crop || !outputWidth || !outputHeight) {
    return undefined;
  }

  return {
    sourceOriginFileId: normalizePositiveInteger(spriteCropContext?.sourceOriginFileId),
    sourceWidth,
    sourceHeight,
    crop,
    outputWidth,
    outputHeight,
  };
}

function normalizeVariantSpriteCrop(config: RoleAvatarVariantCompositionConfig | undefined) {
  const sourceWidth = normalizePositiveInteger(config?.spriteCrop?.sourceWidth);
  const sourceHeight = normalizePositiveInteger(config?.spriteCrop?.sourceHeight);
  const crop = normalizeContextCrop(config?.spriteCrop?.crop);
  const outputWidth = normalizePositiveInteger(config?.spriteCrop?.outputWidth) ?? (crop ? Math.round(crop.width) : undefined);
  const outputHeight = normalizePositiveInteger(config?.spriteCrop?.outputHeight) ?? (crop ? Math.round(crop.height) : undefined);
  if (!sourceWidth || !sourceHeight || !crop || !outputWidth || !outputHeight) {
    return undefined;
  }
  return {
    sourceOriginFileId: normalizePositiveInteger(config?.spriteCrop?.sourceOriginFileId),
    sourceWidth,
    sourceHeight,
    crop,
    outputWidth,
    outputHeight,
  };
}

function normalizeVariantSpriteTransform(transform: SpriteTransform | undefined): SpriteTransform {
  return {
    positionX: normalizeFiniteNumber(transform?.positionX) ?? 0,
    positionY: normalizeFiniteNumber(transform?.positionY) ?? 0,
    scale: normalizePositiveNumber(transform?.scale) ?? 1,
    alpha: normalizeFiniteNumber(transform?.alpha) ?? 1,
    rotation: normalizeFiniteNumber(transform?.rotation) ?? 0,
  };
}

function normalizeContextCrop(crop: { x?: number; y?: number; width?: number; height?: number } | undefined) {
  const x = normalizeFiniteNumber(crop?.x);
  const y = normalizeFiniteNumber(crop?.y);
  const width = normalizePositiveNumber(crop?.width);
  const height = normalizePositiveNumber(crop?.height);
  if (x == null || y == null || width == null || height == null) {
    return undefined;
  }
  return { x, y, width, height };
}

function normalizePositiveInteger(value: unknown): number | undefined {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) {
    return undefined;
  }
  return Math.round(raw);
}

function normalizePositiveNumber(value: unknown): number | undefined {
  const raw = normalizeFiniteNumber(value);
  return raw != null && raw > 0 ? raw : undefined;
}

function normalizeFiniteNumber(value: unknown): number | undefined {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw)) {
    return undefined;
  }
  return normalizeCropNumber(raw);
}

function normalizeCropNumber(value: number): number {
  return Number(value.toFixed(4));
}
