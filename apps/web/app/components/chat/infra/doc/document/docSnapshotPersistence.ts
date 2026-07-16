import type { StoredSnapshot } from "@/components/chat/infra/doc/document/docSnapshotTypes";

import { loadChatHistoryDb } from "@/components/chat/infra/localDb/chatHistoryDbLoader";

const DOC_SNAPSHOT_KEY_PREFIX = "doc-snapshot:";

function normalizeDocId(docId: string): string {
  return String(docId ?? "").trim();
}

function getDocSnapshotKey(docId: string): string {
  return `${DOC_SNAPSHOT_KEY_PREFIX}${docId}`;
}

function isStoredSnapshot(value: unknown): value is StoredSnapshot {
  const snapshot = value as Partial<StoredSnapshot> | null | undefined;
  return Boolean(snapshot)
    && snapshot?.v === 4
    && snapshot?.format === "message-stream"
    && typeof snapshot?.updateB64 === "string"
    && typeof snapshot?.updatedAt === "number"
    && Number.isFinite(snapshot.updatedAt);
}

export async function getPersistedDocSnapshot(docId: string): Promise<StoredSnapshot | null> {
  const key = normalizeDocId(docId);
  if (!key) {
    return null;
  }

  const db = await loadChatHistoryDb();
  const sqliteSnapshot = await db.getLocalValue<StoredSnapshot>(getDocSnapshotKey(key));
  if (isStoredSnapshot(sqliteSnapshot)) {
    return sqliteSnapshot;
  }
  return null;
}

export async function setPersistedDocSnapshot(docId: string, snapshot: StoredSnapshot): Promise<void> {
  const key = normalizeDocId(docId);
  if (!key) {
    return;
  }

  const db = await loadChatHistoryDb();
  await db.setLocalValue(getDocSnapshotKey(key), snapshot);
}

export async function removePersistedDocSnapshot(docId: string): Promise<void> {
  const key = normalizeDocId(docId);
  if (!key) {
    return;
  }

  const db = await loadChatHistoryDb();
  await db.removeLocalValue(getDocSnapshotKey(key));
}
