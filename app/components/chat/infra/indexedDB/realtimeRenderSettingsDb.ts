type RealtimeRenderSettingsRow = {
  key: "global";
  ttsApiUrl: string;
  terrePort: number | null;
  autoFigureEnabled?: boolean;
  updatedAt: number;
};

const DB_NAME = "tuanChatRealtimeRenderSettingsDB";
const STORE_NAME = "settings";
const DB_VERSION = 1;
const KEY: RealtimeRenderSettingsRow["key"] = "global";

function canUseIndexedDB(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openSettingsDb(): Promise<IDBDatabase> {
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

export async function getRealtimeRenderSettings(): Promise<{
  ttsApiUrl: string;
  terrePort: number | null;
  autoFigureEnabled?: boolean;
} | null> {
  if (!canUseIndexedDB()) {
    return null;
  }

  const db = await openSettingsDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(KEY);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const row = request.result as RealtimeRenderSettingsRow | undefined;
      resolve(row
        ? {
            ttsApiUrl: row.ttsApiUrl,
            terrePort: row.terrePort,
            autoFigureEnabled: row.autoFigureEnabled,
          }
        : null);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export async function setRealtimeRenderSettings(settings: {
  ttsApiUrl?: string;
  terrePort?: number | null;
  autoFigureEnabled?: boolean;
}): Promise<void> {
  if (!canUseIndexedDB()) {
    return;
  }

  const db = await openSettingsDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(KEY);

  // Merge partial updates with existing row to avoid clobbering other settings.
  request.onsuccess = () => {
    const row = request.result as RealtimeRenderSettingsRow | undefined;
    const nextRow: RealtimeRenderSettingsRow = {
      key: KEY,
      ttsApiUrl: "ttsApiUrl" in settings ? settings.ttsApiUrl ?? "" : row?.ttsApiUrl ?? "",
      terrePort: "terrePort" in settings ? settings.terrePort ?? null : row?.terrePort ?? null,
      autoFigureEnabled: "autoFigureEnabled" in settings ? settings.autoFigureEnabled : row?.autoFigureEnabled,
      updatedAt: Date.now(),
    };

    store.put(nextRow);
  };
  request.onerror = () => {
    tx.abort();
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
