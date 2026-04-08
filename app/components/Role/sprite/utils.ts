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
