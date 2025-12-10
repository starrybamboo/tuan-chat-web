/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { Connection, Edge, EdgeChange, Node, NodeChange, ReactFlowInstance } from "@xyflow/react";
import type { Room } from "api/models/Room";
import type { Space } from "api/models/Space";
import SceneNode from "@/components/module/detail/ContentTab/scene/react flow/NewSceneNode";
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
import { SpaceContext } from "../spaceContext";
import "@xyflow/react/dist/style.css";

type RoomMap = Record<number, number[]>;
const nodeTypes = {
  mapEditNode: SceneNode,
};

function normalizeRoomMap(roomMap: Space["roomMap"]): RoomMap {
  if (!roomMap)
    return {};
  const normalized: RoomMap = {};
  Object.entries(roomMap).forEach(([key, value]) => {
    const roomId = Number(key);
    if (Number.isNaN(roomId))
      return;
    const targets = Array.isArray(value) ? value : [];
    const deduped = Array.from(new Set(targets.map(Number).filter(id => !Number.isNaN(id)))).sort((a, b) => a - b);
    normalized[roomId] = deduped;
  });
  return normalized;
}

function cloneRoomMap(map: RoomMap): RoomMap {
  const cloned: RoomMap = {};
  Object.entries(map).forEach(([key, value]) => {
    cloned[Number(key)] = [...value];
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
    const arrA = [...(a[keysA[i]] ?? [])].sort((x, y) => x - y);
    const arrB = [...(b[keysA[i]] ?? [])].sort((x, y) => x - y);
    if (arrA.length !== arrB.length)
      return false;
    for (let j = 0; j < arrA.length; j += 1) {
      if (arrA[j] !== arrB[j])
        return false;
    }
  }
  return true;
}

function toStringRoomMap(map: RoomMap): Record<string, number[]> {
  const serialized: Record<string, number[]> = {};
  Object.entries(map).forEach(([key, value]) => {
    const sorted = [...value].sort((a, b) => a - b);
    serialized[key] = sorted;
  });
  return serialized;
}

function collectAllRoomIds(roomMap: RoomMap, rooms: Room[]): number[] {
  const acc = new Set<number>();
  rooms.forEach((room) => {
    if (room.roomId != null)
      acc.add(Number(room.roomId));
  });
  Object.entries(roomMap).forEach(([source, targets]) => {
    const sourceId = Number(source);
    if (!Number.isNaN(sourceId))
      acc.add(sourceId);
    targets.forEach((target) => {
      if (!Number.isNaN(target))
        acc.add(target);
    });
  });
  return Array.from(acc).sort((a, b) => a - b);
}

export default function WorkflowWindow() {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;

  const spaceQuery = useGetSpaceInfoQuery(spaceId);
  const spaceInfo = spaceQuery.data?.data;

  const userRoomsQuery = useGetUserRoomsQuery(spaceId);
  const userRooms = useMemo(() => userRoomsQuery.data?.data ?? [], [userRoomsQuery.data?.data]);
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

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const initialized = useRef(false);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const lastFitKeyRef = useRef<string>("");

  useLayoutEffect(() => {
    if (!spaceInfo)
      return;
    const normalized = normalizeRoomMap(spaceInfo.roomMap);
    if (!roomMapsEqual(roomMapRef.current, normalized)) {
      roomMapRef.current = normalized;
      setRoomMapState(normalized);
      initialized.current = false;
    }
  }, [spaceInfo]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const allRoomIds = useMemo(() => collectAllRoomIds(roomMapState, userRooms), [roomMapState, userRooms]);

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

  const syncRoomMap = useCallback((nextMap: RoomMap) => {
    if (!roomMapsEqual(roomMapRef.current, nextMap)) {
      roomMapRef.current = nextMap;
      setRoomMapState(nextMap);
      if (spaceId > 0) {
        updateSpaceMutation({
          spaceId,
          roomMap: toStringRoomMap(nextMap),
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
    setNodes(nds => applyNodeChanges(changes, nds));
  }, []);

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
          const targets = next[sourceId] ?? [];
          next[sourceId] = targets.filter(target => target !== targetId);
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
      const targets = next[sourceId] ? new Set(next[sourceId]) : new Set<number>();
      targets.add(targetId);
      next[sourceId] = Array.from(targets).sort((a, b) => a - b);
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
        const targets = next[sourceId] ?? [];
        next[sourceId] = targets.filter(id => id !== targetId);
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

    applyRoomMapUpdate((current) => {
      const next = cloneRoomMap(current);
      const oldTargets = next[oldSourceId] ?? [];
      next[oldSourceId] = oldTargets.filter(id => id !== oldTargetId);

      const updatedTargets = next[newSourceId] ? new Set(next[newSourceId]) : new Set<number>();
      updatedTargets.add(newTargetId);
      next[newSourceId] = Array.from(updatedTargets).sort((a, b) => a - b);
      return next;
    });

    setEdges(els => reconnectEdge(oldEdge, newConnection, els));
    edgeReconnectSuccessful.current = true;
  }, [applyRoomMapUpdate]);

  useEffect(() => {
    const sources = Object.keys(roomMapState)
      .map(Number)
      .filter(id => !Number.isNaN(id))
      .sort((a, b) => a - b);

    const newEdges: Edge[] = [];
    let edgeId = 1;

    sources.forEach((sourceId) => {
      const targets = [...(roomMapState[sourceId] ?? [])]
        .filter(target => !Number.isNaN(target))
        .sort((a, b) => a - b);

      targets.forEach((targetId) => {
        newEdges.push({
          id: `e${edgeId++}`,
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
        });
      });
    });
    setEdges((prev) => {
      const sameLength = prev.length === newEdges.length;
      const unchanged = sameLength && prev.every((edge, idx) => {
        const next = newEdges[idx];
        return edge.id === next.id && edge.source === next.source && edge.target === next.target;
      });
      if (unchanged)
        return prev;
      return newEdges;
    });
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
      targets.forEach((target) => {
        graph.setEdge(String(source), String(target));
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
        targets.forEach((target) => {
          graph.setEdge(source, target.toString());
        });
      });

      dagre.layout(graph);

      const initialNodes: Node[] = allRoomIds.map((roomId) => {
        const nodePosition = graph.node(roomId.toString());
        const info = roomInfoMap.get(roomId);
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
          },
          position: nodePosition
            ? { x: nodePosition.x - 100, y: nodePosition.y - 60 }
            : { x: 0, y: 0 },
        };
      });

      setNodes(initialNodes);
      initialized.current = true;
      return;
    }

    setNodes((prevNodes) => {
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
            },
            position,
          };
          nextNodes.push(newNode);
          baseNodes.push(newNode);
        }
      });

      if (!changed && nextNodes.length === prevNodes.length)
        return prevNodes;
      return nextNodes;
    });
  }, [allRoomIds, computePositionForNewNode, roomLabelMap, roomInfoMap, roomMapState]);

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
    <div className="w-full min-w-[50vw] h-[75vh]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onEdgesReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
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
    </div>
  );
}
