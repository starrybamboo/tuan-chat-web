import type { Edge, Node } from "@xyflow/react";

import { MarkerType } from "@xyflow/react";

import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Space } from "@tuanchat/openapi-client/models/Space";

import { SCENE_DEFAULT_DESCRIPTION } from "@/components/chat/window/workflowSceneDescriptionEditor";

export type RoomLink = {
  targetId: number;
  condition?: string;
};

export type NormalizedRoomMap = {
  links: Record<number, RoomLink[]>;
  startRoomIds: number[];
  endNodeIds: number[];
  endNodeIncomingRoomIds: Record<number, number[]>;
};

export type RoomMap = NormalizedRoomMap["links"];

export const WORKFLOW_STORAGE_PREFIX = "workflow";
export const START_NODE_ID = "start";
export const START_NODE_LABEL = "开始";
export const START_NODE_OFFSET_X = 220;
export const START_EDGE_PREFIX = "start-edge-";
export const END_NODE_LABEL_PREFIX = "结束";
export const END_NODE_OFFSET_X = 220;
export const END_NODE_PREFIX = "end:";
export const END_EDGE_PREFIX = "end-edge-";
export const END_NODE_LIST_KEY = "endNodes";
export const END_NODE_LINK_KEY_PREFIX = "endNode:";

export function normalizeSceneDefaultDescription(value?: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized)
    return SCENE_DEFAULT_DESCRIPTION;
  return normalized;
}

export function normalizeRoomIdList(ids: number[]): number[] {
  return Array.from(new Set(
    ids.filter(id => Number.isFinite(id) && id > 0),
  )).sort((a, b) => a - b);
}

export function numberArrayEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i])
      return false;
  }
  return true;
}

export function buildEndNodeId(endNodeId: number): string {
  return `${END_NODE_PREFIX}${endNodeId}`;
}

export function parseEndNodeId(nodeId?: string): number | null {
  if (typeof nodeId !== "string" || !nodeId.startsWith(END_NODE_PREFIX))
    return null;
  const id = Number(nodeId.slice(END_NODE_PREFIX.length));
  if (!Number.isFinite(id) || id <= 0)
    return null;
  return id;
}

export function parseRoomIdList(values: unknown): number[] {
  const raw = Array.isArray(values) ? values : [];
  const parsed = raw
    .map((entry) => {
      const id = typeof entry === "number" ? entry : Number(String(entry ?? "").trim());
      return Number.isNaN(id) ? null : id;
    })
    .filter((id): id is number => id != null);
  return normalizeRoomIdList(parsed);
}

export function parseEndNodeIdList(values: unknown): number[] {
  const raw = Array.isArray(values) ? values : [];
  const parsed = raw
    .map(entry => parseEndNodeId(String(entry ?? "")))
    .filter((id): id is number => id != null);
  return normalizeRoomIdList(parsed);
}

export type PersistedNodePosition = {
  nodeId: string | number;
  x: number;
  y: number;
};

export function getWorkflowStorageKey(spaceId: number): string {
  return `${WORKFLOW_STORAGE_PREFIX}${spaceId}`;
}

export function loadPersistedPositions(spaceId: number): Map<string, { x: number; y: number }> {
  if (typeof window === "undefined" || spaceId <= 0)
    return new Map();
  const key = getWorkflowStorageKey(spaceId);
  const raw = window.localStorage.getItem(key);
  if (!raw)
    return new Map();
  try {
    const parsed = JSON.parse(raw) as PersistedNodePosition[];
    if (!Array.isArray(parsed))
      return new Map();
    const result = new Map<string, { x: number; y: number }>();
    parsed.forEach((entry) => {
      if (!entry)
        return;
      const { nodeId, x, y } = entry;
      if (typeof nodeId !== "string" && typeof nodeId !== "number")
        return;
      const normalizedNodeId = String(nodeId).trim();
      if (normalizedNodeId.length === 0)
        return;
      if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y))
        return;
      result.set(normalizedNodeId, { x, y });
    });
    return result;
  }
  catch {
    return new Map();
  }
}

export function savePersistedPositions(spaceId: number, positions: Map<string, { x: number; y: number }>): void {
  if (typeof window === "undefined" || spaceId <= 0)
    return;
  const key = getWorkflowStorageKey(spaceId);
  const payload: PersistedNodePosition[] = [];
  positions.forEach((value, nodeId) => {
    payload.push({ nodeId: String(nodeId), x: value.x, y: value.y });
  });
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  }
  catch {
    // noop
  }
}

// 分离条件
// eslint-disable-next-line regexp/no-super-linear-backtracking
export const TARGET_PATTERN = /^(\d+)(.*)$/s;

export function parseRoomLink(raw: unknown): RoomLink | null {
  if (raw == null)
    return null;
  const value = typeof raw === "number" ? String(raw) : String(raw ?? "").trim();
  if (value.length === 0)
    return null;
  const match = TARGET_PATTERN.exec(value);
  if (!match)
    return null;
  const targetId = Number(match[1]);
  if (Number.isNaN(targetId))
    return null;
  const conditionRaw = match[2]?.trim();
  return {
    targetId,
    condition: conditionRaw || undefined,
  };
}

