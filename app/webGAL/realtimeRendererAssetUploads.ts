import type { RoleAvatar } from "../../api";

import { getFileExtensionFromUrl, uploadFile } from "./fileOperator";
import { buildImageFileName, hasFileExtension, hashString } from "./realtimeRendererFileNames";

export type RealtimeAssetUploadContext = {
  gameName: string;
  uploadedSpritesMap: Map<string, string>;
  uploadedBackgroundsMap: Map<string, string>;
  uploadedImageFiguresMap: Map<string, string>;
  uploadedBgmsMap: Map<string, string>;
  uploadedVideosMap: Map<string, string>;
  uploadedMiniAvatarsMap: Map<string, string>;
  uploadedSoundEffectsMap: Map<string, string>;
};

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

export async function uploadImageFigureAsset(
  context: RealtimeAssetUploadContext,
  url: string,
  fileName?: string,
): Promise<string | null> {
  if (context.uploadedImageFiguresMap.has(url)) {
    return context.uploadedImageFiguresMap.get(url) || null;
  }

  try {
    const path = `games/${context.gameName}/game/figure/`;
    const targetName = buildImageFileName(url, fileName, "img");
    const uploadedName = await uploadFile(url, path, targetName);
    context.uploadedImageFiguresMap.set(url, uploadedName);
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
  getCachedRoleAvatar: (avatarId: number) => RoleAvatar | undefined,
): Promise<string | null> {
  const cacheKey = buildRoleAvatarCacheKey(roleId, avatarId);
  if (context.uploadedSpritesMap.has(cacheKey)) {
    return context.uploadedSpritesMap.get(cacheKey) || null;
  }

  const avatar = getCachedRoleAvatar(avatarId);
  if (!avatar) {
    console.warn(`[RealtimeRenderer] 头像信息未找到: avatarId=${avatarId}`);
    return null;
  }

  const spriteUrl = avatar.spriteUrl || avatar.avatarUrl;
  if (!spriteUrl) {
    console.warn(`[RealtimeRenderer] 头像没有 spriteUrl 或 avatarUrl: avatarId=${avatarId}`);
    return null;
  }

  return uploadSpriteAsset(context, avatarId, spriteUrl, roleId);
}

export async function getAndUploadMiniAvatarAsset(
  context: RealtimeAssetUploadContext,
  avatarId: number,
  roleId: number,
  getCachedRoleAvatar: (avatarId: number) => RoleAvatar | undefined,
): Promise<string | null> {
  const cacheKey = buildRoleAvatarCacheKey(roleId, avatarId);
  if (context.uploadedMiniAvatarsMap.has(cacheKey)) {
    return context.uploadedMiniAvatarsMap.get(cacheKey) || null;
  }

  const avatar = getCachedRoleAvatar(avatarId);
  if (!avatar?.avatarUrl) {
    return null;
  }

  try {
    const roleFigureDir = getRoleFigureDirName(roleId);
    const path = `games/${context.gameName}/game/figure/${roleFigureDir}/`;
    const fileExtension = getFileExtensionFromUrl(avatar.avatarUrl, "webp");
    const miniAvatarName = `mini_${avatarId}`;
    const fileName = await uploadFile(avatar.avatarUrl, path, `${miniAvatarName}.${fileExtension}`);
    const relativePath = `${roleFigureDir}/${fileName}`;
    context.uploadedMiniAvatarsMap.set(cacheKey, relativePath);
    return relativePath;
  }
  catch (error) {
    console.error("上传小头像失败:", error);
    return null;
  }
}
