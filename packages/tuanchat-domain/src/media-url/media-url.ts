import type { MediaQuality, MediaType } from "./types";

const MEDIA_EXT: Partial<Record<MediaType, string>> = {
  image: "webp",
  audio: "webm",
  video: "webm",
};

const DEFAULT_MEDIA_CDN_BASE_URL = "https://tuan.chat";
const FALLBACK_MEDIA_TYPE: MediaType = "image";
const MEDIA_FILE_URL_PATTERN = /^(?<prefix>.*?\/media\/v1\/files\/)(?<shard>\d{3})\/(?<fileId>\d+)\/(?:(?<mediaType>image|audio|video)\/(?<quality>low|medium|high)\.[^/?#]+|original)(?:[?#].*)?$/;

export function mediaShard(fileId: number | string): string {
  return (BigInt(String(fileId)) % 1000n).toString().padStart(3, "0");
}

export function normalizeMediaType(mediaType: string | null | undefined): MediaType {
  if (mediaType === "image" || mediaType === "audio" || mediaType === "video" || mediaType === "document" || mediaType === "other") {
    return mediaType;
  }
  return FALLBACK_MEDIA_TYPE;
}

export function mediaUrl(
  fileId: number | string | null | undefined,
  mediaType: MediaType,
  quality: MediaQuality,
  cdnBaseUrl?: string,
): string {
  if (fileId == null || String(fileId).trim() === "") {
    return "";
  }
  const shard = mediaShard(fileId);
  const base = `${(cdnBaseUrl ?? DEFAULT_MEDIA_CDN_BASE_URL).replace(/\/$/, "")}/media/v1/files/${shard}/${fileId}`;
  if (quality === "original") {
    return `${base}/original`;
  }
  const ext = MEDIA_EXT[mediaType];
  if (!ext) {
    return `${base}/original`;
  }
  return `${base}/${mediaType}/${quality}.${ext}`;
}

export function mediaFileUrl(
  fileId: number | string | null | undefined,
  mediaType: string | null | undefined,
  quality: MediaQuality,
  cdnBaseUrl?: string,
): string {
  return mediaUrl(fileId, normalizeMediaType(mediaType), quality, cdnBaseUrl);
}

export function mediaFileUrlWithQuality(
  rawUrl: string | null | undefined,
  mediaType: MediaType,
  quality: MediaQuality,
): string {
  const value = String(rawUrl ?? "").trim();
  if (!value) {
    return "";
  }
  const match = value.match(MEDIA_FILE_URL_PATTERN);
  const groups = match?.groups;
  if (!groups?.prefix || !groups.shard || !groups.fileId) {
    return value;
  }

  const ext = MEDIA_EXT[mediaType];
  const base = `${groups.prefix}${groups.shard}/${groups.fileId}`;
  if (quality === "original" || !ext) {
    return `${base}/original`;
  }
  return `${base}/${mediaType}/${quality}.${ext}`;
}

export function imageUrlWithQuality(rawUrl: string | null | undefined, quality: MediaQuality): string {
  return mediaFileUrlWithQuality(rawUrl, "image", quality);
}

export function mediaPreviewUrl(
  fileId: number | string | null | undefined,
  mediaType: string | null | undefined,
  cdnBaseUrl?: string,
): string {
  const resolvedType = normalizeMediaType(mediaType);
  if (resolvedType === "image") {
    return mediaUrl(fileId, resolvedType, "medium", cdnBaseUrl);
  }
  if (resolvedType === "audio" || resolvedType === "video") {
    return mediaUrl(fileId, resolvedType, "high", cdnBaseUrl);
  }
  return mediaUrl(fileId, resolvedType, "original", cdnBaseUrl);
}

export function mediaThumbUrl(
  fileId: number | string | null | undefined,
  mediaType: string | null | undefined,
  cdnBaseUrl?: string,
): string {
  const resolvedType = normalizeMediaType(mediaType);
  if (resolvedType === "image") {
    return mediaUrl(fileId, resolvedType, "low", cdnBaseUrl);
  }
  return mediaPreviewUrl(fileId, resolvedType, cdnBaseUrl);
}

export function extractMediaFileIdFromUrl(rawUrl: string | null | undefined): number | undefined {
  const value = String(rawUrl ?? "").trim();
  if (!value) {
    return undefined;
  }
  const match = value.match(/\/media\/v1\/files\/\d{3}\/(\d+)(?:\/|$)/);
  if (!match?.[1]) {
    return undefined;
  }
  const fileId = Number(match[1]);
  return Number.isFinite(fileId) && fileId > 0 ? fileId : undefined;
}

export const imageLowUrl = (fileId?: number | string | null, cdnBaseUrl?: string) => mediaUrl(fileId, "image", "low", cdnBaseUrl);
export const imageMediumUrl = (fileId?: number | string | null, cdnBaseUrl?: string) => mediaUrl(fileId, "image", "medium", cdnBaseUrl);
export const imageHighUrl = (fileId?: number | string | null, cdnBaseUrl?: string) => mediaUrl(fileId, "image", "high", cdnBaseUrl);
export const imageOriginalUrl = (fileId?: number | string | null, cdnBaseUrl?: string) => mediaUrl(fileId, "image", "original", cdnBaseUrl);
export const imageLowUrlFromUrl = (url?: string | null) => imageUrlWithQuality(url, "low");
export const imageMediumUrlFromUrl = (url?: string | null) => imageUrlWithQuality(url, "medium");
export const imageHighUrlFromUrl = (url?: string | null) => imageUrlWithQuality(url, "high");
export const imageOriginalUrlFromUrl = (url?: string | null) => imageUrlWithQuality(url, "original");
export const avatarThumbUrl = (fileId?: number | string | null, cdnBaseUrl?: string) => mediaUrl(fileId, "image", "low", cdnBaseUrl);
export const avatarUrl = (fileId?: number | string | null, cdnBaseUrl?: string) => mediaUrl(fileId, "image", "medium", cdnBaseUrl);
export const avatarOriginalUrl = (fileId?: number | string | null, cdnBaseUrl?: string) => mediaUrl(fileId, "image", "original", cdnBaseUrl);
