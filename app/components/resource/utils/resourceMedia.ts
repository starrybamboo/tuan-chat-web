import type { ResourceResponse } from "@tuanchat/openapi-client/models/ResourceResponse";
import type { MediaType } from "@/utils/imgCompressUtils";

import { mediaPreviewUrl } from "@/utils/mediaUrl";

const VALID_MEDIA_TYPES = new Set<MediaType>(["image", "audio", "video", "document", "other"]);

export function resolveResourceMediaType(resource: Pick<ResourceResponse, "mediaType" | "type">): MediaType {
  const explicitMediaType = typeof resource.mediaType === "string" ? resource.mediaType.trim() : "";
  if (VALID_MEDIA_TYPES.has(explicitMediaType as MediaType)) {
    return explicitMediaType as MediaType;
  }

  const normalizedType = String(resource.type ?? "").trim();
  if (normalizedType === "6") {
    return "audio";
  }
  if (normalizedType === "5") {
    return "image";
  }

  return "image";
}

export function resolveResourcePreviewUrl(
  resource: Pick<ResourceResponse, "fileId" | "mediaType" | "type">,
) {
  return mediaPreviewUrl(resource.fileId, resolveResourceMediaType(resource));
}
