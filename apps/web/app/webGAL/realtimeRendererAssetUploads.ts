import type { RoleAvatarMediaSource } from "@/components/Role/sprite/roleAvatarMedia";

import { resolveRoleAvatarMedia } from "@/components/Role/sprite/roleAvatarMedia";

import type { RoleAvatar } from "../../api";

import { checkFileExist, getFileExtensionFromUrl, uploadFile } from "./fileOperator";
import { buildImageFileName, hasFileExtension, hashString } from "./realtimeRendererFileNames";
import {
  buildOrdinaryFigureRenderAsset,
  buildWebgalFigureRenderAsset,
  getAvatarCropContextSignature,
  resolveFigureCompositionCandidate,
} from "./webgalFigureComposition";
import type { FigureCompositionCandidate, WebgalFigureRenderAsset } from "./webgalFigureComposition";

export type RealtimeAssetUploadContext = {
  gameName: string;
  uploadedSpritesMap: Map<string, string>;
  uploadedBackgroundsMap: Map<string, string>;
  uploadedMapImagesMap: Map<string, string>;
  uploadedImageFiguresMap: Map<string, string>;
  uploadedBgmsMap: Map<string, string>;
  uploadedVideosMap: Map<string, string>;
  uploadedMiniAvatarsMap: Map<string, string>;
  uploadedSoundEffectsMap: Map<string, string>;
};

export type RealtimeRoleAvatarSource = Pick<
  RoleAvatar,
  "avatarId" | "roleId" | "variantId" | "variantGroup"
> & RoleAvatarMediaSource;

export function getRoleFigureDirName(roleId: number): string {
  const normalizedRoleId = Number.isFinite(roleId) && roleId > 0 ? Math.floor(roleId) : 0;
  return normalizedRoleId > 0 ? `role_${normalizedRoleId}` : "role_unknown";
}

export function buildRoleAvatarCacheKey(roleId: number, avatarId: number): string {
  return `${getRoleFigureDirName(roleId)}_${avatarId}`;
}

export function deleteAvatarScopedCacheEntries(cache: Map<string, string>, avatarId: number): void {
  const suffix = `_${avatarId}`;
  for (const key of Array.from(cache.keys())) {
    if (key.endsWith(suffix)) {
      cache.delete(key);
    }
  }
}

function resolveRoleSpriteUrls(avatar: RealtimeRoleAvatarSource | undefined): string[] {
  const media = resolveRoleAvatarMedia(avatar);
  return Array.from(new Set([
    media.sprite.url,
    media.sprite.originalUrl,
    media.origin.url,
  ].map(url => url.trim()).filter(Boolean)));
}

function resolveRoleAvatarLayerUrls(avatar: RealtimeRoleAvatarSource | undefined): string[] {
  const media = resolveRoleAvatarMedia(avatar);
  return Array.from(new Set([
    media.avatar.url,
    media.avatar.originalUrl,
  ].map(url => url.trim()).filter(Boolean)));
}

function resolveRoleMiniAvatarUrl(avatar: RealtimeRoleAvatarSource | undefined): string {
  const media = resolveRoleAvatarMedia(avatar).avatar;
  return media.url || media.originalUrl || media.thumbUrl;
}

export async function uploadSpriteAsset(
  context: RealtimeAssetUploadContext,
  avatarId: number,
  spriteUrl: string,
  roleId: number,
): Promise<string | null> {
  const cacheKey = buildRoleAvatarCacheKey(roleId, avatarId);
  if (context.uploadedSpritesMap.has(cacheKey)) {
    return context.uploadedSpritesMap.get(cacheKey) || null;
  }

  try {
    const roleFigureDir = getRoleFigureDirName(roleId);
    const path = `games/${context.gameName}/game/figure/${roleFigureDir}/`;
    const fileExtension = getFileExtensionFromUrl(spriteUrl, "webp");
    const spriteName = `sprite_${avatarId}`;
    const fileName = await uploadFile(spriteUrl, path, `${spriteName}.${fileExtension}`);
    const relativePath = `${roleFigureDir}/${fileName}`;
    context.uploadedSpritesMap.set(cacheKey, relativePath);
    return relativePath;
  }
  catch (error) {
    console.error("上传立绘失败:", error);
    return null;
  }
}

