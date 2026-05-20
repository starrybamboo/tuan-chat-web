import type { MediaQualityInput, MediaType } from "@tuanchat/domain/media-url";

import { resolveRuntimeMediaBaseUrl } from "@/utils/runtimeUrl";
import {
  avatarOriginalUrl as _avatarOriginalUrl,
  avatarThumbUrl as _avatarThumbUrl,
  avatarUrl as _avatarUrl,
  imageHighUrl as _imageHighUrl,
  imageLowUrl as _imageLowUrl,
  imageMediumUrl as _imageMediumUrl,
  imageOriginalUrl as _imageOriginalUrl,
  imagePreviewUrl as _imagePreviewUrl,
  mediaFileUrl as _mediaFileUrl,
  mediaPreviewUrl as _mediaPreviewUrl,
  mediaThumbUrl as _mediaThumbUrl,
  mediaUrl as _mediaUrl,
  extractMediaFileIdFromUrl,
  imageHighUrlFromUrl,
  imageLowUrlFromUrl,
  imageMediumUrlFromUrl,
  imageOriginalUrlFromUrl,
  imagePreviewUrlFromUrl,
  imageUrlWithQuality,
  mediaFileUrlWithQuality,
  mediaShard,
  normalizeMediaType,
} from "@tuanchat/domain/media-url";

export {
  extractMediaFileIdFromUrl,
  imageHighUrlFromUrl,
  imageLowUrlFromUrl,
  imageMediumUrlFromUrl,
  imageOriginalUrlFromUrl,
  imagePreviewUrlFromUrl,
  imageUrlWithQuality,
  mediaFileUrlWithQuality,
  mediaShard,
  normalizeMediaType,
};

export type { LegacyMediaQuality, MediaQuality, MediaQualityInput, MediaType } from "@tuanchat/domain/media-url";

const DEFAULT_MEDIA_CDN_BASE_URL = "https://tuan.chat";

function getCdnBaseUrl(): string {
  const envBase = String(import.meta.env.VITE_MEDIA_CDN_BASE_URL ?? "").trim();
  return resolveRuntimeMediaBaseUrl(envBase, DEFAULT_MEDIA_CDN_BASE_URL);
}

export function mediaUrl(
  fileId: number | string | null | undefined,
  mediaType: MediaType,
  quality: MediaQualityInput,
) {
  return _mediaUrl(fileId, mediaType, quality, getCdnBaseUrl());
}

export function mediaFileUrl(
  fileId: number | string | null | undefined,
  mediaType: string | null | undefined,
  quality: MediaQualityInput,
) {
  return _mediaFileUrl(fileId, mediaType, quality, getCdnBaseUrl());
}

/** @deprecated Use `mediaUrl(fileId, normalizeMediaType(mediaType), "medium")` instead. */
export function mediaPreviewUrl(
  fileId: number | string | null | undefined,
  mediaType: string | null | undefined,
) {
  return _mediaPreviewUrl(fileId, mediaType, getCdnBaseUrl());
}

/** @deprecated Use `mediaUrl(fileId, normalizeMediaType(mediaType), "low")` instead. */
export function mediaThumbUrl(
  fileId: number | string | null | undefined,
  mediaType: string | null | undefined,
) {
  return _mediaThumbUrl(fileId, mediaType, getCdnBaseUrl());
}

export const imageLowUrl = (fileId?: number | string | null) => _imageLowUrl(fileId, getCdnBaseUrl());
/** @deprecated Use `mediaUrl(fileId, "image", "medium")` instead. */
export const imagePreviewUrl = (fileId?: number | string | null) => _imagePreviewUrl(fileId, getCdnBaseUrl());
export const imageMediumUrl = (fileId?: number | string | null) => _imageMediumUrl(fileId, getCdnBaseUrl());
/** @deprecated Use `mediaUrl(fileId, "image", "medium")` instead. "high" maps to "medium". */
export const imageHighUrl = (fileId?: number | string | null) => _imageHighUrl(fileId, getCdnBaseUrl());
export const imageOriginalUrl = (fileId?: number | string | null) => _imageOriginalUrl(fileId, getCdnBaseUrl());
/** @deprecated Use `mediaUrl(fileId, "image", "low")` instead. */
export const avatarThumbUrl = (fileId?: number | string | null) => _avatarThumbUrl(fileId, getCdnBaseUrl());
export const avatarUrl = (fileId?: number | string | null) => _avatarUrl(fileId, getCdnBaseUrl());
export const avatarOriginalUrl = (fileId?: number | string | null) => _avatarOriginalUrl(fileId, getCdnBaseUrl());
