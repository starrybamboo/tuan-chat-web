export type DescriptionEntityType = "space" | "room" | "space_clue";
export type DescriptionDocType = "description";

export type DescriptionDocId = string;

/**
 * 兼容旧组件 props 的 docId 构造。
 *
 * 新实现中：
 * - Space 是 Workspace（容器）
 * - Room/线索的“描述文档”都是 Space Workspace 内的一个 doc（Room 以引用形态挂载）
 */
export function buildDescriptionDocId(params: {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
}): DescriptionDocId {
  if (params.docType !== "description") {
    return `${params.entityType}:${params.entityId}:${params.docType}`;
  }

  if (params.entityType === "space")
    return "space:description";

  if (params.entityType === "room")
    return `room:${params.entityId}:description`;

  return `clue:${params.entityId}:description`;
}

export function parseDescriptionDocId(docId: string): {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
} | null {
  const parts = docId.split(":");

  // space:<spaceId>:description | room:<roomId>:description | clue:<clueId>:description
  if (parts.length === 3 && parts[2] === "description") {
    const [prefix, rawId] = parts;
    const entityId = Number(rawId);
    if (!Number.isFinite(entityId) || entityId <= 0)
      return null;

    if (prefix === "space") {
      return { entityType: "space", entityId, docType: "description" };
    }

    if (prefix === "room") {
      return { entityType: "room", entityId, docType: "description" };
    }

    if (prefix === "clue") {
      return { entityType: "space_clue", entityId, docType: "description" };
    }

    return null;
  }

  // Legacy/space-internal docId: `space:description` (no numeric entityId embedded)
  // 这种 docId 无法映射到远端存储主键，因此返回 null。
  return null;
}
