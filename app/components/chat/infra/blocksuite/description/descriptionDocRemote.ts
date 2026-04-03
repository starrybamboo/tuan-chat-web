import { tuanchat } from "api/instance";
import { recordDocCardShareObservation } from "@/components/chat/infra/blocksuite/shared/docCardShareObservability";

export type DescriptionEntityType = "space" | "room" | "user" | "space_user_doc" | "space_doc";
export type DescriptionDocType = "description" | "readme";

export type StoredSnapshot = {
  // v1: legacy snapshot format
  v: 1;
  updateB64: string;
  updatedAt: number;
} | {
  // v2: snapshot + metadata for yjs incremental log compaction
  v: 2;
  updateB64: string;
  updatedAt: number;
  /** 可选：快照对应的 serverTime 游标（快照已包含 <= 该时间的 updates） */
  snapshotServerTime?: number;
  /** 可选：该快照对应的 stateVector（用于调试/后续优化；客户端仍可自行计算） */
  stateVectorB64?: string;
};

type RemoteKey = {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
};

type SharedRemoteState = {
  snapshotCache: Map<string, { at: number; value: StoredSnapshot | null }>;
  snapshotInflight: Map<string, Promise<StoredSnapshot | null>>;
  snapshotSetInflight: Map<string, Promise<void>>;
  snapshotLastSet: Map<string, { at: number; updateB64: string }>;
  snapshotDeleteInflight: Map<string, Promise<void>>;
  updatesCache: Map<string, { at: number; value: RemoteUpdates | null }>;
  updatesInflight: Map<string, Promise<RemoteUpdates | null>>;
};

function buildRemoteCacheKey(key: RemoteKey) {
  return `${key.entityType}:${key.entityId}:${key.docType}`;
}

function buildRemoteUpdatesCacheKey(params: {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
  afterServerTime?: number;
  limit?: number;
}) {
  return `${buildRemoteCacheKey(params)}:after:${params.afterServerTime ?? 0}:limit:${params.limit ?? ""}`;
}

function createSharedRemoteState(): SharedRemoteState {
  return {
    snapshotCache: new Map<string, { at: number; value: StoredSnapshot | null }>(),
    snapshotInflight: new Map<string, Promise<StoredSnapshot | null>>(),
    snapshotSetInflight: new Map<string, Promise<void>>(),
    snapshotLastSet: new Map<string, { at: number; updateB64: string }>(),
    snapshotDeleteInflight: new Map<string, Promise<void>>(),
    updatesCache: new Map<string, { at: number; value: RemoteUpdates | null }>(),
    updatesInflight: new Map<string, Promise<RemoteUpdates | null>>(),
  };
}

function getSharedRemoteState(): SharedRemoteState {
  const stateKey = "__tcDescriptionDocRemoteState_v2";
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
    owner[stateKey] = createSharedRemoteState();
  }
  return owner[stateKey] as SharedRemoteState;
}

const sharedRemoteState = getSharedRemoteState();

// De-dupe back-to-back GETs caused by:
// - pre-hydration fetch in BlocksuiteDescriptionEditor
// - sync engine pull (RemoteSnapshotDocSource)
// Also mitigates React StrictMode double-mount in dev.
const SNAPSHOT_CACHE_TTL_MS = 1500;
const snapshotCache = sharedRemoteState.snapshotCache;
const snapshotInflight = sharedRemoteState.snapshotInflight;

const SNAPSHOT_SET_DEDUPE_MS = 2500;
const snapshotSetInflight = sharedRemoteState.snapshotSetInflight;
const snapshotLastSet = sharedRemoteState.snapshotLastSet;

const snapshotDeleteInflight = sharedRemoteState.snapshotDeleteInflight;
const UPDATES_CACHE_TTL_MS = 800;
const updatesCache = sharedRemoteState.updatesCache;
const updatesInflight = sharedRemoteState.updatesInflight;

function invalidateRemoteUpdatesCache(baseCacheKey: string) {
  for (const key of updatesCache.keys()) {
    if (key.startsWith(`${baseCacheKey}:after:`)) {
      updatesCache.delete(key);
    }
  }
  for (const key of updatesInflight.keys()) {
    if (key.startsWith(`${baseCacheKey}:after:`)) {
      updatesInflight.delete(key);
    }
  }
}

