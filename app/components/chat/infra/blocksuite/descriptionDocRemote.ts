import { tuanchat } from "../../../../../api/instance";

export type DescriptionEntityType = "space" | "room" | "space_clue" | "user" | "space_user_doc" | "space_doc";
export type DescriptionDocType = "description" | "readme";

const LEGACY_EXTRA_KEY_PREFIX = "blocksuite_doc";

export function buildLegacyExtraKey(docType: DescriptionDocType) {
  return `${LEGACY_EXTRA_KEY_PREFIX}:${docType}`;
}

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

function buildRemoteCacheKey(key: RemoteKey) {
  return `${key.entityType}:${key.entityId}:${key.docType}`;
}

// De-dupe back-to-back GETs caused by:
// - pre-hydration fetch in BlocksuiteDescriptionEditor
// - sync engine pull (RemoteSnapshotDocSource)
// Also mitigates React StrictMode double-mount in dev.
const SNAPSHOT_CACHE_TTL_MS = 1500;
const snapshotCache = new Map<string, { at: number; value: StoredSnapshot | null }>();
const snapshotInflight = new Map<string, Promise<StoredSnapshot | null>>();

const SNAPSHOT_SET_DEDUPE_MS = 2500;
const snapshotSetInflight = new Map<string, Promise<void>>();
const snapshotLastSet = new Map<string, { at: number; updateB64: string }>();

const snapshotDeleteInflight = new Map<string, Promise<void>>();

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
  const cacheKey = buildRemoteCacheKey(params);
  const cached = snapshotCache.get(cacheKey);
  if (cached && Date.now() - cached.at <= SNAPSHOT_CACHE_TTL_MS) {
    return cached.value;
  }

  const inflight = snapshotInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const task = (async (): Promise<StoredSnapshot | null> => {
  // 优先从 blocksuite_doc 表读取
    const res = await tuanchat.request.request<any>({
      method: "GET",
      url: "/blocksuite/doc",
      query: {
        entityType: params.entityType,
        entityId: params.entityId,
        docType: params.docType,
      },
    });
    // Most endpoints wrap data inside ApiResult: { code, msg, data }
    // Some deployments may return the snapshot object directly.
    const fromTable = tryParseSnapshot((res as any)?.data ?? res ?? null);
    if (fromTable)
      return fromTable;

    // 仅 space/room 的 description 做 legacy extra 兼容
    if (
      params.entityType === "space_clue"
      || params.entityType === "user"
      || params.entityType === "space_user_doc"
      || params.entityType === "space_doc"
      || params.docType !== "description"
    ) {
      return null;
    }

    // 兼容迁移：若新表无数据，则尝试从旧 extra 读取一次，并写回新表
    const legacyKey = buildLegacyExtraKey(params.docType);
    const legacyRes
      = params.entityType === "space"
        ? await tuanchat.spaceController.getSpaceExtra(params.entityId, legacyKey)
        : await tuanchat.roomController.getRoomExtra(params.entityId, legacyKey);
    const legacy = tryParseSnapshot((legacyRes as any).data ?? null);
    if (!legacy)
      return null;

    await tuanchat.request.request<any>({
      method: "PUT",
      url: "/blocksuite/doc",
      body: {
        entityType: params.entityType,
        entityId: params.entityId,
        docType: params.docType,
        snapshot: JSON.stringify(legacy),
      },
      mediaType: "application/json",
    });
    return legacy;
  })();

  snapshotInflight.set(cacheKey, task);
  try {
    const value = await task;
    snapshotCache.set(cacheKey, { at: Date.now(), value });
    return value;
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
  const cacheKey = buildRemoteCacheKey(params);
  const now = Date.now();

  // If we just sent the exact same snapshot, skip.
  // This avoids duplicate PUTs caused by sync init + online flush races.
  const last = snapshotLastSet.get(cacheKey);
  if (last
    && last.updateB64 === params.snapshot.updateB64
    && now - last.at <= SNAPSHOT_SET_DEDUPE_MS) {
    snapshotCache.set(cacheKey, { at: now, value: params.snapshot });
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

  const task = tuanchat.request.request<any>({
    method: "PUT",
    url: "/blocksuite/doc",
    body: {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
      snapshot: JSON.stringify(params.snapshot),
    },
    mediaType: "application/json",
  }).then(() => {
    snapshotLastSet.set(cacheKey, { at: Date.now(), updateB64: params.snapshot.updateB64 });
    snapshotCache.set(cacheKey, { at: Date.now(), value: params.snapshot });
  });

  snapshotSetInflight.set(cacheKey, task);
  try {
    await task;
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

  const task = tuanchat.request.request<any>({
    method: "DELETE",
    url: "/blocksuite/doc",
    query: {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
    },
  }).then(() => {
    snapshotCache.set(cacheKey, { at: Date.now(), value: null });
    snapshotInflight.delete(cacheKey);
    snapshotSetInflight.delete(cacheKey);
    snapshotLastSet.delete(cacheKey);
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
  const res = await tuanchat.request.request<any>({
    method: "GET",
    url: "/blocksuite/doc/updates",
    query: {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
      afterServerTime: params.afterServerTime,
      limit: params.limit,
    },
  });

  const raw = (res as any)?.data ?? res ?? null;
  if (isRemoteUpdates(raw)) {
    return raw;
  }
  if (isRemoteUpdates((raw as any)?.data)) {
    return (raw as any).data;
  }
  return null;
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
  const res = await tuanchat.request.request<any>({
    method: "POST",
    url: "/blocksuite/doc/update",
    body: {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
      updateB64: params.updateB64,
    },
    mediaType: "application/json",
  });

  const raw = (res as any)?.data ?? res ?? null;
  if (isRemoteUpdatePushResponse(raw)) {
    return raw;
  }
  if (isRemoteUpdatePushResponse((raw as any)?.data)) {
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
  await tuanchat.request.request<any>({
    method: "POST",
    url: "/blocksuite/doc/compact",
    body: {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
      beforeOrEqServerTime: params.beforeOrEqServerTime,
    },
    mediaType: "application/json",
  });
}
