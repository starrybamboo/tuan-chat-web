type RealtimeRenderSettingsRow = {
  key: "global";
  ttsApiUrl: string;
  terrePort: number | null;
  autoFigureEnabled?: boolean;
  coverFromRoomAvatarEnabled?: boolean;
  startupLogoFromRoomAvatarEnabled?: boolean;
  gameIconFromRoomAvatarEnabled?: boolean;
  gameNameFromRoomNameEnabled?: boolean;
  description?: string;
  packageName?: string;
  showPanicEnabled?: boolean;
  defaultLanguage?: string;
  enableAppreciation?: boolean;
  typingSoundEnabled?: boolean;
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
  coverFromRoomAvatarEnabled?: boolean;
  startupLogoFromRoomAvatarEnabled?: boolean;
  gameIconFromRoomAvatarEnabled?: boolean;
  gameNameFromRoomNameEnabled?: boolean;
  description?: string;
  packageName?: string;
  showPanicEnabled?: boolean;
  defaultLanguage?: string;
  enableAppreciation?: boolean;
  typingSoundEnabled?: boolean;
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
            coverFromRoomAvatarEnabled: row.coverFromRoomAvatarEnabled,
            startupLogoFromRoomAvatarEnabled: row.startupLogoFromRoomAvatarEnabled,
            gameIconFromRoomAvatarEnabled: row.gameIconFromRoomAvatarEnabled,
            gameNameFromRoomNameEnabled: row.gameNameFromRoomNameEnabled,
            description: row.description,
            packageName: row.packageName,
            showPanicEnabled: row.showPanicEnabled,
            defaultLanguage: row.defaultLanguage,
            enableAppreciation: row.enableAppreciation,
            typingSoundEnabled: row.typingSoundEnabled,
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
  coverFromRoomAvatarEnabled?: boolean;
  startupLogoFromRoomAvatarEnabled?: boolean;
  gameIconFromRoomAvatarEnabled?: boolean;
  gameNameFromRoomNameEnabled?: boolean;
  description?: string;
  packageName?: string;
  showPanicEnabled?: boolean;
  defaultLanguage?: string;
  enableAppreciation?: boolean;
  typingSoundEnabled?: boolean;
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
      coverFromRoomAvatarEnabled: "coverFromRoomAvatarEnabled" in settings
        ? settings.coverFromRoomAvatarEnabled
        : row?.coverFromRoomAvatarEnabled,
      startupLogoFromRoomAvatarEnabled: "startupLogoFromRoomAvatarEnabled" in settings
        ? settings.startupLogoFromRoomAvatarEnabled
        : row?.startupLogoFromRoomAvatarEnabled,
      gameIconFromRoomAvatarEnabled: "gameIconFromRoomAvatarEnabled" in settings
        ? settings.gameIconFromRoomAvatarEnabled
        : row?.gameIconFromRoomAvatarEnabled,
      gameNameFromRoomNameEnabled: "gameNameFromRoomNameEnabled" in settings
        ? settings.gameNameFromRoomNameEnabled
        : row?.gameNameFromRoomNameEnabled,
      description: "description" in settings
        ? settings.description ?? ""
        : row?.description,
      packageName: "packageName" in settings
        ? settings.packageName ?? ""
        : row?.packageName,
      showPanicEnabled: "showPanicEnabled" in settings
        ? settings.showPanicEnabled
        : row?.showPanicEnabled,
      defaultLanguage: "defaultLanguage" in settings
        ? settings.defaultLanguage ?? ""
        : row?.defaultLanguage,
      enableAppreciation: "enableAppreciation" in settings
        ? settings.enableAppreciation
        : row?.enableAppreciation,
      typingSoundEnabled: "typingSoundEnabled" in settings
        ? settings.typingSoundEnabled
        : row?.typingSoundEnabled,
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
