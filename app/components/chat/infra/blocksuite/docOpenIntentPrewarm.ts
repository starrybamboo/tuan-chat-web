import type { StoredSnapshot } from "@/components/chat/infra/blocksuite/descriptionDocRemote";

import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import { getRemoteSnapshot, getRemoteUpdates } from "@/components/chat/infra/blocksuite/descriptionDocRemote";

type SharedDocOpenIntentPrewarmState = {
  inflight: Map<string, Promise<void>>;
  lastFinishedAt: Map<string, number>;
};

const PREWARM_TTL_MS = 5000;

function snapshotCursor(snapshot: StoredSnapshot | null) {
  if (!snapshot) {
    return 0;
  }
  if (snapshot.v === 2 && typeof snapshot.snapshotServerTime === "number") {
    return Math.max(0, snapshot.snapshotServerTime);
  }
  return Math.max(0, snapshot.updatedAt ?? 0);
}

function createSharedDocOpenIntentPrewarmState(): SharedDocOpenIntentPrewarmState {
  return {
    inflight: new Map<string, Promise<void>>(),
    lastFinishedAt: new Map<string, number>(),
  };
}

function getSharedDocOpenIntentPrewarmState(): SharedDocOpenIntentPrewarmState {
  const stateKey = "__tcDocOpenIntentPrewarmState_v1";
  let owner: any = globalThis as any;

  if (typeof window !== "undefined") {
    try {
      const top = window.top;
      if (top && top.location?.origin === window.location.origin) {
        owner = top as any;
      }
    }
    catch {
      owner = window as any;
    }
  }

  if (!owner[stateKey]) {
    owner[stateKey] = createSharedDocOpenIntentPrewarmState();
  }

  return owner[stateKey] as SharedDocOpenIntentPrewarmState;
}

const sharedDocOpenIntentPrewarmState = getSharedDocOpenIntentPrewarmState();
const inflight = sharedDocOpenIntentPrewarmState.inflight;
const lastFinishedAt = sharedDocOpenIntentPrewarmState.lastFinishedAt;

export async function prewarmDescriptionDocOpenIntent(docId: string): Promise<void> {
  const remoteKey = parseDescriptionDocId(docId);
  if (!remoteKey) {
    return;
  }

  const cacheKey = `${remoteKey.entityType}:${remoteKey.entityId}:${remoteKey.docType}`;
  const lastFinished = lastFinishedAt.get(cacheKey);
  if (typeof lastFinished === "number" && Date.now() - lastFinished <= PREWARM_TTL_MS) {
    return;
  }

  const existingTask = inflight.get(cacheKey);
  if (existingTask) {
    return existingTask;
  }

  const task = (async () => {
    let snapshot: StoredSnapshot | null = null;
    try {
      snapshot = await getRemoteSnapshot(remoteKey);
    }
    catch {
      snapshot = null;
    }

    try {
      await getRemoteUpdates({
        ...remoteKey,
        afterServerTime: snapshotCursor(snapshot),
        limit: 2000,
      });
    }
    catch {
      // Best effort only. Open path will perform the real load.
    }

    lastFinishedAt.set(cacheKey, Date.now());
  })();

  inflight.set(cacheKey, task);
  try {
    await task;
  }
  finally {
    if (inflight.get(cacheKey) === task) {
      inflight.delete(cacheKey);
    }
  }
}
