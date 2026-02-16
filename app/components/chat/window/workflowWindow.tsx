import type { Connection, Edge, EdgeChange, Node, NodeChange, ReactFlowInstance } from "@xyflow/react";
import type { Room } from "api/models/Room";
import type { Space } from "api/models/Space";
import type { MouseEvent } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  reconnectEdge,
} from "@xyflow/react";
import { useGetSpaceInfoQuery, useGetUserRoomsQuery, useUpdateRoomMutation, useUpdateSpaceMutation } from "api/hooks/chatQueryHooks";
import dagre from "dagre";
import { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import WorkflowEndNode from "@/components/chat/window/workflowEndNode";
import WorkflowSceneDescriptionEditor, {
  LEGACY_ROOM_DEFAULT_DESCRIPTION,
  SCENE_DEFAULT_DESCRIPTION,
} from "@/components/chat/window/workflowSceneDescriptionEditor";
import WorkflowStartNode from "@/components/chat/window/workflowStartNode";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import SceneNode from "@/components/repository/detail/ContentTab/scene/react flow/NewSceneNode";
import { SpaceContext } from "../core/spaceContext";
import { useEntityHeaderOverrideStore } from "../stores/entityHeaderOverrideStore";
import "@xyflow/react/dist/style.css";

interface RoomLink {
  targetId: number;
  condition?: string;
}

interface NormalizedRoomMap {
  links: Record<number, RoomLink[]>;
  startRoomIds: number[];
  endNodeIds: number[];
  endNodeIncomingRoomIds: Record<number, number[]>;
}

type RoomMap = NormalizedRoomMap["links"];
const nodeTypes = {
  mapEditNode: SceneNode,
  startNode: WorkflowStartNode,
  endNode: WorkflowEndNode,
};

const WORKFLOW_STORAGE_PREFIX = "workflow";
const START_NODE_ID = "start";
const START_NODE_LABEL = "开始";
const START_NODE_OFFSET_X = 220;
const START_EDGE_PREFIX = "start-edge-";
const END_NODE_LABEL_PREFIX = "结束";
const END_NODE_OFFSET_X = 220;
const END_NODE_PREFIX = "end:";
const END_EDGE_PREFIX = "end-edge-";
const END_NODE_LIST_KEY = "endNodes";
const END_NODE_LINK_KEY_PREFIX = "endNode:";

function normalizeSceneDefaultDescription(value?: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === LEGACY_ROOM_DEFAULT_DESCRIPTION)
    return SCENE_DEFAULT_DESCRIPTION;
  return normalized;
}

function normalizeRoomIdList(ids: number[]): number[] {
  return Array.from(new Set(
    ids.filter(id => Number.isFinite(id) && id > 0),
  )).sort((a, b) => a - b);
}

function numberArrayEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i])
      return false;
  }
  return true;
}

function buildEndNodeId(endNodeId: number): string {
  return `${END_NODE_PREFIX}${endNodeId}`;
}

function parseEndNodeId(nodeId?: string): number | null {
  if (typeof nodeId !== "string" || !nodeId.startsWith(END_NODE_PREFIX))
    return null;
  const id = Number(nodeId.slice(END_NODE_PREFIX.length));
  if (!Number.isFinite(id) || id <= 0)
    return null;
  return id;
}

function parseRoomIdList(values: unknown): number[] {
  const raw = Array.isArray(values) ? values : [];
  const parsed = raw
    .map((entry) => {
      const id = typeof entry === "number" ? entry : Number(String(entry ?? "").trim());
      return Number.isNaN(id) ? null : id;
    })
    .filter((id): id is number => id != null);
  return normalizeRoomIdList(parsed);
}

function parseEndNodeIdList(values: unknown): number[] {
  const raw = Array.isArray(values) ? values : [];
  const parsed = raw
    .map(entry => parseEndNodeId(String(entry ?? "")))
    .filter((id): id is number => id != null);
  return normalizeRoomIdList(parsed);
}

interface PersistedNodePosition {
  nodeId: string | number;
  x: number;
  y: number;
}

function getWorkflowStorageKey(spaceId: number): string {
  return `${WORKFLOW_STORAGE_PREFIX}${spaceId}`;
}

