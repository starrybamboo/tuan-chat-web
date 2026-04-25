import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Edge, Node, ReactFlowInstance } from "@xyflow/react";
import type { RoomMap } from "@/components/chat/window/workflowGraphUtils";
import {
  Background,
  Controls,
  ReactFlow,
} from "@xyflow/react";
import { useGetSpaceInfoQuery, useGetUserRoomsQuery, useUpdateRoomMutation, useUpdateSpaceMutation } from "api/hooks/chatQueryHooks";
import { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWorkflowFullscreen } from "@/components/chat/window/useWorkflowFullscreen";
import { useWorkflowGraphInteractions } from "@/components/chat/window/useWorkflowGraphInteractions";
import { buildWorkflowRoomEdge } from "@/components/chat/window/workflowEdgeUtils";
import WorkflowEndNode from "@/components/chat/window/workflowEndNode";
import {
  buildEndEdge,
  buildEndNode,
  buildEndNodeId,
  buildStartEdge,
  buildStartNode,
  collectAllRoomIds,
  isEndNodeId,
  loadPersistedPositions,
  normalizeRoomMap,
  normalizeSceneDefaultDescription,
  resolveStartTargetIds,
  roomMapsEqual,
  START_NODE_ID,
} from "@/components/chat/window/workflowGraphUtils";
import { computeInitialRoomNodePositions, computePositionForNewWorkflowNode } from "@/components/chat/window/workflowLayoutUtils";
import WorkflowSceneDescriptionEditor from "@/components/chat/window/workflowSceneDescriptionEditor";
import WorkflowStartNode from "@/components/chat/window/workflowStartNode";
import SceneNode from "@/components/repository/detail/ContentTab/scene/react flow/NewSceneNode";
import { SpaceContext } from "../core/spaceContext";
import { useEntityHeaderOverrideStore } from "../stores/entityHeaderOverrideStore";
import "@xyflow/react/dist/style.css";

const nodeTypes = {
  mapEditNode: SceneNode,
  startNode: WorkflowStartNode,
  endNode: WorkflowEndNode,
};

// 转化roomMap
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
  const { isFullscreen, toggleFullscreen } = useWorkflowFullscreen(reactFlowInstanceRef);

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

  const {
    addEndNode,
    handleDeleteEndNode,
    onConnect,
    onEdgeDoubleClick,
    onEdgesChange,
    onEdgesReconnect,
    onNodesChange,
    onReconnectEnd,
    onReconnectStart,
    persistNodePositions,
  } = useWorkflowGraphInteractions({
    allRoomIds,
    spaceId,
    roomMapRef,
    startRoomIdsRef,
    endNodeIdsRef,
    endNodeIncomingRoomIdsRef,
    edgesRef,
    persistedPositionsRef,
    setRoomMapState,
    setStartRoomIds,
    setEndNodeIds,
    setEndNodeIncomingRoomIds,
    setNodes,
    setEdges,
    updateSpaceMutation,
    updateSpaceMutationAsync,
  });

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
        newEdges.push(buildWorkflowRoomEdge(sourceId, targetId, link.condition ?? "", index));
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
    if (!positionsLoaded)
      return;

    if (allRoomIds.length === 0) {
      setNodes([]);
      return;
    }

    if (!initialized.current) {
      const initialRoomNodePositions = computeInitialRoomNodePositions(allRoomIds, roomMapState);

      const initialRoomNodes: Node[] = allRoomIds.map((roomId) => {
        const nodePosition = initialRoomNodePositions.get(roomId);
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
              ? { x: nodePosition.x, y: nodePosition.y }
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
            onDelete: handleDeleteEndNode,
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
          const position = computePositionForNewWorkflowNode(nodeId, baseNodes, roomMapState);
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
            onDelete: handleDeleteEndNode,
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
  }, [allRoomIds, endNodeIds, handleDeleteEndNode, persistNodePositions, positionsLoaded, roomAvatarMap, roomLabelMap, roomInfoMap, roomMapState, saveSceneDefaultDescription, startTargetIds]);

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