async function uploadFigureSourceAsset(
  context: RealtimeAssetUploadContext,
  roleId: number,
  cacheKey: string,
  sourceUrl: string,
  targetStem: string,
): Promise<string | null> {
  if (context.uploadedSpritesMap.has(cacheKey)) {
    return context.uploadedSpritesMap.get(cacheKey) || null;
  }

  try {
    const roleFigureDir = getRoleFigureDirName(roleId);
    const path = `games/${context.gameName}/game/figure/${roleFigureDir}/`;
    const fileExtension = getFileExtensionFromUrl(sourceUrl, "webp");
    const fileName = await uploadFile(sourceUrl, path, `${targetStem}.${fileExtension}`);
    const relativePath = `${roleFigureDir}/${fileName}`;
    context.uploadedSpritesMap.set(cacheKey, relativePath);
    return relativePath;
  }
  catch (error) {
    console.error("上传合成立绘素材失败:", error);
    return null;
  }
}

async function uploadFirstAvailableFigureSource(
  context: RealtimeAssetUploadContext,
  roleId: number,
  cacheKey: string,
  sourceUrls: string[],
  targetStem: string,
): Promise<string | null> {
  for (const sourceUrl of sourceUrls) {
    const uploaded = await uploadFigureSourceAsset(context, roleId, cacheKey, sourceUrl, targetStem);
    if (uploaded) {
      return uploaded;
    }
  }
  return null;
}

function buildCompositionBaseCacheKey(candidate: FigureCompositionCandidate): string {
  return [
    "compose_base",
    candidate.roleId,
    candidate.variantId,
    candidate.baseAvatarId,
    candidate.baseSpriteFileId,
  ].join("_");
}

function buildCompositionAvatarCacheKey(candidate: FigureCompositionCandidate): string {
  return [
    "compose_avatar",
    candidate.roleId,
    candidate.variantId,
    candidate.avatarId,
    candidate.avatarFileId,
    hashString(getAvatarCropContextSignature(candidate.cropContext)),
  ].join("_");
}

function buildCompositionBaseTargetStem(candidate: FigureCompositionCandidate): string {
  return `base_${candidate.baseAvatarId}_${candidate.baseSpriteFileId}`;
}

function buildCompositionAvatarTargetStem(candidate: FigureCompositionCandidate): string {
  const cropHash = hashString(getAvatarCropContextSignature(candidate.cropContext));
  return `avatar_${candidate.avatarId}_${candidate.avatarFileId}_${cropHash}`;
}

export async function uploadBackgroundAsset(
  context: RealtimeAssetUploadContext,
  url: string,
): Promise<string | null> {
  if (context.uploadedBackgroundsMap.has(url)) {
    return context.uploadedBackgroundsMap.get(url) || null;
  }

  try {
    const path = `games/${context.gameName}/game/background/`;
    const targetName = buildImageFileName(url, undefined, "bg");
    const fileName = await uploadFile(url, path, targetName);
    context.uploadedBackgroundsMap.set(url, fileName);
    return fileName;
  }
  catch (error) {
    console.error("上传背景失败:", error);
    return null;
  }
}

export async function uploadMapImageAsset(
  context: RealtimeAssetUploadContext,
  url: string,
  mapFileId: number,
): Promise<string | null> {
  if (context.uploadedMapImagesMap.has(url)) {
    return context.uploadedMapImagesMap.get(url) || null;
  }

  try {
    const path = `games/${context.gameName}/game/background/`;
    const targetName = buildImageFileName(url, `map_${mapFileId}`, "map");
    const fileName = await uploadFile(url, path, targetName);
    context.uploadedMapImagesMap.set(url, fileName);
    return fileName;
  }
  catch (error) {
    console.error("上传地图图片失败:", error);
    return null;
  }
}

