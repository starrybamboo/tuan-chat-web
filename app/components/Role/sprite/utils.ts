import type { RoleAvatar } from "api";

import { avatarOriginalUrl, avatarThumbUrl, avatarUrl, imageHighUrl, imageOriginalUrl } from "@/utils/mediaUrl";

import type { Transform } from "./TransformControl";

export function getEffectiveAvatarOriginalUrl(avatar: RoleAvatar | null | undefined): string {
  const resolvedAvatarOriginalUrl = avatarOriginalUrl(avatar?.avatarFileId);
  if (resolvedAvatarOriginalUrl) {
    return resolvedAvatarOriginalUrl;
  }

  return getEffectiveAvatarUrl(avatar);
}

export function getEffectiveAvatarUrl(avatar: RoleAvatar | null | undefined): string {
  const resolvedAvatarUrl = avatarUrl(avatar?.avatarFileId);
  if (resolvedAvatarUrl) {
    return resolvedAvatarUrl;
  }

  const resolvedAvatarOriginalUrl = avatarOriginalUrl(avatar?.avatarFileId);
  if (resolvedAvatarOriginalUrl) {
    return resolvedAvatarOriginalUrl;
  }

  return imageOriginalUrl(avatar?.originFileId);
}

export function getEffectiveAvatarThumbUrl(avatar: RoleAvatar | null | undefined): string {
  return avatarThumbUrl(avatar?.avatarFileId) || getEffectiveAvatarUrl(avatar);
}

export function getEffectiveSpriteOriginalUrl(avatar: RoleAvatar | null | undefined): string {
  const spriteOriginalUrl = imageOriginalUrl(avatar?.spriteFileId);
  if (spriteOriginalUrl) {
    return spriteOriginalUrl;
  }

  const originUrl = imageOriginalUrl(avatar?.originFileId);
  if (originUrl) {
    return originUrl;
  }

  return getEffectiveSpriteUrl(avatar);
}

export function getEffectiveSpriteUrl(avatar: RoleAvatar | null | undefined): string {
  const spriteUrl = imageHighUrl(avatar?.spriteFileId);
  if (spriteUrl) {
    return spriteUrl;
  }

  const spriteOriginalUrl = imageOriginalUrl(avatar?.spriteFileId);
  if (spriteOriginalUrl) {
    return spriteOriginalUrl;
  }

  // 无立绘时：使用头像作为默认立绘
  const resolvedAvatarUrl = avatarUrl(avatar?.avatarFileId);
  if (resolvedAvatarUrl) {
    return resolvedAvatarUrl;
  }

  const resolvedAvatarOriginalUrl = avatarOriginalUrl(avatar?.avatarFileId);
  if (resolvedAvatarOriginalUrl) {
    return resolvedAvatarOriginalUrl;
  }

  const originUrl = imageOriginalUrl(avatar?.originFileId);
  if (originUrl) {
    return originUrl;
  }

  return "";
}

export function parseTransformFromAvatar(avatar: RoleAvatar | null): Transform {
  if (!avatar) {
    return {
      scale: 1,
      positionX: 0,
      positionY: 0,
      alpha: 1,
      rotation: 0,
    };
  }

  const spriteTransform = avatar.spriteTransform;
  const scale = spriteTransform?.scale ?? 1;
  const positionX = spriteTransform?.positionX ?? 0;
  const positionY = spriteTransform?.positionY ?? 0;
  const alpha = spriteTransform?.alpha ?? 1;
  const rotation = spriteTransform?.rotation ?? 0;

  return {
    scale,
    positionX,
    positionY,
    alpha,
    rotation,
  };
}

export function toSpriteTransformPayload(transform: Transform | null | undefined): RoleAvatar["spriteTransform"] | undefined {
  if (!transform) {
    return undefined;
  }

  return {
    positionX: transform.positionX,
    positionY: transform.positionY,
    scale: transform.scale,
    alpha: transform.alpha,
    rotation: transform.rotation,
  };
}
