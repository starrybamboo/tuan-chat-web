import type { RoleAvatar, RoleAvatarVariant, RoleAvatarVariantCompositionConfig } from "../../api";

import { hashString } from "./realtimeRendererFileNames";

export type FigureCompositionAvatar = Pick<
  RoleAvatar,
  "avatarId" | "roleId" | "variantId" | "variantGroup" | "spriteFileId" | "avatarFileId"
>;

export type NormalizedAvatarCropContext = {
  sourceWidth: number;
  sourceHeight: number;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type FigureCompositionCandidate<TAvatar extends FigureCompositionAvatar = FigureCompositionAvatar> = {
  avatar: TAvatar;
  baseAvatar: TAvatar;
  roleId: number;
  avatarId: number;
  baseAvatarId: number;
  variantId: number;
  variantName: string;
  baseSpriteFileId: number;
  avatarFileId: number;
  cropContext: NormalizedAvatarCropContext;
  cacheKey: string;
  alias: string;
};

export type WebgalFigureRenderAsset = {
  target: string;
  stateKey: string;
  composite: boolean;
  composeLine?: string;
  basePath?: string;
  avatarLayerPath?: string;
  candidate?: FigureCompositionCandidate;
};

type PreparedCompositionSource<TAvatar extends FigureCompositionAvatar> = {
  avatar: TAvatar;
  baseAvatar: TAvatar;
  basePath: string;
  avatarLayerPath: string;
};

function normalizePositiveInteger(value: unknown): number | undefined {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) {
    return undefined;
  }
  return Math.floor(raw);
}

function normalizeFiniteNumber(value: unknown): number | undefined {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw)) {
    return undefined;
  }
  return Number(raw.toFixed(4));
}

function normalizeCompositionConfig(config: RoleAvatarVariantCompositionConfig | undefined): NormalizedAvatarCropContext | undefined {
  const sourceWidth = normalizeFiniteNumber(config?.canvas?.width);
  const sourceHeight = normalizeFiniteNumber(config?.canvas?.height);
  const x = normalizeFiniteNumber(config?.avatarSlot?.x);
  const y = normalizeFiniteNumber(config?.avatarSlot?.y);
  const width = normalizeFiniteNumber(config?.avatarSlot?.width);
  const height = normalizeFiniteNumber(config?.avatarSlot?.height);
  if (
    sourceWidth == null
    || sourceHeight == null
    || sourceWidth <= 0
    || sourceHeight <= 0
    || x == null
    || y == null
    || width == null
    || height == null
    || width <= 0
    || height <= 0
  ) {
    return undefined;
  }

  return {
    sourceWidth,
    sourceHeight,
    crop: { x, y, width, height },
  };
}

export function getAvatarCropContextSignature(context: NormalizedAvatarCropContext): string {
  return JSON.stringify({
    sourceWidth: context.sourceWidth,
    sourceHeight: context.sourceHeight,
    crop: context.crop,
  });
}

function normalizeVariantName(variantGroup: RoleAvatarVariant | undefined, variantId: number): string {
  const name = String(variantGroup?.name ?? "").trim();
  return name || `variant-${variantId}`;
}

export function selectFigureGroupBase<TAvatar extends FigureCompositionAvatar>(
  avatars: readonly TAvatar[],
  variantGroup: RoleAvatarVariant | undefined,
): TAvatar | undefined {
  const baseAvatarId = normalizePositiveInteger(variantGroup?.baseAvatarId);
  if (baseAvatarId == null) {
    return undefined;
  }

  return avatars.find((avatar) => {
    const avatarId = normalizePositiveInteger(avatar.avatarId);
    const spriteFileId = normalizePositiveInteger(avatar.spriteFileId);
    return avatarId === baseAvatarId && spriteFileId != null;
  });
}

