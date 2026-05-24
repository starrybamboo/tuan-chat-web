import type { RoleAvatar } from "api";

import type { RoleAvatarMediaSource } from "./roleAvatarMedia";
import type { Transform } from "./TransformControl";

import { resolveRoleAvatarMedia } from "./roleAvatarMedia";

export function getEffectiveAvatarOriginalUrl(avatar: RoleAvatarMediaSource | null | undefined): string {
  return resolveRoleAvatarMedia(avatar).avatar.originalUrl;
}

export function getEffectiveAvatarUrl(avatar: RoleAvatarMediaSource | null | undefined): string {
  return resolveRoleAvatarMedia(avatar).avatar.url;
}

export function getEffectiveAvatarThumbUrl(avatar: RoleAvatarMediaSource | null | undefined): string {
  return resolveRoleAvatarMedia(avatar).avatar.thumbUrl;
}

export function getEffectiveSpriteOriginalUrl(avatar: RoleAvatarMediaSource | null | undefined): string {
  return resolveRoleAvatarMedia(avatar).sprite.originalUrl;
}

export function getSpriteCropSourceUrl(avatar: RoleAvatarMediaSource | null | undefined): string {
  return resolveRoleAvatarMedia(avatar).sprite.cropSourceUrl;
}

export function getEffectiveSpriteUrl(avatar: RoleAvatarMediaSource | null | undefined): string {
  return resolveRoleAvatarMedia(avatar).sprite.url || (undefined as unknown as string);
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