export async function uploadImageFigureAsset(
  context: RealtimeAssetUploadContext,
  url: string,
  fileName?: string,
): Promise<string | null> {
  const cacheKey = `${fileName?.trim() || ""}|${url}`;
  const path = `games/${context.gameName}/game/figure/`;
  const cachedName = context.uploadedImageFiguresMap.get(cacheKey);
  if (cachedName) {
    if (await checkFileExist(path, cachedName)) {
      return cachedName;
    }
    context.uploadedImageFiguresMap.delete(cacheKey);
  }

  try {
    const targetName = buildImageFileName(url, fileName, "img");
    const uploadedName = await uploadFile(url, path, targetName);
    context.uploadedImageFiguresMap.set(cacheKey, uploadedName);
    return uploadedName;
  }
  catch (error) {
    console.error("上传图片立绘失败:", error);
    return null;
  }
}

export async function uploadVideoAsset(
  context: RealtimeAssetUploadContext,
  url: string,
  fileName?: string,
): Promise<string | null> {
  if (context.uploadedVideosMap.has(url)) {
    return context.uploadedVideosMap.get(url) || null;
  }

  try {
    const path = `games/${context.gameName}/game/video/`;
    const trimmedName = fileName?.trim();
    const targetName = trimmedName
      ? (hasFileExtension(trimmedName) ? trimmedName : `${trimmedName}.webm`)
      : `video_${hashString(url)}.webm`;
    const uploadedName = await uploadFile(url, path, targetName);
    context.uploadedVideosMap.set(url, uploadedName);
    return uploadedName;
  }
  catch (error) {
    console.error("上传视频失败:", error);
    return null;
  }
}

export async function uploadBgmAsset(
  context: RealtimeAssetUploadContext,
  url: string,
): Promise<string | null> {
  if (context.uploadedBgmsMap.has(url)) {
    return context.uploadedBgmsMap.get(url) || null;
  }

  try {
    const path = `games/${context.gameName}/game/bgm/`;
    const fileName = await uploadFile(url, path);
    context.uploadedBgmsMap.set(url, fileName);
    return fileName;
  }
  catch (error) {
    console.error("上传背景音乐失败:", error);
    return null;
  }
}

export async function uploadSoundEffectAsset(
  context: RealtimeAssetUploadContext,
  url: string,
): Promise<string | null> {
  if (context.uploadedSoundEffectsMap.has(url)) {
    return context.uploadedSoundEffectsMap.get(url) || null;
  }

  try {
    // WebGAL 的 playEffect 使用 vocal 文件夹。
    const path = `games/${context.gameName}/game/vocal/`;
    const fileName = await uploadFile(url, path);
    context.uploadedSoundEffectsMap.set(url, fileName);
    return fileName;
  }
  catch (error) {
    console.error("上传音效失败:", error);
    return null;
  }
}

export async function getAndUploadSpriteAsset(
  context: RealtimeAssetUploadContext,
  avatarId: number,
  roleId: number,
  getRoleAvatar: (avatarId: number) => RealtimeRoleAvatarSource | undefined | Promise<RealtimeRoleAvatarSource | undefined>,
): Promise<string | null> {
  const cacheKey = buildRoleAvatarCacheKey(roleId, avatarId);
  if (context.uploadedSpritesMap.has(cacheKey)) {
    return context.uploadedSpritesMap.get(cacheKey) || null;
  }

  const avatar = await getRoleAvatar(avatarId);
  if (!avatar) {
    console.warn(`[RealtimeRenderer] 头像信息未找到: avatarId=${avatarId}`);
    return null;
  }
  if (Number(avatar.roleId ?? 0) !== roleId) {
    console.warn(`[RealtimeRenderer] 头像不属于当前角色: avatarId=${avatarId}, roleId=${roleId}, avatarRoleId=${avatar.roleId}`);
    return null;
  }

  const spriteUrls = resolveRoleSpriteUrls(avatar);
  if (spriteUrls.length === 0) {
    console.warn(`[RealtimeRenderer] 头像没有可用的 spriteFileId 或 originFileId: avatarId=${avatarId}`);
    return null;
  }

  for (const spriteUrl of spriteUrls) {
    const uploaded = await uploadSpriteAsset(context, avatarId, spriteUrl, roleId);
    if (uploaded) {
      return uploaded;
    }
  }
  return null;
}

