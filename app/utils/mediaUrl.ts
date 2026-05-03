import type { MediaQuality, MediaType } from "@/utils/imgCompressUtils";

const MEDIA_EXT: Partial<Record<MediaType, string>> = {
  image: "webp",
  audio: "webm",
  video: "webm",
};

const DEFAULT_MEDIA_CDN_BASE_URL = "https://tuan.chat";
const FALLBACK_MEDIA_TYPE: MediaType = "image";
const MEDIA_FILE_URL_PATTERN = /^(?<prefix>.*?\/media\/v1\/files\/)(?<shard>\d{3})\/(?<fileId>\d+)(?:\/(?:(?<mediaType>image|audio|video)\/(?<quality>low|medium|high)\.[^/?#]+|original))(?:[?#].*)?$/;

function normalizeCdnBaseUrl() {
  const envBase = String(import.meta.env.VITE_MEDIA_CDN_BASE_URL ?? "").trim();
  if (envBase) {
    return envBase.replace(/\/$/, "");
  }
  return DEFAULT_MEDIA_CDN_BASE_URL;
}

export function mediaShard(fileId: number | string) {
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
) {
  if (fileId == null || String(fileId).trim() === "") {
    return "";
  }
  const shard = mediaShard(fileId);
  const base = `${normalizeCdnBaseUrl()}/media/v1/files/${shard}/${fileId}`;
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
) {
  return mediaUrl(fileId, normalizeMediaType(mediaType), quality);
}

export function mediaFileUrlWithQuality(
  rawUrl: string | null | undefined,
  mediaType: MediaType,
  quality: MediaQuality,
) {
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

export function imageUrlWithQuality(rawUrl: string | null | undefined, quality: MediaQuality) {
  return mediaFileUrlWithQuality(rawUrl, "image", quality);
}

export function mediaPreviewUrl(
  fileId: number | string | null | undefined,
  mediaType: string | null | undefined,
) {
  const resolvedType = normalizeMediaType(mediaType);
  if (resolvedType === "image") {
    return mediaUrl(fileId, resolvedType, "medium");
  }
  if (resolvedType === "audio" || resolvedType === "video") {
    return mediaUrl(fileId, resolvedType, "high");
  }
  return mediaUrl(fileId, resolvedType, "original");
}

export function mediaThumbUrl(
  fileId: number | string | null | undefined,
  mediaType: string | null | undefined,
) {
  const resolvedType = normalizeMediaType(mediaType);
  if (resolvedType === "image") {
    return mediaUrl(fileId, resolvedType, "low");
  }
  return mediaPreviewUrl(fileId, resolvedType);
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

export const imageLowUrl = (fileId?: number | string | null) => mediaUrl(fileId, "image", "low");
export const imageMediumUrl = (fileId?: number | string | null) => mediaUrl(fileId, "image", "medium");
export const imageHighUrl = (fileId?: number | string | null) => mediaUrl(fileId, "image", "high");
export const imageOriginalUrl = (fileId?: number | string | null) => mediaUrl(fileId, "image", "original");
export const imageLowUrlFromUrl = (url?: string | null) => imageUrlWithQuality(url, "low");
export const imageMediumUrlFromUrl = (url?: string | null) => imageUrlWithQuality(url, "medium");
export const imageHighUrlFromUrl = (url?: string | null) => imageUrlWithQuality(url, "high");
export const imageOriginalUrlFromUrl = (url?: string | null) => imageUrlWithQuality(url, "original");
export const avatarThumbUrl = (fileId?: number | string | null) => mediaUrl(fileId, "image", "low");
export const avatarUrl = (fileId?: number | string | null) => mediaUrl(fileId, "image", "medium");
export const avatarOriginalUrl = (fileId?: number | string | null) => mediaUrl(fileId, "image", "original");