export function resolveFigureCompositionCandidate<TAvatar extends FigureCompositionAvatar>(
  avatar: TAvatar | undefined,
  avatars: readonly TAvatar[],
): FigureCompositionCandidate<TAvatar> | undefined {
  const avatarId = normalizePositiveInteger(avatar?.avatarId);
  const roleId = normalizePositiveInteger(avatar?.roleId);
  const avatarFileId = normalizePositiveInteger(avatar?.avatarFileId);
  const variantId = normalizePositiveInteger(avatar?.variantId);
  const variantGroup = avatar?.variantGroup;
  const groupRoleId = normalizePositiveInteger(variantGroup?.roleId);
  const groupVariantId = normalizePositiveInteger(variantGroup?.variantId);
  const cropContext = normalizeCompositionConfig(variantGroup?.compositionConfig);
  if (
    !avatar
    || avatarId == null
    || roleId == null
    || avatarFileId == null
    || variantId == null
    || !variantGroup
    || (groupVariantId != null && groupVariantId !== variantId)
    || (groupRoleId != null && groupRoleId !== roleId)
    || !cropContext
  ) {
    return undefined;
  }

  const avatarList = avatars.some(item => Number(item.avatarId ?? 0) === avatarId)
    ? avatars
    : [...avatars, avatar];
  const baseAvatar = selectFigureGroupBase(avatarList, variantGroup);
  const baseAvatarId = normalizePositiveInteger(baseAvatar?.avatarId);
  const baseSpriteFileId = normalizePositiveInteger(baseAvatar?.spriteFileId);
  if (!baseAvatar || baseAvatarId == null || baseSpriteFileId == null) {
    return undefined;
  }

  const cropSignature = getAvatarCropContextSignature(cropContext);
  const cacheKey = [
    `role:${roleId}`,
    `variant:${variantId}`,
    `base:${baseAvatarId}:${baseSpriteFileId}`,
    `avatar:${avatarId}:${avatarFileId}`,
    `config:${cropSignature}`,
  ].join("|");
  const effectiveHash = hashString(cacheKey);
  return {
    avatar,
    baseAvatar,
    roleId,
    avatarId,
    baseAvatarId,
    variantId,
    variantName: normalizeVariantName(variantGroup, variantId),
    baseSpriteFileId,
    avatarFileId,
    cropContext,
    cacheKey,
    alias: `role_${roleId}_variant_${variantId}_avatar_${avatarId}_${effectiveHash}`,
  };
}

export function buildFigureCompositionLayerArg(
  candidate: FigureCompositionCandidate,
  avatarLayerPath: string,
): string {
  const { crop } = candidate.cropContext;
  return [avatarLayerPath, crop.x, crop.y, crop.width, crop.height].join(",");
}

export function buildWebgalFigureRenderAsset(
  candidate: FigureCompositionCandidate,
  basePath: string,
  avatarLayerPath: string,
): WebgalFigureRenderAsset {
  const normalizedBasePath = basePath.trim();
  const normalizedAvatarLayerPath = avatarLayerPath.trim();
  const layerArg = buildFigureCompositionLayerArg(candidate, normalizedAvatarLayerPath);
  return {
    target: candidate.alias,
    stateKey: candidate.cacheKey,
    composite: true,
    composeLine: `composeFigure:${candidate.alias} -base=${normalizedBasePath} -layer=${layerArg} -width=${candidate.cropContext.sourceWidth} -height=${candidate.cropContext.sourceHeight} -format=webp;`,
    basePath: normalizedBasePath,
    avatarLayerPath: normalizedAvatarLayerPath,
    candidate,
  };
}

export function buildOrdinaryFigureRenderAsset(target: string): WebgalFigureRenderAsset | undefined {
  const normalizedTarget = target.trim();
  if (!normalizedTarget) {
    return undefined;
  }
  return {
    target: normalizedTarget,
    stateKey: normalizedTarget,
    composite: false,
  };
}

export function buildPreparedFigureCompositionAsset<TAvatar extends FigureCompositionAvatar>(
  source: PreparedCompositionSource<TAvatar>,
  avatars: readonly TAvatar[],
): WebgalFigureRenderAsset | undefined {
  const candidate = resolveFigureCompositionCandidate(source.avatar, [...avatars, source.baseAvatar]);
  if (!candidate) {
    return undefined;
  }
  return buildWebgalFigureRenderAsset(candidate, source.basePath, source.avatarLayerPath);
}
