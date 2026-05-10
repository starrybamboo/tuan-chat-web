import type { MinimalDocMeta } from "@/components/chat/room/sidebarTree";

import { isNonRetryableBlocksuiteDocError } from "@/components/chat/infra/doc/shared/blocksuiteDocError";
import { parseSpaceDocId } from "@/components/chat/infra/doc/space/spaceDocId";

const SPACE_DOC_META_CACHE_KEY_PREFIX = "tc:space-doc-metas:v1:";
const SPACE_DOC_TITLE_SYNC_QUEUE_KEY = "tc:space-doc-title-sync-queue:v1";

type PendingSpaceDocTitleSync = {
  docId: number;
  title: string;
  updatedAt: number;
};

export type PendingSpaceDocTitleSyncMap = Record<string, PendingSpaceDocTitleSync>;

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildSpaceDocMetaCacheKey(spaceId: number): string {
  return `${SPACE_DOC_META_CACHE_KEY_PREFIX}${spaceId}`;
}

function sanitizeDocMetaList(input: unknown): MinimalDocMeta[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const map = new Map<string, MinimalDocMeta>();
  for (const item of input) {
    const id = typeof (item as any)?.id === "string" ? (item as any).id.trim() : "";
    if (!id) {
      continue;
    }
    if (parseSpaceDocId(id)?.kind !== "independent") {
      continue;
    }
    const title = typeof (item as any)?.title === "string" ? (item as any).title.trim() : "";
    const imageUrl = typeof (item as any)?.imageUrl === "string" ? (item as any).imageUrl.trim() : "";
    const imageFileId = typeof (item as any)?.imageFileId === "number" && (item as any).imageFileId > 0
      ? (item as any).imageFileId
      : undefined;
    const originalImageFileId = typeof (item as any)?.originalImageFileId === "number" && (item as any).originalImageFileId > 0
      ? (item as any).originalImageFileId
      : undefined;
    const imageMediaType = typeof (item as any)?.imageMediaType === "string" ? (item as any).imageMediaType.trim() : "";
    const existing = map.get(id);
    if (!existing) {
      map.set(id, {
        id,
        ...(title ? { title } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(imageFileId ? { imageFileId } : {}),
        ...(originalImageFileId ? { originalImageFileId } : {}),
        ...(imageMediaType ? { imageMediaType } : {}),
      });
      continue;
    }
    if (!existing.title && title) {
      existing.title = title;
    }
    if (!existing.imageUrl && imageUrl) {
      existing.imageUrl = imageUrl;
    }
    if (!existing.imageFileId && imageFileId) {
      existing.imageFileId = imageFileId;
    }
    if (!existing.originalImageFileId && originalImageFileId) {
      existing.originalImageFileId = originalImageFileId;
    }
    if (!existing.imageMediaType && imageMediaType) {
      existing.imageMediaType = imageMediaType;
    }
  }

  return [...map.values()];
}

export function readSpaceDocMetaCache(spaceId: number): MinimalDocMeta[] {
  if (!canUseLocalStorage()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(buildSpaceDocMetaCacheKey(spaceId));
    if (!raw) {
      return [];
    }
    return sanitizeDocMetaList(JSON.parse(raw));
  }
  catch {
    return [];
  }
}

export function writeSpaceDocMetaCache(spaceId: number, list: MinimalDocMeta[] | null | undefined): void {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(
      buildSpaceDocMetaCacheKey(spaceId),
      JSON.stringify(sanitizeDocMetaList(list)),
    );
  }
  catch {
    // ignore
  }
}

