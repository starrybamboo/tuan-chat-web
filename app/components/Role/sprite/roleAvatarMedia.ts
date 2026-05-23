import type { RoleAvatar } from "api";

import { avatarOriginalUrl, avatarUrl, imageLowUrl, imageMediumUrl, imageOriginalUrl } from "@/utils/mediaUrl";

type LegacyRoleAvatarMediaFields = {
  avatarUrl?: string | null;
  avatarThumbUrl?: string | null;
  avatarOriginalUrl?: string | null;
  spriteUrl?: string | null;
  spriteOriginalUrl?: string | null;
  originUrl?: string | null;
};

export type RoleAvatarMediaSource = Pick<
  RoleAvatar,
  "avatarFileId" | "spriteFileId" | "originFileId"
> & LegacyRoleAvatarMediaFields;

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

export function normalizeLegacyMediaUrl(url: string | null | undefined): string {
  return typeof url === "string" ? url.trim() : "";
}

export function resolveRoleAvatarMedia(
  avatar: RoleAvatarMediaSource | null | undefined,
): ResolvedRoleAvatarMedia {
  const avatarMedium = avatarUrl(avatar?.avatarFileId);
  const avatarOriginal = avatarOriginalUrl(avatar?.avatarFileId);
  const avatarLegacy = normalizeLegacyMediaUrl(avatar?.avatarUrl);
  const avatarOriginalLegacy = normalizeLegacyMediaUrl(avatar?.avatarOriginalUrl);
  const avatarResolvedUrl = avatarMedium || avatarOriginal || avatarLegacy || avatarOriginalLegacy;

  const spriteMedium = imageMediumUrl(avatar?.spriteFileId);
  const spriteOriginal = imageOriginalUrl(avatar?.spriteFileId);
  const spriteLegacy = normalizeLegacyMediaUrl(avatar?.spriteUrl);
  const spriteOriginalLegacy = normalizeLegacyMediaUrl(avatar?.spriteOriginalUrl);
  const originResolvedUrl = imageOriginalUrl(avatar?.originFileId) || normalizeLegacyMediaUrl(avatar?.originUrl);

  return {
    avatar: {
      url: avatarResolvedUrl,
      thumbUrl: imageLowUrl(avatar?.avatarFileId)
        || normalizeLegacyMediaUrl(avatar?.avatarThumbUrl)
        || avatarResolvedUrl,
      originalUrl: avatarOriginal || avatarOriginalLegacy || avatarResolvedUrl,
    },
    sprite: {
      url: spriteMedium || spriteOriginal || spriteLegacy || spriteOriginalLegacy || originResolvedUrl,
      cropSourceUrl: spriteMedium || spriteOriginal || spriteLegacy || spriteOriginalLegacy || originResolvedUrl,
      originalUrl: spriteOriginal || spriteOriginalLegacy || spriteLegacy || originResolvedUrl,
    },
    origin: {
      url: originResolvedUrl,
    },
  };
}
