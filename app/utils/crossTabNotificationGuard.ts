type TabPresenceEntry = {
  selected: boolean;
  updatedAt: number;
};

type TabPresenceMap = Record<string, TabPresenceEntry>;

const TAB_PRESENCE_STORAGE_PREFIX = "tc:notify:tab-presence:v1:";
const TAB_PRESENCE_HEARTBEAT_MS = 20_000;
const TAB_PRESENCE_STALE_MS = 120_000;

function getTabPresenceStorageKey(tabId: string): string {
  return `${TAB_PRESENCE_STORAGE_PREFIX}${tabId}`;
}

function createTabId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parsePresenceEntry(raw: string | null): TabPresenceEntry | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const selected = (parsed as Record<string, unknown>).selected;
    const updatedAt = (parsed as Record<string, unknown>).updatedAt;
    if (typeof selected !== "boolean" || typeof updatedAt !== "number" || !Number.isFinite(updatedAt) || updatedAt <= 0) {
      return null;
    }

    return { selected, updatedAt };
  }
  catch {
    return null;
  }
}

function readPresenceMap(): TabPresenceMap {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return {};
  }

  const result: TabPresenceMap = {};
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(TAB_PRESENCE_STORAGE_PREFIX)) {
        continue;
      }

      const tabId = key.slice(TAB_PRESENCE_STORAGE_PREFIX.length);
      if (!tabId) {
        continue;
      }

      const entry = parsePresenceEntry(window.localStorage.getItem(key));
      if (!entry) {
        continue;
      }

      result[tabId] = entry;
    }
  }
  catch {
    // ignore localStorage read failures
  }

  return result;
}

function writePresenceEntry(tabId: string, entry: TabPresenceEntry): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getTabPresenceStorageKey(tabId), JSON.stringify(entry));
  }
  catch {
    // ignore localStorage write failures
  }
}

function removePresenceEntry(tabId: string): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(getTabPresenceStorageKey(tabId));
  }
  catch {
    // ignore localStorage write failures
  }
}

function prunePresenceMap(presenceMap: TabPresenceMap, now: number): TabPresenceMap {
  const nextMap: TabPresenceMap = {};
  for (const [tabId, entry] of Object.entries(presenceMap)) {
    if (!entry || typeof entry.updatedAt !== "number") {
      removePresenceEntry(tabId);
      continue;
    }
    if (now - entry.updatedAt > TAB_PRESENCE_STALE_MS) {
      removePresenceEntry(tabId);
      continue;
    }
    nextMap[tabId] = entry;
  }
  return nextMap;
}

function upsertCurrentTabPresence(tabId: string, selected: boolean, now: number): TabPresenceMap {
  const currentPresence = readPresenceMap();
  const nextPresence = prunePresenceMap(currentPresence, now);
  const currentEntry: TabPresenceEntry = {
    selected,
    updatedAt: now,
  };
  nextPresence[tabId] = currentEntry;
  writePresenceEntry(tabId, currentEntry);
  return nextPresence;
}

export function isCurrentTabSelected(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  if (document.visibilityState !== "visible") {
    return false;
  }

  if (typeof document.hasFocus === "function") {
    return document.hasFocus();
  }

  return true;
}

export type CrossTabNotificationGuard = {
  isCurrentTabSelected: () => boolean;
  shouldShowSystemNotification: () => boolean;
  dispose: () => void;
};

export function createCrossTabNotificationGuard(): CrossTabNotificationGuard {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      isCurrentTabSelected: () => false,
      shouldShowSystemNotification: () => false,
      dispose: () => {},
    };
  }

  const tabId = createTabId();
  let disposed = false;

  const syncPresence = () => {
    if (disposed) {
      return;
    }

    const now = Date.now();
    upsertCurrentTabPresence(tabId, isCurrentTabSelected(), now);
  };

  const removePresence = () => {
    removePresenceEntry(tabId);
  };

  const shouldShowSystemNotification = () => {
    if (disposed) {
      return false;
    }

    const now = Date.now();
    const nextPresence = upsertCurrentTabPresence(tabId, isCurrentTabSelected(), now);

    const tabIds = Object.keys(nextPresence).sort();
    if (tabIds.length === 0) {
      return false;
    }

    const hasSelectedTab = tabIds.some(id => nextPresence[id].selected);
    if (hasSelectedTab) {
      return false;
    }

    return tabIds[0] === tabId;
  };

  const handleVisibilityChange = () => {
    syncPresence();
  };
  const handleWindowFocus = () => {
    syncPresence();
  };
  const handleWindowBlur = () => {
    syncPresence();
  };
  const handlePageHide = () => {
    removePresence();
  };
  const handleBeforeUnload = () => {
    removePresence();
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleWindowFocus);
  window.addEventListener("blur", handleWindowBlur);
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("beforeunload", handleBeforeUnload);

  const heartbeatTimer = window.setInterval(() => {
    syncPresence();
  }, TAB_PRESENCE_HEARTBEAT_MS);

  syncPresence();

  return {
    isCurrentTabSelected,
    shouldShowSystemNotification,
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;

      window.clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      removePresence();
    },
  };
}
