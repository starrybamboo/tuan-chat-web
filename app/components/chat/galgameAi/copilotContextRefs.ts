import type { GalReference } from "./authoringTypes";

export const MAX_COPILOT_CONTEXT_REFS = 12;
export const MAX_COPILOT_ROOM_CONTEXT_REFS = 3;

export type CopilotContextRefSource = "drag";
export type CopilotContextRefPersistence = "persistent" | "turn";

export type CopilotContextRef
  = | {
    kind: "room";
    roomId: string;
    spaceId?: string;
    label: string;
    source: CopilotContextRefSource;
    persistence: CopilotContextRefPersistence;
  }
  | {
    kind: "message";
    sourceRoomId: string;
    messageIds: string[];
    label: string;
    mode: "target" | "reference";
    source: CopilotContextRefSource;
    persistence: CopilotContextRefPersistence;
  }
  | {
    kind: "role";
    roleId: string;
    sourceRoomId?: string;
    label: string;
    source: CopilotContextRefSource;
    persistence: CopilotContextRefPersistence;
  }
  | {
    kind: "doc";
    docId: string;
    spaceId?: string;
    label: string;
    title?: string;
    excerpt?: string;
    source: CopilotContextRefSource;
    persistence: CopilotContextRefPersistence;
  };

export type AddCopilotContextRefResult
  = | { status: "added"; refs: CopilotContextRef[] }
    | { status: "duplicate"; refs: CopilotContextRef[] }
    | { status: "room_limit"; refs: CopilotContextRef[] }
    | { status: "total_limit"; refs: CopilotContextRef[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(Math.floor(value));
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function normalizeOptionalId(value: unknown): string | undefined {
  return normalizeId(value) ?? undefined;
}

function normalizeLabel(value: unknown, fallback: string): string {
  const label = typeof value === "string" ? value.trim() : "";
  return (label || fallback).slice(0, 120);
}

function normalizePersistence(value: unknown, fallback: CopilotContextRefPersistence): CopilotContextRefPersistence {
  return value === "turn" || value === "persistent" ? value : fallback;
}

function normalizeMessageIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const id = normalizeId(item);
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

export function normalizeCopilotContextRef(value: unknown): CopilotContextRef | null {
  if (!isRecord(value) || value.source !== "drag") {
    return null;
  }

  if (value.kind === "room") {
    const roomId = normalizeId(value.roomId);
    if (!roomId) {
      return null;
    }
    const spaceId = normalizeOptionalId(value.spaceId);
    return {
      kind: "room",
      roomId,
      ...(spaceId ? { spaceId } : {}),
      label: normalizeLabel(value.label, `房间 ${roomId}`),
      source: "drag",
      persistence: normalizePersistence(value.persistence, "persistent"),
    };
  }

  if (value.kind === "message") {
    const sourceRoomId = normalizeId(value.sourceRoomId);
    const messageIds = normalizeMessageIds(value.messageIds);
    if (!sourceRoomId || messageIds.length === 0) {
      return null;
    }
    const mode = value.mode === "reference" ? "reference" : "target";
    return {
      kind: "message",
      sourceRoomId,
      messageIds,
      label: normalizeLabel(value.label, messageIds.length > 1 ? `${messageIds.length} 条消息` : `消息 ${messageIds[0]}`),
      mode,
      source: "drag",
      persistence: normalizePersistence(value.persistence, "turn"),
    };
  }

  if (value.kind === "role") {
    const roleId = normalizeId(value.roleId);
    if (!roleId) {
      return null;
    }
    const sourceRoomId = normalizeOptionalId(value.sourceRoomId);
    return {
      kind: "role",
      roleId,
      ...(sourceRoomId ? { sourceRoomId } : {}),
      label: normalizeLabel(value.label, `角色 ${roleId}`),
      source: "drag",
      persistence: normalizePersistence(value.persistence, "persistent"),
    };
  }

  if (value.kind === "doc") {
    const docId = normalizeId(value.docId);
    if (!docId) {
      return null;
    }
    const title = typeof value.title === "string" ? value.title.trim().slice(0, 160) : "";
    const excerpt = typeof value.excerpt === "string" ? value.excerpt.trim().slice(0, 800) : "";
    const spaceId = normalizeOptionalId(value.spaceId);
    return {
      kind: "doc",
      docId,
      ...(spaceId ? { spaceId } : {}),
      label: normalizeLabel(value.label, title || `文档 ${docId}`),
      ...(title ? { title } : {}),
      ...(excerpt ? { excerpt } : {}),
      source: "drag",
      persistence: normalizePersistence(value.persistence, "persistent"),
    };
  }

  return null;
}

export function normalizeCopilotContextRefs(values: readonly unknown[]): CopilotContextRef[] {
  const refs = values
    .map(normalizeCopilotContextRef)
    .filter((ref): ref is CopilotContextRef => ref !== null);
  return dedupeCopilotContextRefs(refs).slice(0, MAX_COPILOT_CONTEXT_REFS);
}

export function getCopilotContextRefKey(ref: CopilotContextRef): string {
  if (ref.kind === "message") {
    return `${ref.kind}:${ref.mode}:${ref.sourceRoomId}:${ref.messageIds.join(",")}`;
  }
  if (ref.kind === "room") {
    return `${ref.kind}:${ref.roomId}`;
  }
  if (ref.kind === "role") {
    return `${ref.kind}:${ref.roleId}`;
  }
  return `${ref.kind}:${ref.docId}`;
}

export function dedupeCopilotContextRefs(refs: readonly CopilotContextRef[]): CopilotContextRef[] {
  const seen = new Set<string>();
  const result: CopilotContextRef[] = [];
  for (const ref of refs) {
    const key = getCopilotContextRefKey(ref);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(ref);
    }
  }
  return result;
}

export function addCopilotContextRef(
  refs: readonly CopilotContextRef[],
  nextRef: CopilotContextRef,
): AddCopilotContextRefResult {
  const normalizedNextRef = normalizeCopilotContextRef(nextRef);
  if (!normalizedNextRef) {
    return { status: "duplicate", refs: [...refs] };
  }

  const currentRefs = dedupeCopilotContextRefs(refs);
  const key = getCopilotContextRefKey(normalizedNextRef);
  if (currentRefs.some(ref => getCopilotContextRefKey(ref) === key)) {
    return { status: "duplicate", refs: currentRefs };
  }
  if (
    normalizedNextRef.kind === "room"
    && currentRefs.filter(ref => ref.kind === "room").length >= MAX_COPILOT_ROOM_CONTEXT_REFS
  ) {
    return { status: "room_limit", refs: currentRefs };
  }
  if (currentRefs.length >= MAX_COPILOT_CONTEXT_REFS) {
    return { status: "total_limit", refs: currentRefs };
  }
  return { status: "added", refs: [...currentRefs, normalizedNextRef] };
}

export function removeCopilotContextRef(
  refs: readonly CopilotContextRef[],
  refToRemove: CopilotContextRef,
): CopilotContextRef[] {
  const key = getCopilotContextRefKey(refToRemove);
  return refs.filter(ref => getCopilotContextRefKey(ref) !== key);
}

export function getReferenceRoomIdsFromCopilotContextRefs(
  refs: readonly CopilotContextRef[],
  currentRoomId: number | string,
): number[] {
  const current = String(currentRoomId);
  return refs
    .filter((ref): ref is Extract<CopilotContextRef, { kind: "room" }> => ref.kind === "room")
    .map(ref => Number.parseInt(ref.roomId, 10))
    .filter(roomId => Number.isFinite(roomId) && roomId > 0 && String(roomId) !== current)
    .slice(0, MAX_COPILOT_ROOM_CONTEXT_REFS);
}

export function toGalReferencesFromCopilotContextRefs(refs: readonly CopilotContextRef[]): GalReference[] {
  const references: GalReference[] = [];
  for (const ref of refs) {
    if (ref.kind === "message") {
      for (const messageId of ref.messageIds) {
        references.push({
          kind: "message",
          messageId,
          mode: ref.mode,
          label: ref.label,
        });
      }
    }
    else if (ref.kind === "room") {
      references.push({
        kind: "room",
        roomId: ref.roomId,
        label: ref.label,
      });
    }
    else if (ref.kind === "role") {
      references.push({
        kind: "role",
        roleId: ref.roleId,
        label: ref.label,
      });
    }
    else {
      references.push({
        kind: "doc",
        docId: ref.docId,
        label: ref.label,
        title: ref.title,
        excerpt: ref.excerpt,
      });
    }
  }
  return references;
}
