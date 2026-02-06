type ComposerAnnotationsRow = {
  key: string;
  roomId: number;
  roleId: number;
  annotations: string[];
  updatedAt: number;
};

const DB_NAME = "tuanChatComposerAnnotationsDB";
const STORE_NAME = "annotations";
const DB_VERSION = 1;

function canUseIndexedDB(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function makeKey(roomId: number, roleId: number) {
  return `${roomId}:${roleId}`;
}

function openComposerAnnotationsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getComposerAnnotations(params: {
  roomId: number;
  roleId: number;
}): Promise<string[] | null> {
  if (!canUseIndexedDB()) {
    return null;
  }

  const db = await openComposerAnnotationsDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(makeKey(params.roomId, params.roleId));

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const row = request.result as ComposerAnnotationsRow | undefined;
      resolve(row?.annotations ?? null);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export async function setComposerAnnotations(params: {
  roomId: number;
  roleId: number;
  annotations: string[];
}): Promise<void> {
  if (!canUseIndexedDB()) {
    return;
  }

  const db = await openComposerAnnotationsDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.put({
    key: makeKey(params.roomId, params.roleId),
    roomId: params.roomId,
    roleId: params.roleId,
    annotations: params.annotations,
    updatedAt: Date.now(),
  } satisfies ComposerAnnotationsRow);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
