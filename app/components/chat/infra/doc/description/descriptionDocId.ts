export type DescriptionEntityType = "space" | "room" | "user" | "space_user_doc";
export type DescriptionDocType = "description" | "readme";

export type DescriptionDocId = string;

/**
 * 兼容仍然使用 description docId 约定的旧链路。
 *
 * 当前共享文档已经改为直接使用 roomId；
 * 这里只保留 space/room/user/udoc 这类历史 description 标识的解析能力。
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

  if (params.entityType === "space_user_doc")
    return `udoc:${params.entityId}:${params.docType}`;

  throw new Error(`Unsupported description entity type: ${params.entityType}`);
}

export function parseDescriptionDocId(docId: string): {
  entityType: DescriptionEntityType;
  entityId: number;
  docType: DescriptionDocType;
} | null {
  const parts = docId.split(":");

  // space:<spaceId>:description | room:<roomId>:description | user:<userId>:readme | udoc:<docId>:description
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

    if (prefix === "user") {
      return { entityType: "user", entityId, docType };
    }

    if (prefix === "udoc") {
      return { entityType: "space_user_doc", entityId, docType };
    }

    return null;
  }

  return null;
}
