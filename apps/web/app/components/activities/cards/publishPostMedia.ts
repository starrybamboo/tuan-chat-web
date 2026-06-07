import type { MomentFeedRequest } from "@tuanchat/openapi-client/models/MomentFeedRequest";
import type { Sticker } from "@tuanchat/openapi-client/models/Sticker";

import { mediaFileUrl } from "@/utils/mediaUrl";

export type PublishPostImageAsset = {
  id: string;
  file?: File;
  previewUrl: string;
  fileId?: number;
  mediaType?: string;
  uploading: boolean;
  error?: string | null;
  isEmoji?: boolean;
  name?: string;
  size?: number;
};

export type BuildMomentFeedRequestResult = {
  request: MomentFeedRequest;
  invalidImageIds: string[];
};

function isPositiveFileId(fileId: unknown): fileId is number {
  return typeof fileId === "number" && Number.isFinite(fileId) && fileId > 0;
}

function resolveImageMediaType(mediaType: string | null | undefined): string {
  return typeof mediaType === "string" && mediaType.trim() ? mediaType.trim() : "image";
}

export function getPublishPostImagePreviewUrl(image: Pick<PublishPostImageAsset, "fileId" | "mediaType" | "previewUrl">): string {
  return mediaFileUrl(image.fileId, resolveImageMediaType(image.mediaType), "medium") || image.previewUrl;
}

export function createStickerPublishImage(sticker: Sticker | null | undefined): PublishPostImageAsset | null {
  if (!sticker || !isPositiveFileId(sticker.fileId)) {
    return null;
  }

  const mediaType = resolveImageMediaType(sticker.mediaType);
  const previewUrl = mediaFileUrl(sticker.fileId, mediaType, "medium");
  if (!previewUrl) {
    return null;
  }

  return {
    id: `emoji_${sticker.stickerId ?? sticker.fileId}`,
    fileId: sticker.fileId,
    mediaType,
    previewUrl,
    uploading: false,
    isEmoji: true,
    error: null,
    name: sticker.name,
    size: sticker.fileSize,
  };
}

export function buildMomentFeedRequestFromPostMedia(
  content: string,
  images: readonly PublishPostImageAsset[],
): BuildMomentFeedRequestResult {
  const imageUrls: string[] = [];
  const originalImageUrls: string[] = [];
  const invalidImageIds: string[] = [];

  for (const image of images) {
    if (!isPositiveFileId(image.fileId)) {
      invalidImageIds.push(image.id);
      continue;
    }

    const mediaType = resolveImageMediaType(image.mediaType);
    const imageUrl = mediaFileUrl(image.fileId, mediaType, "medium");
    const originalImageUrl = mediaFileUrl(image.fileId, mediaType, "original");
    if (!imageUrl || !originalImageUrl) {
      invalidImageIds.push(image.id);
      continue;
    }

    imageUrls.push(imageUrl);
    originalImageUrls.push(originalImageUrl);
  }

  const request: MomentFeedRequest = {
    content: content.trim(),
  };
  if (imageUrls.length > 0) {
    request.imageUrls = imageUrls;
  }
  if (originalImageUrls.length > 0) {
    request.originalImageUrls = originalImageUrls;
  }

  return { request, invalidImageIds };
}
