import type { Connection, Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import type { Dispatch, MouseEvent, MutableRefObject, SetStateAction } from "react";
import type { RoomMap } from "@/components/chat/window/workflowGraphUtils";

import { addEdge, applyEdgeChanges, applyNodeChanges, reconnectEdge } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import WorkflowConditionEditor from "@/components/chat/window/workflowConditionEditor";
import { buildWorkflowRoomEdge, resolveWorkflowRoomEdgeCondition } from "@/components/chat/window/workflowEdgeUtils";
import {
  cloneRoomMap,
  isEndEdge,
  isEndNodeId,
  isStartEdge,
  normalizeRoomIdList,
  numberArrayEqual,
  parseEndNodeId,
  roomMapsEqual,
  savePersistedPositions,
  serializeRoomMap,
  sortLinks,
  START_NODE_ID,
} from "@/components/chat/window/workflowGraphUtils";
import toastWindow from "@/components/common/toastWindow/toastWindow";

type PersistMode = "sync" | "async";

interface UpdateSpacePayload {
  spaceId: number;
  roomMap: Record<string, string[]>;
}

interface UseWorkflowGraphInteractionsParams {
  allRoomIds: number[];
  spaceId: number;
  roomMapRef: MutableRefObject<RoomMap>;
  startRoomIdsRef: MutableRefObject<number[]>;
  endNodeIdsRef: MutableRefObject<number[]>;
  endNodeIncomingRoomIdsRef: MutableRefObject<Record<number, number[]>>;
  edgesRef: MutableRefObject<Edge[]>;
  persistedPositionsRef: MutableRefObject<Map<string, { x: number; y: number }>>;
  setRoomMapState: Dispatch<SetStateAction<RoomMap>>;
  setStartRoomIds: Dispatch<SetStateAction<number[]>>;
  setEndNodeIds: Dispatch<SetStateAction<number[]>>;
  setEndNodeIncomingRoomIds: Dispatch<SetStateAction<Record<number, number[]>>>;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  updateSpaceMutation: (payload: UpdateSpacePayload) => void;
  updateSpaceMutationAsync: (payload: UpdateSpacePayload) => Promise<unknown>;
}

interface UseWorkflowGraphInteractionsResult {
  addEndNode: () => Promise<void>;
  handleDeleteEndNode: (endNodeId: number) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (params: Connection) => void;
  onReconnectStart: () => void;
  onReconnectEnd: (_: unknown, edge: Edge) => void;
  onEdgesReconnect: (oldEdge: Edge, newConnection: Connection) => void;
  onEdgeDoubleClick: (event: MouseEvent, edge: Edge) => void;
  persistNodePositions: (nodeList: Node[]) => void;
}

function incomingRoomIdsEqual(endNodeIds: number[], a: Record<number, number[]>, b: Record<number, number[]>): boolean {
  return endNodeIds.every((endNodeId) => {
    const left = a[endNodeId] ?? [];
    const right = b[endNodeId] ?? [];
    return numberArrayEqual(left, right);
  });
}

export function useWorkflowGraphInteractions({
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
}: UseWorkflowGraphInteractionsParams): UseWorkflowGraphInteractionsResult {
  const edgeReconnectSuccessful = useRef(true);
  const [isConditionEditorOpen, setIsConditionEditorOpen] = useState(false);

  const persistWorkflowState = useCallback((params?: {
    roomMap?: RoomMap;
    startRoomIds?: number[];
    endNodeIds?: number[];
    endNodeIncomingRoomIds?: Record<number, number[]>;
    persistMode?: PersistMode;
  }) => {
    if (spaceId <= 0)
      return;

    const payload = {
      spaceId,
      roomMap: serializeRoomMap(
        params?.roomMap ?? roomMapRef.current,
        params?.startRoomIds ?? startRoomIdsRef.current,
        params?.endNodeIds ?? endNodeIdsRef.current,
        params?.endNodeIncomingRoomIds ?? endNodeIncomingRoomIdsRef.current,
      ),
    };

    if (params?.persistMode === "async")
      return updateSpaceMutationAsync(payload);
    updateSpaceMutation(payload);
  }, [endNodeIdsRef, endNodeIncomingRoomIdsRef, roomMapRef, spaceId, startRoomIdsRef, updateSpaceMutation, updateSpaceMutationAsync]);

  const commitStartAndIncomingState = useCallback((
    nextStartRoomIds: number[],
    nextIncomingRoomIds: Record<number, number[]>,
    persistMode: PersistMode = "sync",
  ) => {
    const normalizedStartRoomIds = normalizeRoomIdList(nextStartRoomIds);
    const normalizedIncoming: Record<number, number[]> = {};
    endNodeIdsRef.current.forEach((endNodeId) => {
      normalizedIncoming[endNodeId] = normalizeRoomIdList(nextIncomingRoomIds[endNodeId] ?? []);
    });

    const startChanged = !numberArrayEqual(normalizedStartRoomIds, startRoomIdsRef.current);
    const incomingChanged = !incomingRoomIdsEqual(endNodeIdsRef.current, normalizedIncoming, endNodeIncomingRoomIdsRef.current);
    if (!startChanged && !incomingChanged)
      return;

    startRoomIdsRef.current = normalizedStartRoomIds;
    endNodeIncomingRoomIdsRef.current = normalizedIncoming;
    setStartRoomIds(normalizedStartRoomIds);
    setEndNodeIncomingRoomIds(normalizedIncoming);

    return persistWorkflowState({
      startRoomIds: normalizedStartRoomIds,
      endNodeIncomingRoomIds: normalizedIncoming,
      persistMode,
    });
  }, [endNodeIdsRef, endNodeIncomingRoomIdsRef, persistWorkflowState, setEndNodeIncomingRoomIds, setStartRoomIds, startRoomIdsRef]);

  const updateEndNodeGraph = useCallback((params: {
    endNodeIds: number[];
    endNodeIncomingRoomIds: Record<number, number[]>;
    persistMode?: PersistMode;
  }) => {
    const normalizedEndNodeIds = normalizeRoomIdList(params.endNodeIds);
    const normalizedIncoming: Record<number, number[]> = {};
    normalizedEndNodeIds.forEach((endNodeId) => {
      normalizedIncoming[endNodeId] = normalizeRoomIdList(params.endNodeIncomingRoomIds[endNodeId] ?? []);
    });

    const endNodeIdsChanged = !numberArrayEqual(normalizedEndNodeIds, endNodeIdsRef.current);
    const incomingChanged = !incomingRoomIdsEqual(normalizedEndNodeIds, normalizedIncoming, endNodeIncomingRoomIdsRef.current);
    if (!endNodeIdsChanged && !incomingChanged)
      return;

    endNodeIdsRef.current = normalizedEndNodeIds;
    endNodeIncomingRoomIdsRef.current = normalizedIncoming;
    setEndNodeIds(normalizedEndNodeIds);
    setEndNodeIncomingRoomIds(normalizedIncoming);

    return persistWorkflowState({
      endNodeIds: normalizedEndNodeIds,
      endNodeIncomingRoomIds: normalizedIncoming,
      persistMode: params.persistMode,
    });
  }, [endNodeIdsRef, endNodeIncomingRoomIdsRef, persistWorkflowState, setEndNodeIds, setEndNodeIncomingRoomIds]);

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
  }, [persistedPositionsRef, spaceId]);

  const syncRoomMap = useCallback((nextMap: RoomMap) => {
    if (roomMapsEqual(roomMapRef.current, nextMap))
      return;

    roomMapRef.current = nextMap;
    setRoomMapState(nextMap);
    void persistWorkflowState({ roomMap: nextMap });
  }, [persistWorkflowState, roomMapRef, setRoomMapState]);

  const applyRoomMapUpdate = useCallback((updater: (current: RoomMap) => RoomMap) => {
    const nextMap = updater(roomMapRef.current);
    syncRoomMap(nextMap);
  }, [roomMapRef, syncRoomMap]);

  const removeEndNodes = useCallback(async (
    removedEndNodeIds: number[],
    persistMode: PersistMode = "sync",
  ) => {
    const normalizedRemovedEndNodeIds = normalizeRoomIdList(removedEndNodeIds);
    if (normalizedRemovedEndNodeIds.length === 0)
      return;

    const removedSet = new Set(normalizedRemovedEndNodeIds);
    const nextEndNodeIds = endNodeIdsRef.current.filter(id => !removedSet.has(id));
    const nextIncoming = Object.fromEntries(
      Object.entries(endNodeIncomingRoomIdsRef.current)
        .filter(([id]) => !removedSet.has(Number(id)))
        .map(([id, roomIds]) => [Number(id), roomIds]),
    ) as Record<number, number[]>;

    await updateEndNodeGraph({
      endNodeIds: nextEndNodeIds,
      endNodeIncomingRoomIds: nextIncoming,
      persistMode,
    });
  }, [endNodeIdsRef, endNodeIncomingRoomIdsRef, updateEndNodeGraph]);

  const handleDeleteEndNode = useCallback((endNodeId: number) => {
    void removeEndNodes([endNodeId], "async");
  }, [removeEndNodes]);

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
  }, [endNodeIdsRef, endNodeIncomingRoomIdsRef, updateEndNodeGraph]);

  useEffect(() => {
    const validRoomIdSet = new Set(allRoomIds);
    const normalizedStartRoomIds = normalizeRoomIdList(
      startRoomIdsRef.current.filter(roomId => validRoomIdSet.has(roomId)),
    );

    const normalizedIncoming: Record<number, number[]> = {};
    endNodeIdsRef.current.forEach((endNodeId) => {
      const incoming = endNodeIncomingRoomIdsRef.current[endNodeId] ?? [];
      normalizedIncoming[endNodeId] = normalizeRoomIdList(incoming.filter(roomId => validRoomIdSet.has(roomId)));
    });

    const startChanged = !numberArrayEqual(normalizedStartRoomIds, startRoomIdsRef.current);
    const incomingChanged = endNodeIdsRef.current.some((endNodeId) => {
      const before = endNodeIncomingRoomIdsRef.current[endNodeId] ?? [];
      const after = normalizedIncoming[endNodeId] ?? [];
      return !numberArrayEqual(before, after);
    });

    if (!startChanged && !incomingChanged)
      return;

    void commitStartAndIncomingState(normalizedStartRoomIds, normalizedIncoming);
  }, [allRoomIds, commitStartAndIncomingState, endNodeIdsRef, endNodeIncomingRoomIdsRef, startRoomIdsRef]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const removedEndNodeIds = changes
      .filter(change => change.type === "remove" && "id" in change)
      .map(change => parseEndNodeId(change.id))
      .filter((id): id is number => id != null);
    if (removedEndNodeIds.length > 0)
      void removeEndNodes(removedEndNodeIds);

    const shouldPersist = changes.some(change => change.type === "position" || change.type === "dimensions");
    setNodes((currentNodes) => {
      const nextNodes = applyNodeChanges(changes, currentNodes);
      if (shouldPersist)
        persistNodePositions(nextNodes);
      return nextNodes;
    });
  }, [persistNodePositions, removeEndNodes, setNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const removedEdges = changes.filter(change => change.type === "remove" && "id" in change) as Array<{ id: string; type: "remove" }>;
    if (removedEdges.length > 0) {
      const edgeMap = new Map(edgesRef.current.map(edge => [edge.id, edge]));
      const removedRoomEdgeIds: string[] = [];
      let nextStartRoomIds = [...startRoomIdsRef.current];
      let startChanged = false;
      let incomingChanged = false;
      const nextIncoming: Record<number, number[]> = { ...endNodeIncomingRoomIdsRef.current };

      removedEdges.forEach(({ id }) => {
        const edge = edgeMap.get(id);
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
            const edge = edgeMap.get(id);
            if (!edge)
              return;

            const sourceId = Number(edge.source);
            const targetId = Number(edge.target);
            if (Number.isNaN(sourceId) || Number.isNaN(targetId))
              return;

            const edgeCondition = resolveWorkflowRoomEdgeCondition(edge);
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

      if (startChanged || incomingChanged)
        void commitStartAndIncomingState(nextStartRoomIds, nextIncoming);
    }

    setEdges(currentEdges => applyEdgeChanges(changes, currentEdges));
  }, [applyRoomMapUpdate, commitStartAndIncomingState, edgesRef, endNodeIncomingRoomIdsRef, setEdges, startRoomIdsRef]);

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target)
      return;

    if (params.source === START_NODE_ID) {
      const nextStartTargetId = Number(params.target);
      if (Number.isNaN(nextStartTargetId))
        return;

      void commitStartAndIncomingState(
        [...startRoomIdsRef.current, nextStartTargetId],
        endNodeIncomingRoomIdsRef.current,
      );
      return;
    }

    if (isEndNodeId(params.target)) {
      const sourceRoomId = Number(params.source);
      const endNodeId = parseEndNodeId(params.target);
      if (!endNodeId || Number.isNaN(sourceRoomId))
        return;

      void commitStartAndIncomingState(
        startRoomIdsRef.current,
        {
          ...endNodeIncomingRoomIdsRef.current,
          [endNodeId]: [...(endNodeIncomingRoomIdsRef.current[endNodeId] ?? []), sourceRoomId],
        },
      );
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

    setEdges(currentEdges => addEdge(buildWorkflowRoomEdge(sourceId, targetId), currentEdges));
  }, [applyRoomMapUpdate, commitStartAndIncomingState, endNodeIncomingRoomIdsRef, setEdges, startRoomIdsRef]);

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnectEnd = useCallback((_: unknown, edge: Edge) => {
    if (!edgeReconnectSuccessful.current) {
      if (isStartEdge(edge)) {
        const removedTargetId = Number(edge.target);
        const nextStartRoomIds = Number.isNaN(removedTargetId)
          ? startRoomIdsRef.current
          : startRoomIdsRef.current.filter(roomId => roomId !== removedTargetId);
        void commitStartAndIncomingState(nextStartRoomIds, endNodeIncomingRoomIdsRef.current);
      }
      else if (isEndEdge(edge)) {
        const endNodeId = parseEndNodeId(edge.target);
        const sourceRoomId = Number(edge.source);
        if (endNodeId && Number.isFinite(sourceRoomId) && sourceRoomId > 0) {
          void commitStartAndIncomingState(
            startRoomIdsRef.current,
            {
              ...endNodeIncomingRoomIdsRef.current,
              [endNodeId]: (endNodeIncomingRoomIdsRef.current[endNodeId] ?? []).filter(id => id !== sourceRoomId),
            },
          );
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
          const currentCondition = resolveWorkflowRoomEdgeCondition(edge);
          const links = next[sourceId] ?? [];
          const filtered = links.filter(link => !(link.targetId === targetId && (link.condition ?? "").trim() === currentCondition));
          if (filtered.length > 0)
            next[sourceId] = filtered;
          else
            delete next[sourceId];
          return next;
        });
      }

      setEdges(currentEdges => currentEdges.filter(currentEdge => currentEdge.id !== edge.id));
    }

    edgeReconnectSuccessful.current = true;
  }, [applyRoomMapUpdate, commitStartAndIncomingState, endNodeIncomingRoomIdsRef, setEdges, startRoomIdsRef]);

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

      void commitStartAndIncomingState(
        startRoomIdsRef.current.filter(roomId => roomId !== oldTargetId).concat(newTargetId),
        endNodeIncomingRoomIdsRef.current,
      );
      setEdges(currentEdges => reconnectEdge(oldEdge, newConnection, currentEdges));
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
      nextIncoming[newEndNodeId] = [...(nextIncoming[newEndNodeId] ?? []), newSourceRoomId];

      void commitStartAndIncomingState(startRoomIdsRef.current, nextIncoming);
      setEdges(currentEdges => reconnectEdge(oldEdge, newConnection, currentEdges));
      edgeReconnectSuccessful.current = true;
      return;
    }

    const oldSourceId = Number(oldEdge.source);
    const oldTargetId = Number(oldEdge.target);
    const newSourceId = Number(newConnection.source);
    const newTargetId = Number(newConnection.target);
    if ([oldSourceId, oldTargetId, newSourceId, newTargetId].some(id => Number.isNaN(id)))
      return;

    const currentCondition = resolveWorkflowRoomEdgeCondition(oldEdge);
    applyRoomMapUpdate((current) => {
      const next = cloneRoomMap(current);
      const oldLinks = next[oldSourceId] ?? [];
      const remainingOld = oldLinks.filter(link => !(link.targetId === oldTargetId && (link.condition ?? "").trim() === currentCondition));
      if (remainingOld.length > 0)
        next[oldSourceId] = remainingOld;
      else
        delete next[oldSourceId];

      const newLinks = next[newSourceId] ?? [];
      const exists = newLinks.some(link => link.targetId === newTargetId && (link.condition ?? "").trim() === currentCondition);
      if (!exists) {
        next[newSourceId] = sortLinks([
          ...newLinks,
          currentCondition ? { targetId: newTargetId, condition: currentCondition } : { targetId: newTargetId },
        ]);
      }

      return next;
    });

    setEdges(currentEdges => reconnectEdge(oldEdge, newConnection, currentEdges));
    edgeReconnectSuccessful.current = true;
  }, [applyRoomMapUpdate, commitStartAndIncomingState, endNodeIncomingRoomIdsRef, setEdges, startRoomIdsRef]);

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

      const hasDuplicate = updated.some(link => link.targetId === targetId && (link.condition ?? "").trim() === normalizedNext);
      if (!hasDuplicate) {
        if (normalizedNext.length > 0)
          updated.push({ targetId, condition: normalizedNext });
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

  const onEdgeDoubleClick = useCallback((event: MouseEvent, edge: Edge) => {
    event.preventDefault();
    event.stopPropagation();
    if (isStartEdge(edge) || isEndEdge(edge))
      return;

    const sourceId = Number(edge.source);
    const targetId = Number(edge.target);
    if (Number.isNaN(sourceId) || Number.isNaN(targetId) || isConditionEditorOpen)
      return;

    const currentCondition = resolveWorkflowRoomEdgeCondition(edge);
    setIsConditionEditorOpen(true);

    toastWindow(
      onClose => (
        <WorkflowConditionEditor
          initialValue={currentCondition}
          onCancel={onClose}
          onConfirm={(nextValue) => {
            updateEdgeCondition(sourceId, targetId, currentCondition, nextValue);
            onClose();
          }}
        />
      ),
      {
        onclose: () => {
          setIsConditionEditorOpen(false);
        },
      },
    );
  }, [isConditionEditorOpen, updateEdgeCondition]);

  return {
    addEndNode,
    handleDeleteEndNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnectStart,
    onReconnectEnd,
    onEdgesReconnect,
    onEdgeDoubleClick,
    persistNodePositions,
  };
}