export async function getAndUploadFigureAsset(
  context: RealtimeAssetUploadContext,
  avatarId: number,
  roleId: number,
  getRoleAvatar: (avatarId: number) => RealtimeRoleAvatarSource | undefined | Promise<RealtimeRoleAvatarSource | undefined>,
  getRoleAvatars: (roleId: number) => readonly RealtimeRoleAvatarSource[] | Promise<readonly RealtimeRoleAvatarSource[]>,
): Promise<WebgalFigureRenderAsset | null> {
  const avatar = await getRoleAvatar(avatarId);
  if (!avatar) {
    console.warn(`[RealtimeRenderer] 头像信息未找到: avatarId=${avatarId}`);
    return null;
  }
  if (Number(avatar.roleId ?? 0) !== roleId) {
    console.warn(`[RealtimeRenderer] 头像不属于当前角色: avatarId=${avatarId}, roleId=${roleId}, avatarRoleId=${avatar.roleId}`);
    return null;
  }

  const roleAvatars = await getRoleAvatars(roleId);
  const candidate = resolveFigureCompositionCandidate(avatar, roleAvatars);
  if (candidate) {
    const basePath = await uploadFirstAvailableFigureSource(
      context,
      roleId,
      buildCompositionBaseCacheKey(candidate),
      resolveRoleSpriteUrls(candidate.baseAvatar),
      buildCompositionBaseTargetStem(candidate),
    );
    const avatarLayerPath = await uploadFirstAvailableFigureSource(
      context,
      roleId,
      buildCompositionAvatarCacheKey(candidate),
      resolveRoleAvatarLayerUrls(avatar),
      buildCompositionAvatarTargetStem(candidate),
    );
    if (basePath && avatarLayerPath) {
      return buildWebgalFigureRenderAsset(candidate, basePath, avatarLayerPath);
    }
  }

  const ordinarySprite = await getAndUploadSpriteAsset(context, avatarId, roleId, () => avatar);
  return ordinarySprite ? buildOrdinaryFigureRenderAsset(ordinarySprite) ?? null : null;
}

export async function getAndUploadMiniAvatarAsset(
  context: RealtimeAssetUploadContext,
  avatarId: number,
  roleId: number,
  getRoleAvatar: (avatarId: number) => RealtimeRoleAvatarSource | undefined | Promise<RealtimeRoleAvatarSource | undefined>,
): Promise<string | null> {
  const cacheKey = buildRoleAvatarCacheKey(roleId, avatarId);
  if (context.uploadedMiniAvatarsMap.has(cacheKey)) {
    return context.uploadedMiniAvatarsMap.get(cacheKey) || null;
  }

  const avatar = await getRoleAvatar(avatarId);
  if (avatar && Number(avatar.roleId ?? 0) !== roleId) {
    console.warn(`[RealtimeRenderer] 小头像不属于当前角色: avatarId=${avatarId}, roleId=${roleId}, avatarRoleId=${avatar.roleId}`);
    return null;
  }
  const miniAvatarUrl = resolveRoleMiniAvatarUrl(avatar);
  if (!miniAvatarUrl) {
    return null;
  }

  try {
    const roleFigureDir = getRoleFigureDirName(roleId);
    const path = `games/${context.gameName}/game/figure/${roleFigureDir}/`;
    const fileExtension = getFileExtensionFromUrl(miniAvatarUrl, "webp");
    const miniAvatarName = `mini_${avatarId}`;
    const fileName = await uploadFile(miniAvatarUrl, path, `${miniAvatarName}.${fileExtension}`);
    const relativePath = `${roleFigureDir}/${fileName}`;
    context.uploadedMiniAvatarsMap.set(cacheKey, relativePath);
    return relativePath;
  }
  catch (error) {
    console.error("上传小头像失败:", error);
    return null;
  }
}
