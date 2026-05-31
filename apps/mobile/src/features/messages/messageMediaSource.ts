import type { MediaQuality, MediaType } from "../../lib/media-url";

import { mediaFileUrl } from "../../lib/media-url";

type MessageMediaSourcePayload = {
  fileId?: number | null;
  kind?: string | null;
  url?: string | null;
};

export type MessageMediaPayloadWithSource = {
  fileId?: number | null;
  source?: MessageMediaSourcePayload | null;
};

export function resolveInternalMessageMediaFileId(payload: MessageMediaPayloadWithSource | null | undefined): number | null {
  const source = payload?.source;
  const fileId = source?.kind === "internal"
    ? source.fileId
    : payload?.fileId;
  return typeof fileId === "number" && fileId > 0 ? fileId : null;
}

export function resolveMessageMediaUrl(
  payload: MessageMediaPayloadWithSource | null | undefined,
  quality: MediaQuality,
  expectedMediaType: MediaType,
): string {
  const source = payload?.source;
  if (source?.kind === "external") {
    return typeof source.url === "string" ? source.url : "";
  }

  const fileId = resolveInternalMessageMediaFileId(payload);
  return fileId ? mediaFileUrl(fileId, expectedMediaType, quality) : "";
}
