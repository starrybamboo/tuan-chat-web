import type { RoleAvatar, SpriteCropContext, SpriteTransform } from "api";

type AppliedSpriteAvatarPatch = Pick<
  RoleAvatar,
  "avatarFileId" | "spriteFileId" | "spriteCropContext" | "spriteTransform"
>;

/** 应用立绘后先复用同一媒体作为头像默认值，后续头像校正再覆盖 avatarFileId。 */
export function createAppliedSpriteAvatarPatch(
  spriteFileId: number,
  spriteCropContext: SpriteCropContext | undefined,
  spriteTransform: SpriteTransform | undefined,
): AppliedSpriteAvatarPatch {
  return {
    avatarFileId: spriteFileId,
    spriteFileId,
    spriteCropContext,
    spriteTransform,
  };
}
