import type { StoredSnapshot } from "@/components/chat/infra/doc/document/docSnapshotTypes";

import { loadChatHistoryDb } from "@/components/chat/infra/localDb/chatHistoryDbLoader";

type DocSnapshotRow = {
  docId: string;
  snapshot: StoredSnapshot;
  updatedAt: number;
};

const DB_NAME = "tuanChatDocSnapshotDB";
const STORE_NAME = "docSnapshots";
const DB_VERSION = 1;

function canUseIndexedDB(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function normalizeDocId(docId: string): string {
  return String(docId ?? "").trim();
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

function openDocSnapshotDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "docId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getLegacyIndexedDbSnapshot(docId: string): Promise<StoredSnapshot | null> {
  const key = normalizeDocId(docId);
  if (!key || !canUseIndexedDB()) {
    return null;
  }

  const db = await openDocSnapshotDb();
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    const row = await requestToPromise<DocSnapshotRow | undefined>(request);
    await transactionDone(tx);
    return isStoredSnapshot(row?.snapshot) ? row.snapshot : null;
  }
  finally {
    db.close();
  }
}

async function removeLegacyIndexedDbSnapshot(docId: string): Promise<void> {
  const key = normalizeDocId(docId);
  if (!key || !canUseIndexedDB()) {
    return;
  }

  const db = await openDocSnapshotDb();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    await transactionDone(tx);
  }
  finally {
    db.close();
  }
}

export async function getPersistedDocSnapshot(docId: string): Promise<StoredSnapshot | null> {
  const key = normalizeDocId(docId);
  if (!key) {
    return null;
  }

  const db = await loadChatHistoryDb();
  const sqliteSnapshot = await db.getDocSnapshot<StoredSnapshot>(key);
  if (isStoredSnapshot(sqliteSnapshot)) {
    return sqliteSnapshot;
  }

  const legacySnapshot = await getLegacyIndexedDbSnapshot(key);
  if (legacySnapshot) {
    await db.setDocSnapshot(key, legacySnapshot);
    await removeLegacyIndexedDbSnapshot(key).catch((error) => {
      console.warn("[DocSnapshot] remove legacy IndexedDB snapshot failed", error);
    });
  }
  return legacySnapshot;
}

export async function setPersistedDocSnapshot(docId: string, snapshot: StoredSnapshot): Promise<void> {
  const key = normalizeDocId(docId);
  if (!key) {
    return;
  }

  const db = await loadChatHistoryDb();
  await db.setDocSnapshot(key, snapshot);
  await removeLegacyIndexedDbSnapshot(key).catch((error) => {
    console.warn("[DocSnapshot] remove legacy IndexedDB snapshot failed", error);
  });
}

export async function removePersistedDocSnapshot(docId: string): Promise<void> {
  const key = normalizeDocId(docId);
  if (!key) {
    return;
  }

  const db = await loadChatHistoryDb();
  await db.removeDocSnapshot(key);
  await removeLegacyIndexedDbSnapshot(key).catch((error) => {
    console.warn("[DocSnapshot] remove legacy IndexedDB snapshot failed", error);
  });
}
