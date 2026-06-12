export type SpaceDocId = string;

export type SpaceDocDescriptor = { kind: "independent"; docId: number };

/**
 * Space 文档现在直接复用 DOC_ROOM 的 roomId。
 * 前端 docId 保持字符串形态，是为了和本地缓存、路由参数共用一套键。
 */
export function buildSpaceDocId(desc: SpaceDocDescriptor): SpaceDocId {
  return String(desc.docId);
}

export function parseSpaceDocId(docId: string): SpaceDocDescriptor | null {
  const normalized = typeof docId === "string" ? docId.trim() : "";
  if (!/^\d+$/.test(normalized))
    return null;

  const id = Number(normalized);
  if (!Number.isFinite(id) || id <= 0)
    return null;
  return { kind: "independent", docId: id };
}
