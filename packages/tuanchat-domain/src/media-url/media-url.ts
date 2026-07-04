import type { MediaQuality, MediaQualityInput, MediaType } from "./types";

const MEDIA_EXT: Partial<Record<MediaType, string>> = {
  image: "webp",
  audio: "webm",
  video: "webm",
};

const DEFAULT_MEDIA_CDN_BASE_URL = "https://media.tuan.chat";
const FALLBACK_MEDIA_TYPE: MediaType = "image";
const MEDIA_FILE_URL_PATTERN = /^(?<prefix>.*?\/media\/v1\/files\/)(?<shard>\d{3})\/(?<fileId>\d+)\/(?:(?<mediaType>image|audio|video|document|other)\/(?<quality>low|medium|high)(?:\.[^/?#]+)?|original)(?:[?#].*)?$/;

function resolveAvailableQuality(mediaType: MediaType, quality: MediaQuality): MediaQuality {
  if (quality !== "original" && (mediaType === "audio" || mediaType === "video" || mediaType === "document" || mediaType === "other")) {
    return "low";
  }
  return quality;
}

function mediaQualityPath(mediaType: MediaType, quality: MediaQuality): string | null {
  const ext = MEDIA_EXT[mediaType];
  if (ext) {
    return `${mediaType}/${quality}.${ext}`;
  }
  if (mediaType === "document" || mediaType === "other") {
    return `${mediaType}/${quality}`;
  }
  return null;
}

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
  quality: MediaQualityInput,
  cdnBaseUrl?: string,
): string {
  if (fileId == null || String(fileId).trim() === "") {
    return undefined as unknown as string;
  }
  const shard = mediaShard(fileId);
  const base = `${(cdnBaseUrl ?? DEFAULT_MEDIA_CDN_BASE_URL).replace(/\/$/, "")}/media/v1/files/${shard}/${fileId}`;
  const resolvedQuality = resolveAvailableQuality(mediaType, quality);
  if (resolvedQuality === "original") {
    return `${base}/original`;
  }
  const qualityPath = mediaQualityPath(mediaType, resolvedQuality);
  if (!qualityPath) {
    return `${base}/original`;
  }
  return `${base}/${qualityPath}`;
}

export function mediaFileUrl(
  fileId: number | string | null | undefined,
  mediaType: string | null | undefined,
  quality: MediaQualityInput,
  cdnBaseUrl?: string,
): string {
  return mediaUrl(fileId, normalizeMediaType(mediaType), quality, cdnBaseUrl);
}

export function mediaFileUrlWithQuality(
  rawUrl: string | null | undefined,
  mediaType: MediaType,
  quality: MediaQualityInput,
): string {
  const value = String(rawUrl ?? "").trim();
  if (!value) {
    return undefined as unknown as string;
  }
  const match = value.match(MEDIA_FILE_URL_PATTERN);
  const groups = match?.groups;
  if (!groups?.prefix || !groups.shard || !groups.fileId) {
    return value;
  }

  const base = `${groups.prefix}${groups.shard}/${groups.fileId}`;
  const resolvedQuality = resolveAvailableQuality(mediaType, quality);
  if (resolvedQuality === "original") {
    return `${base}/original`;
  }
  const qualityPath = mediaQualityPath(mediaType, resolvedQuality);
  if (!qualityPath) {
    return `${base}/original`;
  }
  return `${base}/${qualityPath}`;
}

export function imageUrlWithQuality(rawUrl: string | null | undefined, quality: MediaQualityInput): string {
  return mediaFileUrlWithQuality(rawUrl, "image", quality);
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
export const avatarUrl = (fileId?: number | string | null, cdnBaseUrl?: string) => mediaUrl(fileId, "image", "medium", cdnBaseUrl);
export const avatarOriginalUrl = (fileId?: number | string | null, cdnBaseUrl?: string) => mediaUrl(fileId, "image", "original", cdnBaseUrl);
