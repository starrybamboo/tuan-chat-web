import type { RoleAvatar } from "api";

import {
  avatarOriginalUrl,
  avatarUrl,
  imageLowUrl,
  imageMediumUrl,
  imageOriginalUrl,
} from "@/utils/media/mediaUrl";

export type RoleAvatarMediaSource = Pick<
  RoleAvatar,
  "avatarFileId" | "spriteFileId" | "originFileId"
> & {
  localAvatarUrl?: string;
  localOriginUrl?: string;
  localSpriteUrl?: string;
};

export type ResolvedRoleAvatarMedia = {
  avatar: {
    url: string;
    thumbUrl: string;
    originalUrl: string;
  };
  sprite: {
    url: string;
    cropSourceUrl: string;
    originalUrl: string;
  };
  origin: {
    url: string;
  };
};

export function resolveRoleAvatarMedia(
  avatar: RoleAvatarMediaSource | null | undefined,
): ResolvedRoleAvatarMedia {
  const avatarMedium = avatarUrl(avatar?.avatarFileId) || "";
  const avatarOriginal = avatarOriginalUrl(avatar?.avatarFileId) || "";
  const avatarResolvedUrl = avatar?.localAvatarUrl || avatarMedium || avatarOriginal;

  const spriteMedium = imageMediumUrl(avatar?.spriteFileId) || "";
  const spriteOriginal = imageOriginalUrl(avatar?.spriteFileId) || "";
  const spriteResolvedOriginal = avatar?.localSpriteUrl || spriteOriginal;
  const originResolvedUrl = avatar?.localOriginUrl || imageOriginalUrl(avatar?.originFileId) || "";

  return {
    avatar: {
      url: avatarResolvedUrl,
      thumbUrl: imageLowUrl(avatar?.avatarFileId) || avatarResolvedUrl,
      originalUrl: avatarOriginal || avatarResolvedUrl,
    },
    sprite: {
      url: avatar?.localSpriteUrl || spriteMedium || spriteOriginal,
      cropSourceUrl: spriteResolvedOriginal,
      originalUrl: spriteResolvedOriginal,
    },
    origin: {
      url: originResolvedUrl,
    },
  };
}