export function sortLinks(links: RoomLink[]): RoomLink[] {
  return [...links].sort((a, b) => {
    if (a.targetId !== b.targetId)
      return a.targetId - b.targetId;
    const condA = a.condition ?? "";
    const condB = b.condition ?? "";
    return condA.localeCompare(condB);
  });
}

export function formatRoomLink(link: RoomLink): string {
  const condition = link.condition?.trim();
  if (!condition)
    return String(link.targetId);
  return `${link.targetId}${condition}`;
}

export function normalizeRoomMap(roomMap: Space["roomMap"]): NormalizedRoomMap {
  const result: NormalizedRoomMap = { links: {}, startRoomIds: [], endNodeIds: [], endNodeIncomingRoomIds: {} };
  if (!roomMap)
    return result;

  Object.entries(roomMap).forEach(([key, value]) => {
    if (key === "start") {
      result.startRoomIds = parseRoomIdList(value);
      return;
    }

    if (key === END_NODE_LIST_KEY) {
      result.endNodeIds = parseEndNodeIdList(value);
      return;
    }

    if (key.startsWith(END_NODE_LINK_KEY_PREFIX)) {
      const endNodeId = Number(key.slice(END_NODE_LINK_KEY_PREFIX.length));
      if (!Number.isFinite(endNodeId) || endNodeId <= 0)
        return;
      result.endNodeIncomingRoomIds[endNodeId] = parseRoomIdList(value);
      return;
    }

    const roomId = Number(key);
    if (Number.isNaN(roomId))
      return;
    const rawTargets = Array.isArray(value) ? value : [];
    const dedupeMap = new Map<string, RoomLink>();
    rawTargets.forEach((entry) => {
      const parsed = parseRoomLink(entry);
      if (!parsed)
        return;
      const dedupeKey = `${parsed.targetId}|${parsed.condition ?? ""}`;
      if (!dedupeMap.has(dedupeKey))
        dedupeMap.set(dedupeKey, parsed);
    });
    const links = sortLinks(Array.from(dedupeMap.values()));
    result.links[roomId] = links;
  });
  const normalizedEndNodeIds = normalizeRoomIdList(result.endNodeIds);
  const normalizedIncoming: Record<number, number[]> = {};
  normalizedEndNodeIds.forEach((endNodeId) => {
    const incoming = result.endNodeIncomingRoomIds[endNodeId] ?? [];
    normalizedIncoming[endNodeId] = normalizeRoomIdList(incoming);
  });
  result.endNodeIds = normalizedEndNodeIds;
  result.endNodeIncomingRoomIds = normalizedIncoming;
  return result;
}

// 备份
export function cloneRoomMap(map: RoomMap): RoomMap {
  const cloned: RoomMap = {};
  Object.entries(map).forEach(([key, value]) => {
    cloned[Number(key)] = value.map(link => ({ ...link }));
  });
  return cloned;
}

export function roomMapsEqual(a: RoomMap, b: RoomMap): boolean {
  const keysA = Object.keys(a).map(Number).sort((x, y) => x - y);
  const keysB = Object.keys(b).map(Number).sort((x, y) => x - y);
  if (keysA.length !== keysB.length)
    return false;
  for (let i = 0; i < keysA.length; i += 1) {
    if (keysA[i] !== keysB[i])
      return false;
    const arrA = sortLinks(a[keysA[i]] ?? []);
    const arrB = sortLinks(b[keysA[i]] ?? []);
    if (arrA.length !== arrB.length)
      return false;
    for (let j = 0; j < arrA.length; j += 1) {
      if (arrA[j].targetId !== arrB[j].targetId)
        return false;
      const condA = arrA[j].condition ?? "";
      const condB = arrB[j].condition ?? "";
      if (condA !== condB)
        return false;
    }
  }
  return true;
}

export function serializeRoomMap(
  map: RoomMap,
  startRoomIds: number[] = [],
  endNodeIds: number[] = [],
  endNodeIncomingRoomIds: Record<number, number[]> = {},
): Record<string, string[]> {
  const serialized: Record<string, string[]> = {};
  Object.entries(map).forEach(([key, value]) => {
    if (!value || value.length === 0)
      return;
    const formatted = sortLinks(value).map(link => formatRoomLink(link));
    serialized[key] = formatted;
  });
  const normalizedStartRoomIds = normalizeRoomIdList(startRoomIds);
  if (normalizedStartRoomIds.length > 0)
    serialized.start = normalizedStartRoomIds.map(id => String(id));
  const normalizedEndNodeIds = normalizeRoomIdList(endNodeIds);
  if (normalizedEndNodeIds.length > 0) {
    serialized[END_NODE_LIST_KEY] = normalizedEndNodeIds.map(id => buildEndNodeId(id));
    normalizedEndNodeIds.forEach((endNodeId) => {
      const incoming = normalizeRoomIdList(endNodeIncomingRoomIds[endNodeId] ?? []);
      if (incoming.length > 0)
        serialized[`${END_NODE_LINK_KEY_PREFIX}${endNodeId}`] = incoming.map(id => String(id));
    });
  }
  return serialized;
}

