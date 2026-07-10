import { isNonRetryableDocEntityError } from "@/components/chat/infra/doc/shared/docEntityError";

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
  return isNonRetryableDocEntityError(error);
}
