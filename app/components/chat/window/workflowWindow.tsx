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
import { useGetSpaceInfoQuery, useGetUserRoomsQuery, useUpdateSpaceMutation } from "api/hooks/chatQueryHooks";
import dagre from "dagre";
import { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import SceneNode from "@/components/repository/detail/ContentTab/scene/react flow/NewSceneNode";
import { SpaceContext } from "../core/spaceContext";
import "@xyflow/react/dist/style.css";

interface RoomLink {
  targetId: number;
  condition?: string;
}

interface NormalizedRoomMap {
  links: Record<number, RoomLink[]>;
  startRoomId?: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId?: string;
}

type RoomMap = NormalizedRoomMap["links"];
const nodeTypes = {
  mapEditNode: SceneNode,
};

const DEFAULT_NODE_WIDTH = 300;
const WORKFLOW_STORAGE_PREFIX = "workflow";

interface PersistedNodePosition {
  nodeId: number;
  x: number;
  y: number;
}

function getWorkflowStorageKey(spaceId: number): string {
  return `${WORKFLOW_STORAGE_PREFIX}${spaceId}`;
}

function loadPersistedPositions(spaceId: number): Map<number, { x: number; y: number }> {
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
    const result = new Map<number, { x: number; y: number }>();
    parsed.forEach((entry) => {
      if (!entry)
        return;
      const { nodeId, x, y } = entry;
      if (typeof nodeId !== "number" || Number.isNaN(nodeId))
        return;
      if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y))
        return;
      result.set(nodeId, { x, y });
    });
    return result;
  }
  catch {
    return new Map();
  }
}