function loadPersistedPositions(spaceId: number): Map<string, { x: number; y: number }> {
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

function savePersistedPositions(spaceId: number, positions: Map<string, { x: number; y: number }>): void {
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
const TARGET_PATTERN = /^(\d+)(.*)$/s;

function parseRoomLink(raw: unknown): RoomLink | null {
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

function sortLinks(links: RoomLink[]): RoomLink[] {
  return [...links].sort((a, b) => {
    if (a.targetId !== b.targetId)
      return a.targetId - b.targetId;
    const condA = a.condition ?? "";
    const condB = b.condition ?? "";
    return condA.localeCompare(condB);
  });
}

function formatRoomLink(link: RoomLink): string {
  const condition = link.condition?.trim();
  if (!condition)
    return String(link.targetId);
  return `${link.targetId}${condition}`;
}

interface ConditionEditorProps {
  initialValue: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

function ConditionEditor({ initialValue, onCancel, onConfirm }: ConditionEditorProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="p-4 max-w-sm flex flex-col min-h-[24vh]">
      <h3 className="text-lg font-bold mb-4 text-center">是否确认修改条件？</h3>
      <div className="flex-1 flex items-center justify-center mb-4">
        <div className="w-full">
          <label className="block mb-2 text-sm font-medium text-base-content/70 text-center">条件：</label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={value}
            onChange={event => setValue(event.target.value)}
            placeholder="请输入修改后的条件"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onConfirm(value)}
        >
          确认提交
        </button>
      </div>
    </div>
  );
}

// 转化roomMap
function normalizeRoomMap(roomMap: Space["roomMap"]): NormalizedRoomMap {
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
function cloneRoomMap(map: RoomMap): RoomMap {
  const cloned: RoomMap = {};
  Object.entries(map).forEach(([key, value]) => {
    cloned[Number(key)] = value.map(link => ({ ...link }));
  });
  return cloned;
}

function roomMapsEqual(a: RoomMap, b: RoomMap): boolean {
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

function serializeRoomMap(
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

function collectAllRoomIds(
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

function resolveStartTargetIds(allRoomIds: number[], startRoomIds: number[]): number[] {
  return normalizeRoomIdList(startRoomIds.filter(roomId => allRoomIds.includes(roomId)));
}

function buildStartNode(options: { targetPosition?: { x: number; y: number }; storedPosition?: { x: number; y: number }; existing?: Node }): Node {
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

function buildEndNode(
  endNodeId: number,
  options: { targetPosition?: { x: number; y: number }; storedPosition?: { x: number; y: number }; existing?: Node },
): Node {
  const position = options.existing?.position
    ?? options.storedPosition
    ?? (options.targetPosition
      ? { x: options.targetPosition.x + END_NODE_OFFSET_X, y: options.targetPosition.y }
      : { x: END_NODE_OFFSET_X, y: 0 });
  return {
    id: buildEndNodeId(endNodeId),
    type: "endNode",
    data: { label: `${END_NODE_LABEL_PREFIX}${endNodeId}` },
    position,
    draggable: true,
    selectable: true,
    connectable: true,
    deletable: true,
    dragHandle: ".workflow-end-drag-handle",
  };
}

function buildStartEdge(targetId: number): Edge {
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

function buildEndEdge(endNodeId: number, sourceRoomId: number): Edge {
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

function isStartEdgeId(id?: string): boolean {
  return typeof id === "string" && id.startsWith(START_EDGE_PREFIX);
}

function isEndNodeId(nodeId?: string): boolean {
  return typeof nodeId === "string" && nodeId.startsWith(END_NODE_PREFIX);
}

function isEndEdgeId(id?: string): boolean {
  return typeof id === "string" && id.startsWith(END_EDGE_PREFIX);
}

function isStartEdge(edge?: Edge): boolean {
  if (!edge)
    return false;
  const edgeData = edge.data as { edgeKind?: string } | undefined;
  return edgeData?.edgeKind === "start" || isStartEdgeId(edge.id);
}

function isEndEdge(edge?: Edge): boolean {
  if (!edge)
    return false;
  const edgeData = edge.data as { edgeKind?: string } | undefined;
  return edgeData?.edgeKind === "end" || isEndEdgeId(edge.id);
}

export default function WorkflowWindow() {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;

  const spaceQuery = useGetSpaceInfoQuery(spaceId);
  const spaceInfo = spaceQuery.data?.data;

  const userRoomsQuery = useGetUserRoomsQuery(spaceId);
  const userRooms = useMemo<Room[]>(() => userRoomsQuery.data?.data?.rooms ?? [], [userRoomsQuery.data?.data?.rooms]);
  const headerOverrides = useEntityHeaderOverrideStore(state => state.headers);
  const userRoomNameMap = useMemo(() => {
    const map = new Map<number, string>();
    userRooms.forEach((room) => {
      if (room.roomId != null)
        map.set(room.roomId, room.name ?? `房间 ${room.roomId}`);
    });
    return map;
  }, [userRooms]);

  const { mutate: updateSpaceMutation, mutateAsync: updateSpaceMutationAsync } = useUpdateSpaceMutation();
  const updateRoomMutation = useUpdateRoomMutation();

  const [roomMapState, setRoomMapState] = useState<RoomMap>({});
  const roomMapRef = useRef<RoomMap>({});
  const [startRoomIds, setStartRoomIds] = useState<number[]>([]);
  const startRoomIdsRef = useRef<number[]>([]);
  const [endNodeIds, setEndNodeIds] = useState<number[]>([]);
  const endNodeIdsRef = useRef<number[]>([]);
  const [endNodeIncomingRoomIds, setEndNodeIncomingRoomIds] = useState<Record<number, number[]>>({});
  const endNodeIncomingRoomIdsRef = useRef<Record<number, number[]>>({});

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const workflowContainerRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const lastFitKeyRef = useRef<string>("");
  const persistedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [positionsLoaded, setPositionsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setPositionsLoaded(false);
    if (spaceId <= 0) {
      persistedPositionsRef.current = new Map();
      setPositionsLoaded(true);
      return;
    }
    persistedPositionsRef.current = loadPersistedPositions(spaceId);
    setPositionsLoaded(true);
  }, [spaceId]);

  useLayoutEffect(() => {
    if (!spaceInfo)
      return;
    const normalized = normalizeRoomMap(spaceInfo.roomMap);
    setStartRoomIds(normalized.startRoomIds);
    startRoomIdsRef.current = normalized.startRoomIds;
    setEndNodeIds(normalized.endNodeIds);
    endNodeIdsRef.current = normalized.endNodeIds;
    setEndNodeIncomingRoomIds(normalized.endNodeIncomingRoomIds);
    endNodeIncomingRoomIdsRef.current = normalized.endNodeIncomingRoomIds;
    if (!roomMapsEqual(roomMapRef.current, normalized.links)) {
      roomMapRef.current = normalized.links;
      setRoomMapState(normalized.links);
      initialized.current = false;
    }
  }, [spaceInfo]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const allRoomIds = useMemo(() =>
    collectAllRoomIds(roomMapState, userRooms, startRoomIds, endNodeIncomingRoomIds), [roomMapState, userRooms, startRoomIds, endNodeIncomingRoomIds]);

  const startTargetIds = useMemo(() =>
    resolveStartTargetIds(allRoomIds, startRoomIds), [allRoomIds, startRoomIds]);

  const roomInfoMap = useMemo(() => {
    const map = new Map<number, Room>();
    userRooms.forEach((room) => {
      if (room?.roomId != null)
        map.set(room.roomId, room);
    });
    return map;
  }, [userRooms]);

  const roomLabelMap = useMemo(() => {
    const labels = new Map<number, string>();
    allRoomIds.forEach((roomId) => {
      const info = roomInfoMap.get(roomId);
      const override = headerOverrides[`room:${roomId}`];
      const fallback = userRoomNameMap.get(roomId) ?? `房间 ${roomId}`;
      const label = override?.title?.trim() || info?.name?.trim() || fallback;
      labels.set(roomId, label);
    });
    return labels;
  }, [allRoomIds, headerOverrides, roomInfoMap, userRoomNameMap]);

  const roomAvatarMap = useMemo(() => {
    const avatars = new Map<number, string>();
    allRoomIds.forEach((roomId) => {
      const info = roomInfoMap.get(roomId);
      const override = headerOverrides[`room:${roomId}`];
      const avatar = override?.imageUrl?.trim() || info?.avatar?.trim() || "/favicon.ico";
      avatars.set(roomId, avatar);
    });
    return avatars;
  }, [allRoomIds, headerOverrides, roomInfoMap]);

  const saveSceneDefaultDescription = useCallback(async (roomId: number, nextDescription: string) => {
    if (!Number.isFinite(roomId) || roomId <= 0)
      return;
    const normalized = normalizeSceneDefaultDescription(nextDescription);
    await updateRoomMutation.mutateAsync({
      roomId,
      description: normalized,
    });
  }, [updateRoomMutation]);

  const updateEndNodeGraph = useCallback((params: {
    endNodeIds: number[];
    endNodeIncomingRoomIds: Record<number, number[]>;
    persistMode?: "sync" | "async";
  }) => {
    const normalizedEndNodeIds = normalizeRoomIdList(params.endNodeIds);
    const normalizedIncoming: Record<number, number[]> = {};
    normalizedEndNodeIds.forEach((endNodeId) => {
      const roomIds = params.endNodeIncomingRoomIds[endNodeId] ?? [];
      normalizedIncoming[endNodeId] = normalizeRoomIdList(roomIds);
    });

    endNodeIdsRef.current = normalizedEndNodeIds;
    endNodeIncomingRoomIdsRef.current = normalizedIncoming;
    setEndNodeIds(normalizedEndNodeIds);
    setEndNodeIncomingRoomIds(normalizedIncoming);

    if (spaceId <= 0)
      return;

    const payload = {
      spaceId,
      roomMap: serializeRoomMap(
        roomMapRef.current,
        startRoomIdsRef.current,
        normalizedEndNodeIds,
        normalizedIncoming,
      ),
    };

    if (params.persistMode === "async")
      return updateSpaceMutationAsync(payload);
    updateSpaceMutation(payload);
  }, [spaceId, updateSpaceMutation, updateSpaceMutationAsync]);

  const addEndNode = useCallback(async () => {
    const nextId = (endNodeIdsRef.current.length > 0 ? Math.max(...endNodeIdsRef.current) : 0) + 1;
    const nextIds = [...endNodeIdsRef.current, nextId];
    const nextIncoming = {
      ...endNodeIncomingRoomIdsRef.current,
      [nextId]: [],
    };
    await updateEndNodeGraph({
      endNodeIds: nextIds,
      endNodeIncomingRoomIds: nextIncoming,
      persistMode: "async",
    });
  }, [updateEndNodeGraph]);

  useEffect(() => {
    const currentStartRoomIds = startRoomIdsRef.current;
    const validRoomIdSet = new Set(allRoomIds);
    const normalizedStartRoomIds = normalizeRoomIdList(
      currentStartRoomIds.filter(roomId => validRoomIdSet.has(roomId)),
    );

    const normalizedIncoming: Record<number, number[]> = {};
    endNodeIdsRef.current.forEach((endNodeId) => {
      const incoming = endNodeIncomingRoomIdsRef.current[endNodeId] ?? [];
      normalizedIncoming[endNodeId] = normalizeRoomIdList(incoming.filter(roomId => validRoomIdSet.has(roomId)));
    });

    const startChanged = !numberArrayEqual(normalizedStartRoomIds, currentStartRoomIds);
    let incomingChanged = false;
    for (const endNodeId of endNodeIdsRef.current) {
      const before = endNodeIncomingRoomIdsRef.current[endNodeId] ?? [];
      const after = normalizedIncoming[endNodeId] ?? [];
      if (!numberArrayEqual(before, after)) {
        incomingChanged = true;
        break;
      }
    }
    if (!startChanged && !incomingChanged)
      return;

    startRoomIdsRef.current = normalizedStartRoomIds;
    setStartRoomIds(normalizedStartRoomIds);
    endNodeIncomingRoomIdsRef.current = normalizedIncoming;
    setEndNodeIncomingRoomIds(normalizedIncoming);

    if (spaceId > 0) {
      updateSpaceMutation({
        spaceId,
        roomMap: serializeRoomMap(
          roomMapRef.current,
          normalizedStartRoomIds,
          endNodeIdsRef.current,
          normalizedIncoming,
        ),
      });
    }
  }, [allRoomIds, spaceId, updateSpaceMutation]);

  // 持久化本地存储节点位置
  const persistNodePositions = useCallback((nodeList: Node[]) => {
    if (spaceId <= 0)
      return;
    const map = new Map<string, { x: number; y: number }>();
    nodeList.forEach((node) => {
      const nodeId = String(node.id).trim();
      if (nodeId.length === 0)
        return;
      const position = node.position;
      if (!position)
        return;
      const { x, y } = position;
      if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y))
        return;
      map.set(nodeId, { x, y });
    });
    persistedPositionsRef.current = map;
    savePersistedPositions(spaceId, map);
  }, [spaceId]);

  const syncRoomMap = useCallback((nextMap: RoomMap) => {
    if (!roomMapsEqual(roomMapRef.current, nextMap)) {
      roomMapRef.current = nextMap;
      setRoomMapState(nextMap);
      if (spaceId > 0) {
        updateSpaceMutation({
          spaceId,
          roomMap: serializeRoomMap(
            nextMap,
            startRoomIdsRef.current,
            endNodeIdsRef.current,
            endNodeIncomingRoomIdsRef.current,
          ),
        });
      }
    }
  }, [spaceId, updateSpaceMutation]);

  const applyRoomMapUpdate = useCallback((updater: (current: RoomMap) => RoomMap) => {
    const nextMap = updater(roomMapRef.current);
    syncRoomMap(nextMap);
  }, [syncRoomMap]);

  const edgeReconnectSuccessful = useRef(true);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const removedEndNodeIds = changes
      .filter(change => change.type === "remove" && "id" in change)
      .map(change => parseEndNodeId(change.id))
      .filter((id): id is number => id != null);
    if (removedEndNodeIds.length > 0) {
      const removedSet = new Set(removedEndNodeIds);
      const nextEndNodeIds = endNodeIdsRef.current.filter(id => !removedSet.has(id));
      const nextIncoming = Object.fromEntries(
        Object.entries(endNodeIncomingRoomIdsRef.current)
          .filter(([id]) => !removedSet.has(Number(id)))
          .map(([id, roomIds]) => [Number(id), roomIds]),
      ) as Record<number, number[]>;
      updateEndNodeGraph({
        endNodeIds: nextEndNodeIds,
        endNodeIncomingRoomIds: nextIncoming,
      });
    }

    let shouldPersist = false;
    if (changes.some(change => change.type === "position" || change.type === "dimensions"))
      shouldPersist = true;
    setNodes((nds) => {
      const next = applyNodeChanges(changes, nds);
      if (shouldPersist)
        persistNodePositions(next);
      return next;
    });
  }, [persistNodePositions, updateEndNodeGraph]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const removedEdges = changes.filter(change => change.type === "remove" && "id" in change) as Array<{ id: string; type: "remove" }>;
    if (removedEdges.length > 0) {
      const removedRoomEdgeIds: string[] = [];
      let nextStartRoomIds = [...startRoomIdsRef.current];
      let startChanged = false;
      let incomingChanged = false;
      const nextIncoming: Record<number, number[]> = { ...endNodeIncomingRoomIdsRef.current };

      removedEdges.forEach(({ id }) => {
        const edge = edgesRef.current.find(e => e.id === id);
        if (!edge)
          return;
        if (isStartEdge(edge)) {
          const removedTargetId = Number(edge.target);
          if (!Number.isNaN(removedTargetId)) {
            const filtered = nextStartRoomIds.filter(roomId => roomId !== removedTargetId);
            if (!numberArrayEqual(filtered, nextStartRoomIds)) {
              nextStartRoomIds = filtered;
              startChanged = true;
            }
          }
          return;
        }
        if (isEndEdge(edge)) {
          const endNodeId = parseEndNodeId(edge.target);
          const sourceRoomId = Number(edge.source);
          if (!endNodeId || !Number.isFinite(sourceRoomId) || sourceRoomId <= 0)
            return;
          const before = nextIncoming[endNodeId] ?? [];
          const after = before.filter(id => id !== sourceRoomId);
          if (!numberArrayEqual(before, after)) {
            nextIncoming[endNodeId] = after;
            incomingChanged = true;
          }
          return;
        }
        removedRoomEdgeIds.push(id);
      });

      if (removedRoomEdgeIds.length > 0) {
        applyRoomMapUpdate((current) => {
          const next = cloneRoomMap(current);
          removedRoomEdgeIds.forEach((id) => {
            const edge = edgesRef.current.find(e => e.id === id);
            if (!edge)
              return;
            const sourceId = Number(edge.source);
            const targetId = Number(edge.target);
            if (Number.isNaN(sourceId) || Number.isNaN(targetId))
              return;
            const edgeData = (edge.data ?? {}) as { condition?: string };
            const edgeCondition = (edgeData.condition ?? (typeof edge.label === "string" ? edge.label : "")).trim();
            const links = next[sourceId] ?? [];
            const filtered = links.filter(link => !(link.targetId === targetId && (link.condition ?? "").trim() === edgeCondition));
            if (filtered.length > 0)
              next[sourceId] = filtered;
            else
              delete next[sourceId];
          });
          return next;
        });
      }

      if (startChanged || incomingChanged) {
        nextStartRoomIds = normalizeRoomIdList(nextStartRoomIds);
        startRoomIdsRef.current = nextStartRoomIds;
        setStartRoomIds(nextStartRoomIds);
        endNodeIncomingRoomIdsRef.current = nextIncoming;
        setEndNodeIncomingRoomIds(nextIncoming);
        if (spaceId > 0) {
          updateSpaceMutation({
            spaceId,
            roomMap: serializeRoomMap(
              roomMapRef.current,
              nextStartRoomIds,
              endNodeIdsRef.current,
              nextIncoming,
            ),
          });
        }
      }
    }
    setEdges(eds => applyEdgeChanges(changes, eds));
  }, [applyRoomMapUpdate, spaceId, updateSpaceMutation]);

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target)
      return;

    if (params.source === START_NODE_ID) {
      const nextStartTargetId = Number(params.target);
      if (Number.isNaN(nextStartTargetId))
        return;
      const nextStartRoomIds = normalizeRoomIdList([
        ...startRoomIdsRef.current,
        nextStartTargetId,
      ]);
      startRoomIdsRef.current = nextStartRoomIds;
      setStartRoomIds(nextStartRoomIds);
      if (spaceId > 0) {
        updateSpaceMutation({
          spaceId,
          roomMap: serializeRoomMap(
            roomMapRef.current,
            nextStartRoomIds,
            endNodeIdsRef.current,
            endNodeIncomingRoomIdsRef.current,
          ),
        });
      }
      return;
    }

    if (isEndNodeId(params.target)) {
      const sourceRoomId = Number(params.source);
      const endNodeId = parseEndNodeId(params.target);
      if (!endNodeId || Number.isNaN(sourceRoomId))
        return;
      const nextIncoming = {
        ...endNodeIncomingRoomIdsRef.current,
        [endNodeId]: normalizeRoomIdList([...(endNodeIncomingRoomIdsRef.current[endNodeId] ?? []), sourceRoomId]),
      };
      endNodeIncomingRoomIdsRef.current = nextIncoming;
      setEndNodeIncomingRoomIds(nextIncoming);
      if (spaceId > 0) {
        updateSpaceMutation({
          spaceId,
          roomMap: serializeRoomMap(
            roomMapRef.current,
            startRoomIdsRef.current,
            endNodeIdsRef.current,
            nextIncoming,
          ),
        });
      }
      return;
    }

    if (params.target === START_NODE_ID || isEndNodeId(params.source))
      return;
    const sourceId = Number(params.source);
    const targetId = Number(params.target);
    if (Number.isNaN(sourceId) || Number.isNaN(targetId))
      return;

    applyRoomMapUpdate((current) => {
      const next = cloneRoomMap(current);
      const links = next[sourceId] ?? [];
      const exists = links.some(link => link.targetId === targetId && (link.condition ?? "").trim().length === 0);
      if (!exists)
        next[sourceId] = sortLinks([...links, { targetId }]);
      return next;
    });

    setEdges(eds => addEdge({
      ...params,
      id: `${params.source}-${params.target}`,
      type: "smoothstep",
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: "#333",
      },
      style: {
        strokeWidth: 2,
      },
    }, eds));
  }, [applyRoomMapUpdate, spaceId, updateSpaceMutation]);

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnectEnd = useCallback((_: unknown, edge: Edge) => {
    if (!edgeReconnectSuccessful.current) {
      if (isStartEdge(edge)) {
        const removedTargetId = Number(edge.target);
        const nextStartRoomIds = Number.isNaN(removedTargetId)
          ? startRoomIdsRef.current
          : normalizeRoomIdList(startRoomIdsRef.current.filter(roomId => roomId !== removedTargetId));
        startRoomIdsRef.current = nextStartRoomIds;
        setStartRoomIds(nextStartRoomIds);
        if (spaceId > 0) {
          updateSpaceMutation({
            spaceId,
            roomMap: serializeRoomMap(
              roomMapRef.current,
              nextStartRoomIds,
              endNodeIdsRef.current,
              endNodeIncomingRoomIdsRef.current,
            ),
          });
        }
      }
      else if (isEndEdge(edge)) {
        const endNodeId = parseEndNodeId(edge.target);
        const sourceRoomId = Number(edge.source);
        if (endNodeId && Number.isFinite(sourceRoomId) && sourceRoomId > 0) {
          const nextIncoming = {
            ...endNodeIncomingRoomIdsRef.current,
            [endNodeId]: (endNodeIncomingRoomIdsRef.current[endNodeId] ?? []).filter(id => id !== sourceRoomId),
          };
          endNodeIncomingRoomIdsRef.current = nextIncoming;
          setEndNodeIncomingRoomIds(nextIncoming);
          if (spaceId > 0) {
            updateSpaceMutation({
              spaceId,
              roomMap: serializeRoomMap(
                roomMapRef.current,
                startRoomIdsRef.current,
                endNodeIdsRef.current,
                nextIncoming,
              ),
            });
          }
        }
      }
      else {
        const sourceId = Number(edge.source);
        const targetId = Number(edge.target);
        if (Number.isNaN(sourceId) || Number.isNaN(targetId)) {
          edgeReconnectSuccessful.current = true;
          return;
        }

        applyRoomMapUpdate((current) => {
          const next = cloneRoomMap(current);
          const edgeData = (edge.data ?? {}) as { condition?: string };
          const currentCondition = (edgeData.condition ?? (typeof edge.label === "string" ? edge.label : "")).trim();
          const links = next[sourceId] ?? [];
          const filtered = links.filter(link => !(link.targetId === targetId && (link.condition ?? "").trim() === currentCondition));
          if (filtered.length > 0)
            next[sourceId] = filtered;
          else
            delete next[sourceId];
          return next;
        });
      }

      setEdges(eds => eds.filter(e => e.id !== edge.id));
    }
    edgeReconnectSuccessful.current = true;
  }, [applyRoomMapUpdate, spaceId, updateSpaceMutation]);

  const onEdgesReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    if (!newConnection.source || !newConnection.target)
      return;

    if (isStartEdge(oldEdge)) {
      if (newConnection.source !== START_NODE_ID)
        return;
      const oldTargetId = Number(oldEdge.target);
      const newTargetId = Number(newConnection.target);
      if (Number.isNaN(oldTargetId) || Number.isNaN(newTargetId))
        return;
      const nextStartRoomIds = normalizeRoomIdList([
        ...startRoomIdsRef.current.filter(roomId => roomId !== oldTargetId),
        newTargetId,
      ]);
      startRoomIdsRef.current = nextStartRoomIds;
      setStartRoomIds(nextStartRoomIds);
      if (spaceId > 0) {
        updateSpaceMutation({
          spaceId,
          roomMap: serializeRoomMap(
            roomMapRef.current,
            nextStartRoomIds,
            endNodeIdsRef.current,
            endNodeIncomingRoomIdsRef.current,
          ),
        });
      }
      setEdges(els => reconnectEdge(oldEdge, newConnection, els));
      edgeReconnectSuccessful.current = true;
      return;
    }

    if (isEndEdge(oldEdge)) {
      const oldEndNodeId = parseEndNodeId(oldEdge.target);
      const oldSourceRoomId = Number(oldEdge.source);
      const newEndNodeId = parseEndNodeId(newConnection.target);
      const newSourceRoomId = Number(newConnection.source);
      if (!oldEndNodeId || !newEndNodeId || Number.isNaN(oldSourceRoomId) || Number.isNaN(newSourceRoomId))
        return;

      const nextIncoming: Record<number, number[]> = { ...endNodeIncomingRoomIdsRef.current };
      nextIncoming[oldEndNodeId] = (nextIncoming[oldEndNodeId] ?? []).filter(id => id !== oldSourceRoomId);
      nextIncoming[newEndNodeId] = normalizeRoomIdList([...(nextIncoming[newEndNodeId] ?? []), newSourceRoomId]);
      endNodeIncomingRoomIdsRef.current = nextIncoming;
      setEndNodeIncomingRoomIds(nextIncoming);
      if (spaceId > 0) {
        updateSpaceMutation({
          spaceId,
          roomMap: serializeRoomMap(
            roomMapRef.current,
            startRoomIdsRef.current,
            endNodeIdsRef.current,
            nextIncoming,
          ),
        });
      }
      setEdges(els => reconnectEdge(oldEdge, newConnection, els));
      edgeReconnectSuccessful.current = true;
      return;
    }

    const oldSourceId = Number(oldEdge.source);
    const oldTargetId = Number(oldEdge.target);
    const newSourceId = Number(newConnection.source);
    const newTargetId = Number(newConnection.target);
    if ([oldSourceId, oldTargetId, newSourceId, newTargetId].some(id => Number.isNaN(id)))
      return;

    const edgeData = (oldEdge.data ?? {}) as { condition?: string };
    const currentCondition = (edgeData.condition ?? (typeof oldEdge.label === "string" ? oldEdge.label : "")).trim();

    applyRoomMapUpdate((current) => {
      const next = cloneRoomMap(current);
      const oldLinks = next[oldSourceId] ?? [];
      const remainingOld = oldLinks.filter(link => !(link.targetId === oldTargetId && (link.condition ?? "").trim() === currentCondition));
      if (remainingOld.length > 0)
        next[oldSourceId] = remainingOld;
      else
        delete next[oldSourceId];

      const newLinks = next[newSourceId] ?? [];
      const desiredCondition = currentCondition;
      const exists = newLinks.some(link => link.targetId === newTargetId && (link.condition ?? "").trim() === desiredCondition);
      if (!exists) {
        next[newSourceId] = sortLinks([...newLinks, desiredCondition ? { targetId: newTargetId, condition: desiredCondition } : { targetId: newTargetId }]);
      }
      return next;
    });

    setEdges(els => reconnectEdge(oldEdge, newConnection, els));
    edgeReconnectSuccessful.current = true;
  }, [applyRoomMapUpdate, spaceId, updateSpaceMutation]);

  // 控制弹窗
  const [close, setClose] = useState<boolean>(false);

  const updateEdgeCondition = useCallback((sourceId: number, targetId: number, currentCondition: string, nextConditionRaw: string) => {
    const normalizedCurrent = currentCondition.trim();
    const normalizedNext = nextConditionRaw.trim();

    applyRoomMapUpdate((current) => {
      const links = current[sourceId] ?? [];
      const matchIndex = links.findIndex(link => link.targetId === targetId && (link.condition ?? "").trim() === normalizedCurrent);
      if (matchIndex !== -1 && normalizedCurrent === normalizedNext)
        return current;

      const next = cloneRoomMap(current);
      const nextLinks = next[sourceId] ?? [];
      const updated = [...nextLinks];

      if (matchIndex !== -1)
        updated.splice(matchIndex, 1);

      const conditionToApply = normalizedNext;
      const hasDuplicate = updated.some(link => link.targetId === targetId && (link.condition ?? "").trim() === conditionToApply);

      if (!hasDuplicate) {
        if (conditionToApply.length > 0)
          updated.push({ targetId, condition: conditionToApply });
        else
          updated.push({ targetId });
      }

      if (updated.length > 0)
        next[sourceId] = sortLinks(updated);
      else
        delete next[sourceId];

      return next;
    });
  }, [applyRoomMapUpdate]);

  // 双击编辑条件
  const onEdgeDoubleClick = useCallback((event: MouseEvent, edge: Edge) => {
    event.preventDefault();
    event.stopPropagation();
    if (isStartEdge(edge) || isEndEdge(edge))
      return;
    const sourceId = Number(edge.source);
    const targetId = Number(edge.target);
    if (Number.isNaN(sourceId) || Number.isNaN(targetId))
      return;

    if (close)
      return;

    const edgeData = (edge.data ?? {}) as { condition?: string };
    const currentCondition = (edgeData.condition ?? (typeof edge.label === "string" ? edge.label : "")).trim();

    setClose(true);

    toastWindow(
      onClose => (
        <ConditionEditor
          initialValue={currentCondition}
          onCancel={() => {
            onClose();
          }}
          onConfirm={(nextValue) => {
            updateEdgeCondition(sourceId, targetId, currentCondition, nextValue);
            onClose();
          }}
        />
      ),
      {
        onclose: () => {
          setClose(false);
        },
      },
    );
  }, [close, setClose, updateEdgeCondition]);

  // 初始化边
  useEffect(() => {
    const sources = Object.keys(roomMapState)
      .map(Number)
      .filter(id => !Number.isNaN(id))
      .sort((a, b) => a - b);

    const newEdges: Edge[] = [];
    sources.forEach((sourceId) => {
      const links = roomMapState[sourceId] ?? [];
      links.forEach((link, index) => {
        const targetId = link.targetId;
        if (Number.isNaN(targetId))
          return;
        const condition = (link.condition ?? "").trim();
        const conditionKey = condition.length > 0 ? encodeURIComponent(condition) : "plain";
        newEdges.push({
          id: `e${sourceId}-${targetId}-${conditionKey}-${index}`,
          source: String(sourceId),
          target: String(targetId),
          type: "smoothstep",
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "#333",
          },
          style: {
            strokeWidth: 2,
          },
          label: condition || undefined,
          labelStyle: condition ? { fill: "#333", fontWeight: 500, fontSize: 12 } : undefined,
          labelBgPadding: condition ? [6, 4] : undefined,
          labelBgBorderRadius: condition ? 4 : undefined,
          labelShowBg: condition ? true : undefined,
          labelBgStyle: condition ? { fill: "rgba(255,255,255,0.9)", stroke: "#999" } : undefined,
          data: {
            condition,
            edgeKind: "room",
          },
        });
      });
    });
    startTargetIds.forEach((startTargetId) => {
      newEdges.push(buildStartEdge(startTargetId));
    });
    endNodeIds.forEach((endNodeId) => {
      const sourceRoomIds = endNodeIncomingRoomIds[endNodeId] ?? [];
      sourceRoomIds.forEach((sourceRoomId) => {
        if (allRoomIds.includes(sourceRoomId))
          newEdges.push(buildEndEdge(endNodeId, sourceRoomId));
      });
    });
    setEdges(newEdges);
  }, [allRoomIds, endNodeIds, endNodeIncomingRoomIds, roomMapState, startTargetIds]);

  useEffect(() => {
    if (!reactFlowInstanceRef.current)
      return;
    if (nodes.length === 0)
      return;
    const key = `${spaceId}:${allRoomIds.join(",")}`;
    if (key === lastFitKeyRef.current)
      return;
    lastFitKeyRef.current = key;
    requestAnimationFrame(() => {
      reactFlowInstanceRef.current?.fitView({ padding: 0.18, duration: 400 });
    });
  }, [allRoomIds, nodes.length, spaceId]);

  useEffect(() => {
    if (!isFullscreen)
      return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape")
        setIsFullscreen(false);
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!reactFlowInstanceRef.current)
      return;
    requestAnimationFrame(() => {
      reactFlowInstanceRef.current?.fitView({ padding: isFullscreen ? 0.12 : 0.18, duration: 260 });
    });
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);
  const computePositionForNewNode = useCallback((
    nodeId: string,
    baseNodes: Node[],
    currentRoomMap: RoomMap,
  ): { x: number; y: number } => {
    const NODE_WIDTH = 200;
    const NODE_HEIGHT = 120;
    const OFFSET_X = NODE_WIDTH / 2;
    const OFFSET_Y = NODE_HEIGHT / 2;

    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });

    baseNodes.forEach((node) => {
      graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });
    graph.setNode(nodeId, { width: NODE_WIDTH, height: NODE_HEIGHT });

    Object.entries(currentRoomMap).forEach(([source, targets]) => {
      targets.forEach((link) => {
        graph.setEdge(String(source), String(link.targetId));
      });
    });

    try {
      dagre.layout(graph);
      const pos = graph.node(nodeId);
      if (pos)
        return { x: pos.x - OFFSET_X, y: pos.y - OFFSET_Y };
    }
    catch {
      // fallback below
    }

    if (baseNodes.length > 0) {
      const xs = baseNodes.map(n => n.position.x);
      const ys = baseNodes.map(n => n.position.y);
      const maxX = Math.max(...xs);
      const avgY = ys.reduce((acc, val) => acc + val, 0) / ys.length;
      return { x: maxX + NODE_WIDTH + 60, y: avgY };
    }

    return { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    if (!positionsLoaded)
      return;

    if (allRoomIds.length === 0) {
      setNodes([]);
      return;
    }

    if (!initialized.current) {
      const graph = new dagre.graphlib.Graph();
      graph.setDefaultEdgeLabel(() => ({}));
      graph.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });

      allRoomIds.forEach((roomId) => {
        graph.setNode(roomId.toString(), { width: 200, height: 100 });
      });

      Object.entries(roomMapState).forEach(([source, targets]) => {
        targets.forEach((link) => {
          graph.setEdge(source, link.targetId.toString());
        });
      });

      dagre.layout(graph);

      const initialRoomNodes: Node[] = allRoomIds.map((roomId) => {
        const nodePosition = graph.node(roomId.toString());
        const info = roomInfoMap.get(roomId);
        const storedPosition = persistedPositionsRef.current.get(String(roomId));
        const roomName = roomLabelMap.get(roomId) ?? `房间 ${roomId}`;
        const roomAvatar = roomAvatarMap.get(roomId) ?? "/favicon.ico";
        const sceneDescription = normalizeSceneDefaultDescription(info?.description);
        return {
          id: roomId.toString(),
          type: "mapEditNode",
          data: {
            label: roomName,
            idx: -1,
            description: sceneDescription,
            tip: "",
            image: roomAvatar,
            children: (
              <WorkflowSceneDescriptionEditor
                roomName={roomName}
                roomAvatar={roomAvatar}
                initialDescription={sceneDescription}
                onSave={nextDescription => saveSceneDefaultDescription(roomId, nextDescription)}
              />
            ),
          },
          position: storedPosition
            ? { x: storedPosition.x, y: storedPosition.y }
            : nodePosition
              ? { x: nodePosition.x - 100, y: nodePosition.y - 60 }
              : { x: 0, y: 0 },
        };
      });

      const primaryStartTargetId = startTargetIds[0];
      const startTargetNode = primaryStartTargetId != null
        ? initialRoomNodes.find(node => node.id === String(primaryStartTargetId))
        : undefined;
      const startNode = buildStartNode({
        targetPosition: startTargetNode?.position,
        storedPosition: persistedPositionsRef.current.get(START_NODE_ID),
      });
      const initialEndNodes: Node[] = endNodeIds
        .map((endNodeId, index) => {
          return buildEndNode(endNodeId, {
            targetPosition: initialRoomNodes[index]?.position,
            storedPosition: persistedPositionsRef.current.get(buildEndNodeId(endNodeId)),
          });
        })
        .filter((node): node is Node => node != null);
      const initialNodes = [
        ...initialRoomNodes,
        ...(startNode ? [startNode] : []),
        ...initialEndNodes,
      ];

      setNodes(initialNodes);
      if (initialNodes.length > 0)
        persistNodePositions(initialNodes);
      initialized.current = true;
      return;
    }

    setNodes((prevNodes) => {
      const existingStartNode = prevNodes.find(node => node.id === START_NODE_ID);
      const existingEndNodeMap = new Map(
        prevNodes
          .filter(node => isEndNodeId(node.id))
          .map(node => [node.id, node]),
      );
      const nodeMap = new Map(
        prevNodes
          .filter(node => node.id !== START_NODE_ID && !isEndNodeId(node.id))
          .map(node => [node.id, node]),
      );
      const nextNodes: Node[] = [];
      const baseNodes = [
        ...prevNodes.filter(node => node.id !== START_NODE_ID && !isEndNodeId(node.id)),
      ];
      let changed = false;

      allRoomIds.forEach((roomId) => {
        const nodeId = roomId.toString();
        const label = roomLabelMap.get(roomId) ?? `房间 ${roomId}`;
        const info = roomInfoMap.get(roomId);
        const roomAvatar = roomAvatarMap.get(roomId) ?? "/favicon.ico";
        const sceneDescription = normalizeSceneDefaultDescription(info?.description);
        const existing = nodeMap.get(nodeId);
        if (existing) {
          const existingData = (existing.data as Record<string, unknown> ?? {});
          const existingLabel = String(existingData.label ?? "");
          const existingDescription = String(existingData.description ?? "");
          const existingImage = String(existingData.image ?? "");
          if (existingLabel !== label || existingDescription !== sceneDescription || existingImage !== roomAvatar)
            changed = true;
          nextNodes.push({
            ...existing,
            data: {
              ...existingData,
              label,
              idx: -1,
              children: (
                <WorkflowSceneDescriptionEditor
                  roomName={label}
                  roomAvatar={roomAvatar}
                  initialDescription={sceneDescription}
                  onSave={nextDescription => saveSceneDefaultDescription(roomId, nextDescription)}
                />
              ),
              description: sceneDescription,
              tip: "",
              image: roomAvatar,
            },
          });
        }
        else {
          changed = true;
          const position = computePositionForNewNode(nodeId, baseNodes, roomMapState);
          const newNode: Node = {
            id: nodeId,
            type: "mapEditNode",
            data: {
              label,
              idx: -1,
              children: (
                <WorkflowSceneDescriptionEditor
                  roomName={label}
                  roomAvatar={roomAvatar}
                  initialDescription={sceneDescription}
                  onSave={nextDescription => saveSceneDefaultDescription(roomId, nextDescription)}
                />
              ),
              description: sceneDescription,
              tip: "",
              image: roomAvatar,
            },
            position,
          };
          nextNodes.push(newNode);
          baseNodes.push(newNode);
        }
      });

      const primaryStartTargetId = startTargetIds[0];
      const startTargetNode = primaryStartTargetId != null
        ? nextNodes.find(node => node.id === String(primaryStartTargetId))
        : undefined;
      const nextStartNode = buildStartNode({
        targetPosition: startTargetNode?.position,
        storedPosition: persistedPositionsRef.current.get(START_NODE_ID),
        existing: existingStartNode,
      });
      if (nextStartNode)
        nextNodes.push(nextStartNode);
      if ((existingStartNode && !nextStartNode) || (!existingStartNode && nextStartNode))
        changed = true;
      if (existingStartNode && nextStartNode) {
        if (existingStartNode.position.x !== nextStartNode.position.x || existingStartNode.position.y !== nextStartNode.position.y)
          changed = true;
        if (existingStartNode.draggable !== nextStartNode.draggable
          || existingStartNode.selectable !== nextStartNode.selectable
          || existingStartNode.connectable !== nextStartNode.connectable
          || existingStartNode.deletable !== nextStartNode.deletable
          || existingStartNode.dragHandle !== nextStartNode.dragHandle) {
          changed = true;
        }
      }

      const nextEndNodes: Node[] = endNodeIds
        .map((endNodeId, index) => {
          const existingEndNode = existingEndNodeMap.get(buildEndNodeId(endNodeId));
          const nextEndNode = buildEndNode(endNodeId, {
            targetPosition: nextNodes[index]?.position,
            storedPosition: persistedPositionsRef.current.get(buildEndNodeId(endNodeId)),
            existing: existingEndNode,
          });
          if (!existingEndNode) {
            changed = true;
          }
          else if (
            existingEndNode.position.x !== nextEndNode.position.x
            || existingEndNode.position.y !== nextEndNode.position.y
            || existingEndNode.draggable !== nextEndNode.draggable
            || existingEndNode.selectable !== nextEndNode.selectable
            || existingEndNode.connectable !== nextEndNode.connectable
            || existingEndNode.deletable !== nextEndNode.deletable
            || existingEndNode.dragHandle !== nextEndNode.dragHandle
          ) {
            changed = true;
          }
          return nextEndNode;
        })
        .filter((node): node is Node => node != null);
      if (existingEndNodeMap.size !== nextEndNodes.length)
        changed = true;
      nextNodes.push(...nextEndNodes);

      if (!changed && nextNodes.length === prevNodes.length)
        return prevNodes;
      persistNodePositions(nextNodes);
      return nextNodes;
    });
  }, [allRoomIds, computePositionForNewNode, endNodeIds, persistNodePositions, positionsLoaded, roomAvatarMap, roomLabelMap, roomInfoMap, roomMapState, saveSceneDefaultDescription, startTargetIds]);

  if (spaceId < 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <span>请选择一个空间以查看房间流程图。</span>
      </div>
    );
  }

  if (spaceQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (spaceQuery.isError) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <span>加载空间信息失败</span>
      </div>
    );
  }

  return (
    <div
      ref={workflowContainerRef}
      className={isFullscreen
        ? "fixed inset-0 z-[120] h-screen w-screen bg-base-100 p-3"
        : "relative h-[75vh] w-full min-w-[50vw]"}
    >
      <button
        type="button"
        className="absolute right-28 top-4 z-20 inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100/90 px-3 py-1.5 text-xs font-medium text-base-content shadow-sm backdrop-blur transition hover:bg-base-100"
        onClick={() => {
          void addEndNode();
        }}
      >
        <span>新增结束节点</span>
      </button>
      <button
        type="button"
        className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100/90 px-3 py-1.5 text-xs font-medium text-base-content shadow-sm backdrop-blur transition hover:bg-base-100"
        onClick={toggleFullscreen}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden>
          {isFullscreen
            ? (
                <path d="M3 3h5v2H5v3H3V3zm9 0h5v5h-2V5h-3V3zM3 12h2v3h3v2H3v-5zm12 0h2v5h-5v-2h3v-3z" />
              )
            : (
                <path d="M3 8V3h5v2H5v3H3zm9-5h5v5h-2V5h-3V3zM3 12h2v3h3v2H3v-5zm12 3v-3h2v5h-5v-2h3z" />
              )}
        </svg>
        <span>{isFullscreen ? "退出全屏" : "全屏查看"}</span>
      </button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onEdgesReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodeTypes={nodeTypes}
        nodesDraggable={isFullscreen}
        panOnDrag={isFullscreen}
        zoomOnScroll={isFullscreen}
        zoomOnPinch={isFullscreen}
        preventScrolling={isFullscreen}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance;
          if (nodes.length > 0) {
            lastFitKeyRef.current = "";
            instance.fitView({ padding: 0.18, duration: 400 });
          }
        }}
        nodeOrigin={[0.5, 0]}
      >
        <Controls />
        <Background gap={16} color="#aaa" />
      </ReactFlow>
    </div>
  );
}
