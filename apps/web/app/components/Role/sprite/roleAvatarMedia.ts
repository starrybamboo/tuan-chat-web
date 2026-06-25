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
>;

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
  const avatarResolvedUrl = avatarMedium || avatarOriginal;

  const spriteMedium = imageMediumUrl(avatar?.spriteFileId) || "";
  const spriteOriginal = imageOriginalUrl(avatar?.spriteFileId) || "";
  const originResolvedUrl = imageOriginalUrl(avatar?.originFileId) || "";

  return {
    avatar: {
      url: avatarResolvedUrl,
      thumbUrl: imageLowUrl(avatar?.avatarFileId) || avatarResolvedUrl,
      originalUrl: avatarOriginal || avatarResolvedUrl,
    },
    sprite: {
      url: spriteMedium || spriteOriginal,
      cropSourceUrl: spriteOriginal,
      originalUrl: spriteOriginal,
    },
    origin: {
      url: originResolvedUrl,
    },
  };
}
