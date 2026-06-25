import type { MediaQuality, MediaType } from "@/utils/media/imgCompressUtils";

import { mediaFileUrl } from "@/utils/media/mediaUrl";

type MessageMediaSourcePayload = {
  kind?: string;
  fileId?: number;
  url?: string;
};

export type MessageMediaPayloadWithSource = {
  source?: MessageMediaSourcePayload;
  fileId?: number;
};

export function internalMessageMediaSource(fileId: number) {
  return { kind: "internal", fileId };
}

export function externalMessageMediaSource(url: string, provider?: string) {
  return provider ? { kind: "external", url, provider } : { kind: "external", url };
}

export function resolveMessageMediaUrl(
  payload: MessageMediaPayloadWithSource | undefined,
  quality: MediaQuality,
  expectedMediaType: MediaType,
) {
  const source = payload?.source;
  if (source?.kind === "external") {
    return typeof source.url === "string" ? source.url : "";
  }
  const internalFileId = source?.kind === "internal" ? source.fileId : payload?.fileId;
  if (typeof internalFileId === "number" && internalFileId <= 0) {
    return "";
  }
  if (typeof internalFileId !== "number") {
    return "";
  }
  return mediaFileUrl(internalFileId, expectedMediaType, quality);
}