function isStoredSnapshot(v: any): v is StoredSnapshot {
  if (!v || typeof v !== "object")
    return false;
  if (v.v === 1) {
    return typeof v.updateB64 === "string" && typeof v.updatedAt === "number";
  }
  if (v.v === 2) {
    return typeof v.updateB64 === "string"
      && typeof v.updatedAt === "number"
      && (typeof v.snapshotServerTime === "undefined" || typeof v.snapshotServerTime === "number")
      && (typeof v.stateVectorB64 === "undefined" || typeof v.stateVectorB64 === "string");
  }
  return false;
}

function tryParseSnapshot(raw: unknown): StoredSnapshot | null {
  if (!raw)
    return null;

  // Backend may return snapshot as a JSON string, or already-parsed object.
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return isStoredSnapshot(parsed) ? parsed : null;
    }
    catch {
      return null;
    }
  }

  if (typeof raw === "object") {
    return isStoredSnapshot(raw) ? (raw as StoredSnapshot) : null;
  }

  return null;
}

export async function getRemoteSnapshot(params: {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
}): Promise<StoredSnapshot | null> {
  recordDocCardShareObservation("remote-snapshot-get-start", {
    entityType: params.entityType,
    entityId: params.entityId,
    docType: params.docType,
  });
  const cacheKey = buildRemoteCacheKey(params);
  const cached = snapshotCache.get(cacheKey);
  if (cached && Date.now() - cached.at <= SNAPSHOT_CACHE_TTL_MS) {
    recordDocCardShareObservation("remote-snapshot-get-success", {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
      source: "cache",
      hasSnapshot: Boolean(cached.value?.updateB64),
      snapshotVersion: cached.value?.v,
    });
    return cached.value;
  }

  const inflight = snapshotInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const task = (async (): Promise<StoredSnapshot | null> => {
  // 优先从 blocksuite_doc 表读取
    const res = await tuanchat.blocksuiteDocController.getDoc(
      params.entityType,
      params.entityId,
      params.docType,
    );
    // Most endpoints wrap data inside ApiResult: { code, msg, data }
    // Some deployments may return the snapshot object directly.
    const fromTable = tryParseSnapshot((res as any)?.data ?? res ?? null);
    if (fromTable)
      return fromTable;

    return null;
  })();

  snapshotInflight.set(cacheKey, task);
  try {
    const value = await task;
    snapshotCache.set(cacheKey, { at: Date.now(), value });
    recordDocCardShareObservation("remote-snapshot-get-success", {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
      source: "network",
      hasSnapshot: Boolean(value?.updateB64),
      snapshotVersion: value?.v,
    });
    return value;
  }
  catch (error) {
    recordDocCardShareObservation("remote-snapshot-get-failed", {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  finally {
    snapshotInflight.delete(cacheKey);
  }
}

export async function setRemoteSnapshot(params: {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
  snapshot: StoredSnapshot;
}): Promise<void> {
  recordDocCardShareObservation("remote-snapshot-set-start", {
    entityType: params.entityType,
    entityId: params.entityId,
    docType: params.docType,
    snapshotVersion: params.snapshot.v,
    updateB64Length: params.snapshot.updateB64.length,
  });
  const cacheKey = buildRemoteCacheKey(params);
  const now = Date.now();

  // If we just sent the exact same snapshot, skip.
  // This avoids duplicate PUTs caused by sync init + online flush races.
  const last = snapshotLastSet.get(cacheKey);
  if (last
    && last.updateB64 === params.snapshot.updateB64
    && now - last.at <= SNAPSHOT_SET_DEDUPE_MS) {
    snapshotCache.set(cacheKey, { at: now, value: params.snapshot });
    recordDocCardShareObservation("remote-snapshot-set-success", {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
      snapshotVersion: params.snapshot.v,
      deduped: true,
    });
    return;
  }

  // If an identical PUT is already in-flight, reuse it.
  const inflight = snapshotSetInflight.get(cacheKey);
  if (inflight
    && last
    && last.updateB64 === params.snapshot.updateB64
    && now - last.at <= SNAPSHOT_SET_DEDUPE_MS) {
    return inflight;
  }

  const task = tuanchat.blocksuiteDocController.upsertDoc({
    entityType: params.entityType,
    entityId: params.entityId,
    docType: params.docType,
    snapshot: JSON.stringify(params.snapshot),
  }).then(() => {
    snapshotLastSet.set(cacheKey, { at: Date.now(), updateB64: params.snapshot.updateB64 });
    snapshotCache.set(cacheKey, { at: Date.now(), value: params.snapshot });
    invalidateRemoteUpdatesCache(cacheKey);
  });

  snapshotSetInflight.set(cacheKey, task);
  try {
    await task;
    recordDocCardShareObservation("remote-snapshot-set-success", {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
      snapshotVersion: params.snapshot.v,
      deduped: false,
    });
  }
  catch (error) {
    recordDocCardShareObservation("remote-snapshot-set-failed", {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
      snapshotVersion: params.snapshot.v,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  finally {
    // Only clear if it is still the same task.
    if (snapshotSetInflight.get(cacheKey) === task) {
      snapshotSetInflight.delete(cacheKey);
    }
  }
}

export async function deleteRemoteSnapshot(params: {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
}): Promise<void> {
  const cacheKey = buildRemoteCacheKey(params);

  const inflight = snapshotDeleteInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const task = tuanchat.blocksuiteDocController.deleteDoc3(
    params.entityId,
    {
      entityType: params.entityType,
      docType: params.docType,
    },
  ).then(() => {
    snapshotCache.set(cacheKey, { at: Date.now(), value: null });
    snapshotInflight.delete(cacheKey);
    snapshotSetInflight.delete(cacheKey);
    snapshotLastSet.delete(cacheKey);
    invalidateRemoteUpdatesCache(cacheKey);
  });

  snapshotDeleteInflight.set(cacheKey, task);
  try {
    await task;
  }
  finally {
    if (snapshotDeleteInflight.get(cacheKey) === task) {
      snapshotDeleteInflight.delete(cacheKey);
    }
  }
}

export type RemoteUpdates = {
  updates: string[];
  latestServerTime: number;
};

function isRemoteUpdates(v: any): v is RemoteUpdates {
  return !!v
    && Array.isArray(v.updates)
    && typeof v.latestServerTime === "number";
}

export async function getRemoteUpdates(params: {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
  afterServerTime?: number;
  limit?: number;
}): Promise<RemoteUpdates | null> {
  const cacheKey = buildRemoteUpdatesCacheKey(params);
  const cached = updatesCache.get(cacheKey);
  if (cached && Date.now() - cached.at <= UPDATES_CACHE_TTL_MS) {
    return cached.value;
  }

  const inflight = updatesInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const task = (async (): Promise<RemoteUpdates | null> => {
    const res = await tuanchat.blocksuiteDocController.listDocUpdates(
      params.entityType,
      params.entityId,
      params.docType,
      params.afterServerTime,
      params.limit,
    );

    const raw = (res as any)?.data ?? res ?? null;
    if (isRemoteUpdates(raw)) {
      return raw;
    }
    if (isRemoteUpdates((raw as any)?.data)) {
      return (raw as any).data;
    }
    return null;
  })();

  updatesInflight.set(cacheKey, task);
  try {
    const value = await task;
    updatesCache.set(cacheKey, { at: Date.now(), value });
    return value;
  }
  finally {
    if (updatesInflight.get(cacheKey) === task) {
      updatesInflight.delete(cacheKey);
    }
  }
}

export type RemoteUpdatePushResponse = {
  updateId: number;
  serverTime: number;
};

function isRemoteUpdatePushResponse(v: any): v is RemoteUpdatePushResponse {
  return !!v
    && typeof v.updateId === "number"
    && typeof v.serverTime === "number";
}

export async function pushRemoteUpdate(params: {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
  updateB64: string;
}): Promise<RemoteUpdatePushResponse | null> {
  const res = await tuanchat.blocksuiteDocController.pushDocUpdate({
    entityType: params.entityType,
    entityId: params.entityId,
    docType: params.docType,
    updateB64: params.updateB64,
  });

  const raw = (res as any)?.data ?? res ?? null;
  if (isRemoteUpdatePushResponse(raw)) {
    invalidateRemoteUpdatesCache(buildRemoteCacheKey(params));
    return raw;
  }
  if (isRemoteUpdatePushResponse((raw as any)?.data)) {
    invalidateRemoteUpdatesCache(buildRemoteCacheKey(params));
    return (raw as any).data;
  }
  return null;
}

export async function compactRemoteUpdates(params: {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
  beforeOrEqServerTime: number;
}): Promise<void> {
  await tuanchat.blocksuiteDocController.compactDocUpdates({
    entityType: params.entityType,
    entityId: params.entityId,
    docType: params.docType,
    beforeOrEqServerTime: params.beforeOrEqServerTime,
  });
  invalidateRemoteUpdatesCache(buildRemoteCacheKey(params));
}
