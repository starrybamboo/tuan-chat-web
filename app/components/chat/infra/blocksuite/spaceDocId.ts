export type SpaceDocId = string;

export type SpaceDocKind =
  | "space_description"
  | "room_description"
  | "clue_description"
  | "independent";

export type SpaceDocDescriptor =
  | { kind: "space_description" }
  | { kind: "room_description"; roomId: number }
  | { kind: "clue_description"; clueId: number }
  | { kind: "independent"; docId: string };

/**
 * Space 内文档的 docId 规范（仅需在一个 space/workspace 内唯一）。
 *
 * 约束：
 * - 仅本地存储（Demo 阶段），因此不需要全局唯一。
 * - 仍建议保持可解析、可演进。
 */
export function buildSpaceDocId(desc: SpaceDocDescriptor): SpaceDocId {
  if (desc.kind === "space_description")
    return "space:description";

  if (desc.kind === "room_description")
    return `room:${desc.roomId}:description`;

  if (desc.kind === "clue_description")
    return `clue:${desc.clueId}:description`;

  // independent
  return `doc:${desc.docId}`;
}

export function parseSpaceDocId(docId: string): SpaceDocDescriptor | null {
  if (docId === "space:description")
    return { kind: "space_description" };

  const parts = docId.split(":");
  if (parts.length < 2)
    return null;

  const [type, idRaw, ...rest] = parts;
  if (type === "room" && rest.join(":") === "description") {
    const roomId = Number(idRaw);
    if (!Number.isFinite(roomId) || roomId <= 0)
      return null;
    return { kind: "room_description", roomId };
  }

  if (type === "clue" && rest.join(":") === "description") {
    const clueId = Number(idRaw);
    if (!Number.isFinite(clueId) || clueId <= 0)
      return null;
    return { kind: "clue_description", clueId };
  }

  if (type === "doc") {
    const docKey = [idRaw, ...rest].join(":");
    if (!docKey)
      return null;
    return { kind: "independent", docId: docKey };
  }

  return null;
}
