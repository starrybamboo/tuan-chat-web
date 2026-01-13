type SidebarTreeExpandedState = {
  key: string;
  expandedByCategoryId: Record<string, boolean>;
  updatedAt: number;
};

const DB_NAME = "tuanChatUiDB";
const STORE_NAME = "sidebarTreeExpanded";
const DB_VERSION = 1;

function openUiDb(): Promise<IDBDatabase> {
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

function buildKey(params: { userId: number | null | undefined; spaceId: number }): string {
  const userSeg = typeof params.userId === "number" && Number.isFinite(params.userId) ? String(params.userId) : "anon";
  return `${userSeg}:${params.spaceId}`;
}

export async function getSidebarTreeExpandedByCategoryId(params: {
  userId: number | null | undefined;
  spaceId: number;
}): Promise<Record<string, boolean> | null> {
  const db = await openUiDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const key = buildKey(params);
  const request = store.get(key);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const row = request.result as SidebarTreeExpandedState | undefined;
      resolve(row?.expandedByCategoryId ?? null);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function setSidebarTreeExpandedByCategoryId(params: {
  userId: number | null | undefined;
  spaceId: number;
  expandedByCategoryId: Record<string, boolean>;
}): Promise<void> {
  const db = await openUiDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const key = buildKey(params);

  store.put({
    key,
    expandedByCategoryId: params.expandedByCategoryId,
    updatedAt: Date.now(),
  } satisfies SidebarTreeExpandedState);

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