function savePersistedPositions(spaceId: number, positions: Map<number, { x: number; y: number }>): void {
  if (typeof window === "undefined" || spaceId <= 0)
    return;
  const key = getWorkflowStorageKey(spaceId);
  const payload: PersistedNodePosition[] = [];
  positions.forEach((value, nodeId) => {
    payload.push({ nodeId, x: value.x, y: value.y });
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
  const result: NormalizedRoomMap = { links: {} };
  if (!roomMap)
    return result;

  Object.entries(roomMap).forEach(([key, value]) => {
    if (key === "start") {
      const startValue = Array.isArray(value) ? value[0] : undefined;
      const startId = typeof startValue === "number" ? startValue : Number(startValue);
      if (!Number.isNaN(startId))
        result.startRoomId = startId;
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

function serializeRoomMap(map: RoomMap, startRoomId?: number): Record<string, string[]> {
  const serialized: Record<string, string[]> = {};
  Object.entries(map).forEach(([key, value]) => {
    if (!value || value.length === 0)
      return;
    const formatted = sortLinks(value).map(link => formatRoomLink(link));
    serialized[key] = formatted;
  });
  if (startRoomId != null && !Number.isNaN(startRoomId))
    serialized.start = [String(startRoomId)];
  return serialized;
}

function collectAllRoomIds(roomMap: RoomMap, rooms: Room[], startRoomId?: number): number[] {
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
  if (startRoomId != null && !Number.isNaN(startRoomId))
    acc.add(startRoomId);
  return Array.from(acc).sort((a, b) => a - b);
}

export default function WorkflowWindow() {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;

  const spaceQuery = useGetSpaceInfoQuery(spaceId);
  const spaceInfo = spaceQuery.data?.data;

  const userRoomsQuery = useGetUserRoomsQuery(spaceId);
  const userRooms = useMemo<Room[]>(() => userRoomsQuery.data?.data?.rooms ?? [], [userRoomsQuery.data?.data?.rooms]);
  const userRoomNameMap = useMemo(() => {
    const map = new Map<number, string>();
    userRooms.forEach((room) => {
      if (room.roomId != null)
        map.set(room.roomId, room.name ?? `房间 ${room.roomId}`);
    });
    return map;
  }, [userRooms]);

  const { mutate: updateSpaceMutation } = useUpdateSpaceMutation();

  const [roomMapState, setRoomMapState] = useState<RoomMap>({});
  const roomMapRef = useRef<RoomMap>({});
  const [startRoomId, setStartRoomId] = useState<number | undefined>(undefined);
  const startRoomIdRef = useRef<number | undefined>(undefined);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const initialized = useRef(false);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const lastFitKeyRef = useRef<string>("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  const persistedPositionsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const [positionsLoaded, setPositionsLoaded] = useState(false);

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
    setStartRoomId(normalized.startRoomId);
    startRoomIdRef.current = normalized.startRoomId;
    if (!roomMapsEqual(roomMapRef.current, normalized.links)) {
      roomMapRef.current = normalized.links;
      setRoomMapState(normalized.links);
      initialized.current = false;
    }
  }, [spaceInfo]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => (prev.visible ? { visible: false, x: 0, y: 0 } : prev));
  }, []);

  useEffect(() => {
    if (!contextMenu.visible)
      return;
    const handleGlobalClick = () => {
      hideContextMenu();
    };
    window.addEventListener("click", handleGlobalClick);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, [contextMenu.visible, hideContextMenu]);

  const allRoomIds = useMemo(() =>
    collectAllRoomIds(roomMapState, userRooms, startRoomIdRef.current), [roomMapState, userRooms]);

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
      const fallback = userRoomNameMap.get(roomId) ?? `房间 ${roomId}`;
      const label = info?.name?.trim() ? info.name : fallback;
      labels.set(roomId, label);
    });
    return labels;
  }, [allRoomIds, roomInfoMap, userRoomNameMap]);

  const handleFlowMoveStart = useCallback(() => {
    hideContextMenu();
  }, [hideContextMenu]);

  // 持久化本地存储节点位置
  const persistNodePositions = useCallback((nodeList: Node[]) => {
    if (spaceId <= 0)
      return;
    const map = new Map<number, { x: number; y: number }>();
    nodeList.forEach((node) => {
      const nodeId = Number(node.id);
      if (Number.isNaN(nodeId))
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
          roomMap: serializeRoomMap(nextMap, startRoomIdRef.current),
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
    let shouldPersist = false;
    if (changes.some(change => change.type === "position" || change.type === "dimensions"))
      shouldPersist = true;
    setNodes((nds) => {
      const next = applyNodeChanges(changes, nds);
      if (shouldPersist)
        persistNodePositions(next);
      return next;
    });
  }, [persistNodePositions]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const removedEdges = changes.filter(change => change.type === "remove" && "id" in change) as Array<{ id: string; type: "remove" }>;
    if (removedEdges.length > 0) {
      applyRoomMapUpdate((current) => {
        const next = cloneRoomMap(current);
        removedEdges.forEach(({ id }) => {
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
    setEdges(eds => applyEdgeChanges(changes, eds));
  }, [applyRoomMapUpdate]);

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target)
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
  }, [applyRoomMapUpdate]);

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnectEnd = useCallback((_: unknown, edge: Edge) => {
    if (!edgeReconnectSuccessful.current) {
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

      setEdges(eds => eds.filter(e => e.id !== edge.id));
    }
    edgeReconnectSuccessful.current = true;
  }, [applyRoomMapUpdate]);

  const onEdgesReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    if (!newConnection.source || !newConnection.target)
      return;
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
  }, [applyRoomMapUpdate]);

  const onNodeContextMenu = useCallback((event: MouseEvent, node: Node) => {
    event.preventDefault();
    event.stopPropagation();
    const nodeWidth = typeof node.width === "number" && node.width > 0 ? node.width : DEFAULT_NODE_WIDTH;
    const adjustedX = event.clientX - nodeWidth / 2;
    setContextMenu({
      visible: true,
      x: adjustedX,
      y: event.clientY - (node.height ?? 0) / 2,
      nodeId: node.id,
    });
  }, []);

  const handleSetStartNode = useCallback((nodeId?: string) => {
    hideContextMenu();
    if (!nodeId)
      return;
    const roomId = Number(nodeId);
    if (Number.isNaN(roomId))
      return;
    if (startRoomIdRef.current === roomId)
      return;
    startRoomIdRef.current = roomId;
    setStartRoomId(roomId);
    setNodes(prevNodes => prevNodes.map((node) => {
      if (!node?.data)
        return node;
      return {
        ...node,
        data: {
          ...(node.data as Record<string, unknown>),
          isStart: node.id === String(roomId),
        },
      };
    }));
    if (spaceId > 0) {
      updateSpaceMutation({
        spaceId,
        roomMap: serializeRoomMap(roomMapRef.current, roomId),
      });
    }
  }, [hideContextMenu, spaceId, updateSpaceMutation]);

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
          },
        });
      });
    });
    setEdges(newEdges);
  }, [roomMapState]);

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

      const currentStart = startRoomIdRef.current;
      const initialNodes: Node[] = allRoomIds.map((roomId) => {
        const nodePosition = graph.node(roomId.toString());
        const info = roomInfoMap.get(roomId);
        const storedPosition = persistedPositionsRef.current.get(roomId);
        return {
          id: roomId.toString(),
          type: "mapEditNode",
          data: {
            label: roomLabelMap.get(roomId) ?? `房间 ${roomId}`,
            idx: -1,
            children: undefined,
            sceneItems: [],
            sceneRoles: [],
            sceneLocations: [],
            description: info?.description ?? "",
            tip: "",
            isStart: currentStart != null && roomId === currentStart,
          },
          position: storedPosition
            ? { x: storedPosition.x, y: storedPosition.y }
            : nodePosition
              ? { x: nodePosition.x - 100, y: nodePosition.y - 60 }
              : { x: 0, y: 0 },
        };
      });

      setNodes(initialNodes);
      if (initialNodes.length > 0)
        persistNodePositions(initialNodes);
      initialized.current = true;
      return;
    }

    setNodes((prevNodes) => {
      const currentStart = startRoomIdRef.current;
      const nodeMap = new Map(prevNodes.map(node => [node.id, node]));
      const nextNodes: Node[] = [];
      const baseNodes = [...prevNodes];
      let changed = false;

      allRoomIds.forEach((roomId) => {
        const nodeId = roomId.toString();
        const label = roomLabelMap.get(roomId) ?? `房间 ${roomId}`;
        const info = roomInfoMap.get(roomId);
        const existing = nodeMap.get(nodeId);
        if (existing) {
          const existingLabel = (existing.data as any)?.label;
          if (existingLabel !== label)
            changed = true;
          nextNodes.push({
            ...existing,
            data: {
              ...(existing.data as Record<string, unknown> ?? {}),
              label,
              idx: -1,
              children: undefined,
              sceneItems: [],
              sceneRoles: [],
              sceneLocations: [],
              description: info?.description ?? "",
              tip: "",
              isStart: currentStart != null && roomId === currentStart,
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
              children: undefined,
              sceneItems: [],
              sceneRoles: [],
              sceneLocations: [],
              description: info?.description ?? "",
              tip: "",
              isStart: currentStart != null && roomId === currentStart,
            },
            position,
          };
          nextNodes.push(newNode);
          baseNodes.push(newNode);
        }
      });

      if (!changed && nextNodes.length === prevNodes.length)
        return prevNodes;
      persistNodePositions(nextNodes);
      return nextNodes;
    });
  }, [allRoomIds, computePositionForNewNode, persistNodePositions, positionsLoaded, roomLabelMap, roomInfoMap, roomMapState, startRoomId]);

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
    <div className="relative w-full min-w-[50vw] h-[75vh]">
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
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={hideContextMenu}
        onPaneContextMenu={(event) => {
          event.preventDefault();
          hideContextMenu();
        }}
        onMoveStart={handleFlowMoveStart}
        nodeTypes={nodeTypes}
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
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-base-100 border border-base-300 rounded-md shadow-lg min-w-[160px] py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={event => event.stopPropagation()}
        >
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm hover:bg-base-200"
            onClick={() => handleSetStartNode(contextMenu.nodeId)}
          >
            设置为开始节点
          </button>
        </div>
      )}
    </div>
  );
}
