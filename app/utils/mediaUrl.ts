import type { MediaQuality, MediaType } from "@tuanchat/domain/media-url";

import {
  avatarOriginalUrl as _avatarOriginalUrl,
  avatarThumbUrl as _avatarThumbUrl,
  avatarUrl as _avatarUrl,
  imageHighUrl as _imageHighUrl,
  imageLowUrl as _imageLowUrl,
  imageMediumUrl as _imageMediumUrl,
  imageOriginalUrl as _imageOriginalUrl,
  mediaFileUrl as _mediaFileUrl,
  mediaPreviewUrl as _mediaPreviewUrl,
  mediaThumbUrl as _mediaThumbUrl,
  mediaUrl as _mediaUrl,
} from "@tuanchat/domain/media-url";

export type { MediaQuality, MediaType } from "@tuanchat/domain/media-url";
export { extractMediaFileIdFromUrl, imageUrlWithQuality, mediaFileUrlWithQuality, mediaShard, normalizeMediaType } from "@tuanchat/domain/media-url";
export { imageLowUrlFromUrl, imageMediumUrlFromUrl, imageHighUrlFromUrl, imageOriginalUrlFromUrl } from "@tuanchat/domain/media-url";

function getCdnBaseUrl() {
  const envBase = String(import.meta.env.VITE_MEDIA_CDN_BASE_URL ?? "").trim();
  return envBase || undefined;
}

export function mediaUrl(fileId: number | string | null | undefined, mediaType: MediaType, quality: MediaQuality) {
  return _mediaUrl(fileId, mediaType, quality, getCdnBaseUrl());
}

export function mediaFileUrl(fileId: number | string | null | undefined, mediaType: string | null | undefined, quality: MediaQuality) {
  return _mediaFileUrl(fileId, mediaType, quality, getCdnBaseUrl());
}

export function mediaPreviewUrl(fileId: number | string | null | undefined, mediaType: string | null | undefined) {
  return _mediaPreviewUrl(fileId, mediaType, getCdnBaseUrl());
}

export function mediaThumbUrl(fileId: number | string | null | undefined, mediaType: string | null | undefined) {
  return _mediaThumbUrl(fileId, mediaType, getCdnBaseUrl());
}

export const imageLowUrl = (fileId?: number | string | null) => _imageLowUrl(fileId, getCdnBaseUrl());
export const imageMediumUrl = (fileId?: number | string | null) => _imageMediumUrl(fileId, getCdnBaseUrl());
export const imageHighUrl = (fileId?: number | string | null) => _imageHighUrl(fileId, getCdnBaseUrl());
export const imageOriginalUrl = (fileId?: number | string | null) => _imageOriginalUrl(fileId, getCdnBaseUrl());
export const avatarThumbUrl = (fileId?: number | string | null) => _avatarThumbUrl(fileId, getCdnBaseUrl());
export const avatarUrl = (fileId?: number | string | null) => _avatarUrl(fileId, getCdnBaseUrl());
export const avatarOriginalUrl = (fileId?: number | string | null) => _avatarOriginalUrl(fileId, getCdnBaseUrl());
