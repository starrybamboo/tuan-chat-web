import type { StoredSnapshot } from "@/components/chat/infra/doc/description/descriptionDocRemote";

type SnapshotListener = (snapshot: StoredSnapshot | null) => void;

const snapshotCache = new Map<string, StoredSnapshot | null>();
const snapshotListeners = new Map<string, Set<SnapshotListener>>();

export function getCachedDocSnapshot(docId: string): StoredSnapshot | null {
  return snapshotCache.get(docId) ?? null;
}

export function setCachedDocSnapshot(docId: string, snapshot: StoredSnapshot | null) {
  const key = String(docId ?? "").trim();
  if (!key) {
    return;
  }

  const previous = snapshotCache.get(key) ?? null;
  if (previous === snapshot) {
    return;
  }

  if (snapshot) {
    snapshotCache.set(key, snapshot);
  }
  else {
    snapshotCache.delete(key);
  }

  const listeners = snapshotListeners.get(key);
  if (!listeners?.size) {
    return;
  }

  for (const listener of listeners) {
    listener(snapshot ?? null);
  }
}

export function subscribeCachedDocSnapshot(docId: string, listener: SnapshotListener): () => void {
  const key = String(docId ?? "").trim();
  if (!key) {
    return () => {};
  }

  const current = snapshotListeners.get(key) ?? new Set<SnapshotListener>();
  current.add(listener);
  snapshotListeners.set(key, current);

  return () => {
    const existing = snapshotListeners.get(key);
    if (!existing) {
      return;
    }
    existing.delete(listener);
    if (existing.size === 0) {
      snapshotListeners.delete(key);
    }
  };
}