export function collectAllRoomIds(
  roomMap: RoomMap,
  rooms: Room[],
  startRoomIds: number[] = [],
  endNodeIncomingRoomIds: Record<number, number[]> = {},
): number[] {
  const acc = new Set<number>();
  rooms.forEach((room) => {
    if (room.roomId != null)
      acc.add(Number(room.roomId));
  });
  Object.entries(roomMap).forEach(([source, targets]) => {
    const sourceId = Number(source);
    if (!Number.isNaN(sourceId))
      acc.add(sourceId);
    targets.forEach(({ targetId }) => {
      if (!Number.isNaN(targetId))
        acc.add(targetId);
    });
  });
  startRoomIds.forEach((startRoomId) => {
    if (!Number.isNaN(startRoomId))
      acc.add(startRoomId);
  });
  Object.values(endNodeIncomingRoomIds).forEach((incomingRoomIds) => {
    incomingRoomIds.forEach((roomId) => {
      if (!Number.isNaN(roomId))
        acc.add(roomId);
    });
  });
  return Array.from(acc).sort((a, b) => a - b);
}

export function resolveStartTargetIds(allRoomIds: number[], startRoomIds: number[]): number[] {
  return normalizeRoomIdList(startRoomIds.filter(roomId => allRoomIds.includes(roomId)));
}

export function buildStartNode(options: { targetPosition?: { x: number; y: number }; storedPosition?: { x: number; y: number }; existing?: Node }): Node {
  const position = options.existing?.position
    ?? options.storedPosition
    ?? (options.targetPosition
      ? { x: options.targetPosition.x - START_NODE_OFFSET_X, y: options.targetPosition.y }
      : { x: 0, y: 0 });
  return {
    id: START_NODE_ID,
    type: "startNode",
    data: { label: START_NODE_LABEL },
    position,
    draggable: true,
    selectable: true,
    connectable: true,
    deletable: false,
    dragHandle: ".workflow-start-drag-handle",
  };
}

export function buildEndNode(
  endNodeId: number,
  options: {
    targetPosition?: { x: number; y: number };
    storedPosition?: { x: number; y: number };
    existing?: Node;
    onDelete?: (endNodeId: number) => void;
  },
): Node {
  const position = options.existing?.position
    ?? options.storedPosition
    ?? (options.targetPosition
      ? { x: options.targetPosition.x + END_NODE_OFFSET_X, y: options.targetPosition.y }
      : { x: END_NODE_OFFSET_X, y: 0 });
  return {
    id: buildEndNodeId(endNodeId),
    type: "endNode",
    data: {
      label: `${END_NODE_LABEL_PREFIX}${endNodeId}`,
      endNodeId,
      onDelete: options.onDelete,
    },
    position,
    draggable: true,
    selectable: true,
    connectable: true,
    deletable: true,
    dragHandle: ".workflow-end-drag-handle",
  };
}

export function buildStartEdge(targetId: number): Edge {
  return {
    id: `${START_EDGE_PREFIX}${targetId}`,
    source: START_NODE_ID,
    target: String(targetId),
    type: "smoothstep",
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: "#d32f2f",
    },
    style: {
      strokeWidth: 2,
      stroke: "#d32f2f",
    },
    selectable: true,
    deletable: true,
    focusable: true,
    data: {
      edgeKind: "start",
    },
  };
}

export function buildEndEdge(endNodeId: number, sourceRoomId: number): Edge {
  return {
    id: `${END_EDGE_PREFIX}${endNodeId}-${sourceRoomId}`,
    source: String(sourceRoomId),
    target: buildEndNodeId(endNodeId),
    type: "smoothstep",
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: "#16a34a",
    },
    style: {
      strokeWidth: 2,
      stroke: "#16a34a",
    },
    selectable: true,
    deletable: true,
    focusable: true,
    data: {
      edgeKind: "end",
    },
  };
}

export function isStartEdgeId(id?: string): boolean {
  return typeof id === "string" && id.startsWith(START_EDGE_PREFIX);
}

export function isEndNodeId(nodeId?: string): boolean {
  return typeof nodeId === "string" && nodeId.startsWith(END_NODE_PREFIX);
}

export function isEndEdgeId(id?: string): boolean {
  return typeof id === "string" && id.startsWith(END_EDGE_PREFIX);
}

export function isStartEdge(edge?: Edge): boolean {
  if (!edge)
    return false;
  const edgeData = edge.data as { edgeKind?: string } | undefined;
  return edgeData?.edgeKind === "start" || isStartEdgeId(edge.id);
}

export function isEndEdge(edge?: Edge): boolean {
  if (!edge)
    return false;
  const edgeData = edge.data as { edgeKind?: string } | undefined;
  return edgeData?.edgeKind === "end" || isEndEdgeId(edge.id);
}
