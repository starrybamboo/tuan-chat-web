import type { RoleAvatar, RoleAvatarVariantCompositionConfig } from "api";

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

export function getEffectiveOriginUrl(avatar: RoleAvatarMediaSource | null | undefined): string {
  return resolveRoleAvatarMedia(avatar).origin.url;
}

export function getSpriteCropSourceUrl(avatar: RoleAvatarMediaSource | null | undefined): string {
  return resolveRoleAvatarMedia(avatar).sprite.cropSourceUrl;
}

export function getEffectiveSpriteUrl(avatar: RoleAvatarMediaSource | null | undefined): string {
  return resolveRoleAvatarMedia(avatar).sprite.url || (undefined as unknown as string);
}

export function parseTransformFromAvatar(avatar: RoleAvatar | null): Transform {
  return parseTransformFromSpriteTransform(avatar?.spriteTransform);
}

export function parseTransformFromVariantConfig(
  config: RoleAvatarVariantCompositionConfig | null | undefined,
): Transform {
  return parseTransformFromSpriteTransform(config?.spriteTransform);
}

export function parseTransformFromSpriteTransform(
  spriteTransform: RoleAvatar["spriteTransform"] | null | undefined,
): Transform {
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
