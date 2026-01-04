import { tuanchat } from "../../../../../api/instance";

export type DescriptionEntityType = "space" | "room" | "space_clue";
export type DescriptionDocType = "description";

const LEGACY_EXTRA_KEY_PREFIX = "blocksuite_doc";

export function buildLegacyExtraKey(docType: DescriptionDocType) {
  return `${LEGACY_EXTRA_KEY_PREFIX}:${docType}`;
}

export type StoredSnapshot = {
  v: 1;
  updateB64: string;
  updatedAt: number;
};

function tryParseSnapshot(raw: string | null | undefined): StoredSnapshot | null {
  if (!raw)
    return null;
  try {
    const parsed = JSON.parse(raw) as StoredSnapshot;
    if (parsed && parsed.v === 1 && typeof parsed.updateB64 === "string") {
      return parsed;
    }
    return null;
  }
  catch {
    return null;
  }
}

export async function getRemoteSnapshot(params: {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
}): Promise<StoredSnapshot | null> {
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
  const fromTable = tryParseSnapshot(res?.data ?? null);
  if (fromTable)
    return fromTable;

  // space_clue 仅使用 blocksuite_doc 存储，不做 legacy extra 兼容
  if (params.entityType === "space_clue")
    return null;

  // 兼容迁移：若新表无数据，则尝试从旧 extra 读取一次，并写回新表
  const legacyKey = buildLegacyExtraKey(params.docType);
  const legacyRes
    = params.entityType === "space"
      ? await tuanchat.spaceController.getSpaceExtra(params.entityId, legacyKey)
      : await tuanchat.roomController.getRoomExtra(params.entityId, legacyKey);
  const legacy = tryParseSnapshot(legacyRes.data ?? null);
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
}

export async function setRemoteSnapshot(params: {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
  snapshot: StoredSnapshot;
}): Promise<void> {
  await tuanchat.request.request<any>({
    method: "PUT",
    url: "/blocksuite/doc",
    body: {
      entityType: params.entityType,
      entityId: params.entityId,
      docType: params.docType,
      snapshot: JSON.stringify(params.snapshot),
    },
    mediaType: "application/json",
  });
}
