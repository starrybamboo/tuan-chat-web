export type DescriptionEntityType = "space" | "room" | "space_clue" | "user";
export type DescriptionDocType = "description" | "readme";

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
  if (params.entityType === "space")
    return `space:${params.entityId}:${params.docType}`;

  if (params.entityType === "room")
    return `room:${params.entityId}:${params.docType}`;

  if (params.entityType === "user")
    return `user:${params.entityId}:${params.docType}`;

  // space_clue
  return `clue:${params.entityId}:${params.docType}`;
}

export function parseDescriptionDocId(docId: string): {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
} | null {
  const parts = docId.split(":");

  // space:<spaceId>:description | room:<roomId>:description | clue:<clueId>:description | user:<userId>:readme
  if (parts.length === 3 && (parts[2] === "description" || parts[2] === "readme")) {
    const [prefix, rawId] = parts;
    const entityId = Number(rawId);
    if (!Number.isFinite(entityId) || entityId <= 0)
      return null;

    const docType = parts[2] as DescriptionDocType;

    if (prefix === "space") {
      return { entityType: "space", entityId, docType };
    }

    if (prefix === "room") {
      return { entityType: "room", entityId, docType };
    }

    if (prefix === "clue") {
      return { entityType: "space_clue", entityId, docType };
    }

    if (prefix === "user") {
      return { entityType: "user", entityId, docType };
    }

    return null;
  }

  // Legacy/space-internal docId: `space:description` (no numeric entityId embedded)
  // 这种 docId 无法映射到远端存储主键，因此返回 null。
  return null;
}
