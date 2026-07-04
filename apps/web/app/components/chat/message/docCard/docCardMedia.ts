import { getDocCardExtra } from "@/types/messageExtra";
import { imageLowUrl, imageMediumUrl } from "@/utils/media/mediaUrl";

type DocCardCoverQuality = "low" | "medium";

export type DocCardCoverSource = {
  imageFileId?: unknown;
  imageMediaType?: unknown;
  originalImageFileId?: unknown;
};

export type DocCardReferencePayload = {
  docId: string;
  excerpt?: string;
  imageFileId?: number;
  imageMediaType?: string;
  originalImageFileId?: number;
  roomId?: number;
  spaceId?: number;
  title?: string;
};

function toPositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return undefined;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getDocCardExtraRecord(extra: unknown): Record<string, unknown> | null {
  return toRecord(getDocCardExtra(extra));
}

export function resolveDocCardCoverFileId(source: DocCardCoverSource | null | undefined): number | undefined {
  return toPositiveNumber(source?.imageFileId) ?? toPositiveNumber(source?.originalImageFileId);
}

export function resolveDocCardDisplayCoverUrl(
  source: DocCardCoverSource | null | undefined,
  quality: DocCardCoverQuality = "medium",
): string {
  const coverFileId = resolveDocCardCoverFileId(source);
  const fromFileId = quality === "low" ? imageLowUrl(coverFileId) : imageMediumUrl(coverFileId);
  if (fromFileId) {
    return fromFileId;
  }

  return "";
}

export function buildDocCardCoverReferenceFields(
  source: DocCardCoverSource | null | undefined,
): Pick<DocCardReferencePayload, "imageFileId" | "imageMediaType" | "originalImageFileId"> {
  const imageFileId = toPositiveNumber(source?.imageFileId);
  const originalImageFileId = toPositiveNumber(source?.originalImageFileId);
  const imageMediaType = normalizeText(source?.imageMediaType);

  return {
    ...(imageFileId ? { imageFileId } : {}),
    ...(originalImageFileId ? { originalImageFileId } : {}),
    ...(imageMediaType ? { imageMediaType } : {}),
  };
}

export function buildDocCardReferencePayload(source: {
  docId: string;
  excerpt?: unknown;
  imageFileId?: unknown;
  imageMediaType?: unknown;
  originalImageFileId?: unknown;
  roomId?: unknown;
  spaceId?: unknown;
  title?: unknown;
}): DocCardReferencePayload {
  const docId = normalizeText(source.docId);
  const excerpt = normalizeText(source.excerpt);
  const title = normalizeText(source.title);
  const roomId = toPositiveNumber(source.roomId);
  const spaceId = toPositiveNumber(source.spaceId);

  return {
    docId,
    ...(roomId ? { roomId } : {}),
    ...(spaceId ? { spaceId } : {}),
    ...(title ? { title } : {}),
    ...buildDocCardCoverReferenceFields(source),
    ...(excerpt ? { excerpt: excerpt.slice(0, 512) } : {}),
  };
}

export function extractDocCardReferencePayload(extra: unknown): DocCardReferencePayload | null {
  const docCard = getDocCardExtraRecord(extra);
  const roomId = toPositiveNumber(docCard?.roomId);
  const spaceId = toPositiveNumber(docCard?.spaceId);
  const rawDocId = normalizeText(docCard?.docId);
  const docId = rawDocId || (roomId ? String(roomId) : "");
  if (!docId) {
    return null;
  }

  return buildDocCardReferencePayload({
    docId,
    ...(roomId ? { roomId } : {}),
    ...(spaceId ? { spaceId } : {}),
    title: docCard?.title,
    imageFileId: docCard?.imageFileId,
    originalImageFileId: docCard?.originalImageFileId,
    imageMediaType: docCard?.imageMediaType,
    excerpt: docCard?.excerpt,
  });
}
