import type { RoleAvatar } from "api";

import type { Transform } from "./TransformControl";

export function getEffectiveSpriteUrl(avatar: RoleAvatar | null | undefined): string {
  const spriteUrl = String(avatar?.spriteUrl ?? "").trim();
  if (spriteUrl) {
    return spriteUrl;
  }

  // 无立绘时：使用头像作为默认立绘
  const avatarUrl = String(avatar?.avatarUrl ?? "").trim();
  if (avatarUrl) {
    return avatarUrl;
  }

  // 兜底：仍可用原图（如果存在）
  const originUrl = String(avatar?.originUrl ?? "").trim();
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

  // Parse transform parameters from string values, with fallbacks to defaults
  const scale = avatar.spriteScale ? avatar.spriteScale : 1;
  const positionX = avatar.spriteXPosition ? avatar.spriteXPosition : 0;
  const positionY = avatar.spriteYPosition ? avatar.spriteYPosition : 0;
  const alpha = avatar.spriteTransparency ? avatar.spriteTransparency : 1;
  const rotation = avatar.spriteRotation ? avatar.spriteRotation : 0;

  // Validate and clamp values to acceptable ranges
  return {
    scale,
    positionX,
    positionY,
    alpha,
    rotation,
  };
};