export function upsertSpaceDocMetaCacheEntry(params: {
  spaceId: number;
  docId: string;
  title?: string;
  imageUrl?: string;
  imageFileId?: number;
  originalImageFileId?: number;
  imageMediaType?: string;
}): void {
  const normalizedSpaceId = Number(params.spaceId);
  const normalizedDocId = typeof params.docId === "string" ? params.docId.trim() : "";
  if (!Number.isFinite(normalizedSpaceId) || normalizedSpaceId <= 0 || parseSpaceDocId(normalizedDocId)?.kind !== "independent") {
    return;
  }

  const current = readSpaceDocMetaCache(normalizedSpaceId);
  const idx = current.findIndex(meta => meta.id === normalizedDocId);
  const title = typeof params.title === "string" ? params.title.trim() : "";
  const imageUrl = typeof params.imageUrl === "string" ? params.imageUrl.trim() : "";
  const imageFileId = typeof params.imageFileId === "number" && params.imageFileId > 0 ? params.imageFileId : undefined;
  const originalImageFileId = typeof params.originalImageFileId === "number" && params.originalImageFileId > 0
    ? params.originalImageFileId
    : undefined;
  const imageMediaType = typeof params.imageMediaType === "string" ? params.imageMediaType.trim() : "";

  const nextMeta: MinimalDocMeta = {
    id: normalizedDocId,
    ...(title ? { title } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageFileId ? { imageFileId } : {}),
    ...(originalImageFileId ? { originalImageFileId } : {}),
    ...(imageMediaType ? { imageMediaType } : {}),
  };

  if (idx < 0) {
    writeSpaceDocMetaCache(normalizedSpaceId, [...current, nextMeta]);
    return;
  }

  const prev = current[idx];
  if (prev?.title === nextMeta.title
    && prev?.imageUrl === nextMeta.imageUrl
    && prev?.imageFileId === nextMeta.imageFileId
    && prev?.originalImageFileId === nextMeta.originalImageFileId
    && prev?.imageMediaType === nextMeta.imageMediaType) {
    return;
  }

  const next = [...current];
  next[idx] = nextMeta;
  writeSpaceDocMetaCache(normalizedSpaceId, next);
}

export function removeSpaceDocMetaCacheEntry(params: { spaceId: number; docId: string }): void {
  const normalizedSpaceId = Number(params.spaceId);
  const normalizedDocId = typeof params.docId === "string" ? params.docId.trim() : "";
  if (!Number.isFinite(normalizedSpaceId) || normalizedSpaceId <= 0 || !normalizedDocId) {
    return;
  }

  const current = readSpaceDocMetaCache(normalizedSpaceId);
  if (!current.some(meta => meta.id === normalizedDocId)) {
    return;
  }

  writeSpaceDocMetaCache(
    normalizedSpaceId,
    current.filter(meta => meta.id !== normalizedDocId),
  );
}

export function readPendingSpaceDocTitleSyncMap(): PendingSpaceDocTitleSyncMap {
  if (!canUseLocalStorage()) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(SPACE_DOC_TITLE_SYNC_QUEUE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }

    const map: PendingSpaceDocTitleSyncMap = {};
    for (const value of Object.values(parsed)) {
      if (!isRecord(value)) {
        continue;
      }
      const docId = Number((value as any).docId);
      const title = String((value as any).title ?? "").trim();
      const updatedAt = Number((value as any).updatedAt);
      if (!Number.isFinite(docId) || docId <= 0 || !title) {
        continue;
      }
      map[String(docId)] = {
        docId,
        title,
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
      };
    }
    return map;
  }
  catch {
    return {};
  }
}

function writePendingSpaceDocTitleSyncMap(map: PendingSpaceDocTitleSyncMap): void {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(SPACE_DOC_TITLE_SYNC_QUEUE_KEY, JSON.stringify(map));
  }
  catch {
    // ignore
  }
}

export function upsertPendingSpaceDocTitleSync(item: { docId: number; title: string }): void {
  const docId = Number(item.docId);
  const title = String(item.title ?? "").trim();
  if (!Number.isFinite(docId) || docId <= 0 || !title) {
    return;
  }

  const map = readPendingSpaceDocTitleSyncMap();
  map[String(docId)] = {
    docId,
    title,
    updatedAt: Date.now(),
  };
  writePendingSpaceDocTitleSyncMap(map);
}

export function removePendingSpaceDocTitleSync(docId: number): void {
  const normalizedDocId = Number(docId);
  if (!Number.isFinite(normalizedDocId) || normalizedDocId <= 0) {
    return;
  }

  const map = readPendingSpaceDocTitleSyncMap();
  if (!map[String(normalizedDocId)]) {
    return;
  }
  delete map[String(normalizedDocId)];
  writePendingSpaceDocTitleSyncMap(map);
}

export function isSpaceDocTitleSyncNonRetryableError(error: unknown): boolean {
  return isNonRetryableBlocksuiteDocError(error);
}
