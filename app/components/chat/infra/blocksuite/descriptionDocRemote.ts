import { tuanchat } from "../../../../../api/instance";

export type DescriptionEntityType = "space" | "room" | "space_clue" | "user";
export type DescriptionDocType = "description" | "readme";

const LEGACY_EXTRA_KEY_PREFIX = "blocksuite_doc";

export function buildLegacyExtraKey(docType: DescriptionDocType) {
  return `${LEGACY_EXTRA_KEY_PREFIX}:${docType}`;
}

export type StoredSnapshot = {
  v: 1;
  updateB64: string;
  updatedAt: number;
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
  return !!v
    && v.v === 1
    && typeof v.updateB64 === "string"
    && typeof v.updatedAt === "number";
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
    if (params.entityType === "space_clue" || params.entityType === "user" || params.docType !== "description")
      return null;

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
