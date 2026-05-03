export type MobileMediaQuality = "original" | "low" | "medium" | "high";
export type MobileMediaType = "image" | "audio" | "video" | "document" | "other";

const DEFAULT_MEDIA_CDN_BASE_URL = "https://tuan.chat";

function mediaShard(fileId: number | string) {
  const numericFileId = Number(fileId);
  return Math.floor(Math.abs(numericFileId) % 1000).toString().padStart(3, "0");
}

export function mediaFileUrl(fileId: number, mediaType: MobileMediaType, quality: MobileMediaQuality) {
  const base = `${DEFAULT_MEDIA_CDN_BASE_URL}/media/v1/files/${mediaShard(fileId)}/${fileId}`;
  if (quality === "original") {
    return `${base}/original`;
  }
  if (mediaType === "image") {
    return `${base}/image/${quality}.webp`;
  }
  if (mediaType === "audio") {
    return `${base}/audio/${quality}.webm`;
  }
  if (mediaType === "video") {
    return `${base}/video/${quality}.webm`;
  }
  return `${base}/original`;
}

export function avatarThumbUrl(fileId: number | null | undefined) {
  return fileId == null ? "" : mediaFileUrl(fileId, "image", "low");
}
