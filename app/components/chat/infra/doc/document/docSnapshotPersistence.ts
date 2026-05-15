import type { StoredSnapshot } from "@/components/chat/infra/doc/document/docSnapshotTypes";

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

export async function getPersistedDocSnapshot(docId: string): Promise<StoredSnapshot | null> {
  const key = normalizeDocId(docId);
  if (!key || !canUseIndexedDB()) {
    return null;
  }

  const db = await openDocSnapshotDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(key);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const row = request.result as DocSnapshotRow | undefined;
      resolve(isStoredSnapshot(row?.snapshot) ? row.snapshot : null);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function setPersistedDocSnapshot(docId: string, snapshot: StoredSnapshot): Promise<void> {
  const key = normalizeDocId(docId);
  if (!key || !canUseIndexedDB()) {
    return;
  }

  const db = await openDocSnapshotDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.put({
    docId: key,
    snapshot,
    updatedAt: Date.now(),
  } satisfies DocSnapshotRow);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function removePersistedDocSnapshot(docId: string): Promise<void> {
  const key = normalizeDocId(docId);
  if (!key || !canUseIndexedDB()) {
    return;
  }

  const db = await openDocSnapshotDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.delete(key);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
