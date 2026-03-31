type SidebarExpandedState = {
  key: string;
  expandedByKey?: Record<string, boolean>;
  expandedByCategoryId?: Record<string, boolean>;
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

function buildKey(params: { userId: number | null | undefined; spaceId: number; scope?: string }): string {
  const userSeg = typeof params.userId === "number" && Number.isFinite(params.userId) ? String(params.userId) : "anon";
  const scopeSeg = params.scope?.trim() || "room-doc-tree";
  return `${userSeg}:${params.spaceId}:${scopeSeg}`;
}

export async function getSidebarExpandedMap(params: {
  userId: number | null | undefined;
  spaceId: number;
  scope: string;
}): Promise<Record<string, boolean> | null> {
  const db = await openUiDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const key = buildKey(params);
  const request = store.get(key);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const row = request.result as SidebarExpandedState | undefined;
      resolve(row?.expandedByKey ?? row?.expandedByCategoryId ?? null);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function setSidebarExpandedMap(params: {
  userId: number | null | undefined;
  spaceId: number;
  scope: string;
  expandedByKey: Record<string, boolean>;
}): Promise<void> {
  const db = await openUiDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const key = buildKey(params);

  store.put({
    key,
    expandedByKey: params.expandedByKey,
    expandedByCategoryId: params.expandedByKey,
    updatedAt: Date.now(),
  } satisfies SidebarExpandedState);

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

