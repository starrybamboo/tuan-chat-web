import type { Room } from "../../api";
import type { WorkflowGraph, WorkflowTransitionOption } from "./realtimeRendererWorkflow";

import { normalizeWorkflowRoomIds, sanitizeChooseOptionLabel } from "./realtimeRendererWorkflow";

type SceneNameResolver = (roomId: number) => string;

type WorkflowSceneOptions = {
  workflowGraph: WorkflowGraph;
  roomMap: Map<number, Room>;
  getSceneName: SceneNameResolver;
};

type StartSceneOptions = WorkflowSceneOptions & {
  rooms: Room[];
};

function getValidWorkflowStartRoomIds(workflowGraph: WorkflowGraph, roomMap: Map<number, Room>): number[] {
  return normalizeWorkflowRoomIds(
    workflowGraph.startRoomIds.filter(roomId => roomMap.has(roomId)),
  );
}

function buildRoomChoiceFallback(rooms: Room[], getSceneName: SceneNameResolver): string {
  const branchOptions = rooms
    .filter(room => room.roomId)
    .map((room) => {
      const roomId = Number(room.roomId);
      return `${room.name?.replace(/\n/g, "") || "房间"}:${getSceneName(roomId)}.txt`;
    })
    .join("|");
  return branchOptions
    ? `choose:${branchOptions};`
    : "changeBg:none;";
}

export function buildStartSceneContent({
  rooms,
  workflowGraph,
  roomMap,
  getSceneName,
}: StartSceneOptions): string {
  const startRoomIds = getValidWorkflowStartRoomIds(workflowGraph, roomMap);
  if (startRoomIds.length === 1) {
    return `changeScene:${getSceneName(startRoomIds[0])}.txt;`;
  }
  if (startRoomIds.length > 1) {
    const options = startRoomIds
      .map((roomId) => {
        const room = roomMap.get(roomId);
        const label = sanitizeChooseOptionLabel(room?.name?.trim() || `房间${roomId}`);
        if (!label) {
          return null;
        }
        return `${label}:${getSceneName(roomId)}.txt`;
      })
      .filter((option): option is string => Boolean(option));
    if (options.length > 0) {
      return `choose:${options.join("|")};`;
    }
  }
  return buildRoomChoiceFallback(rooms, getSceneName);
}

function buildWorkflowTransitionCommand(options: WorkflowTransitionOption[]): string | null {
  if (options.length === 0) {
    return null;
  }
  if (options.length === 1) {
    return `changeScene:${options[0].targetScene};`;
  }
  return `choose:${options.map(option => `${option.label}:${option.targetScene}`).join("|")};`;
}

function buildWorkflowRoomTransitionOptions(
  roomId: number,
  workflowGraph: WorkflowGraph,
  roomMap: Map<number, Room>,
  getSceneName: SceneNameResolver,
): WorkflowTransitionOption[] {
  const links = workflowGraph.links[roomId] ?? [];
  if (links.length === 0) {
    return [];
  }

  const options = links
    .map((link) => {
      if (!roomMap.has(link.targetId)) {
        return null;
      }
      const targetScene = `${getSceneName(link.targetId)}.txt`;
      const fallbackLabel = roomMap.get(link.targetId)?.name?.trim() || `房间${link.targetId}`;
      const rawLabel = link.condition?.trim() || fallbackLabel;
      const label = sanitizeChooseOptionLabel(rawLabel);
      if (!label) {
        return null;
      }
      return {
        label,
        targetScene,
      };
    })
    .filter((option): option is WorkflowTransitionOption => Boolean(option));
  return options;
}

function getWorkflowEndNodeIdsForRoom(workflowGraph: WorkflowGraph, roomId: number): number[] {
  return workflowGraph.endNodeIds.filter((endNodeId) => {
    const incomingRoomIds = workflowGraph.endNodeIncomingRoomIds[endNodeId] ?? [];
    return incomingRoomIds.includes(roomId);
  });
}

export function getWorkflowEndSceneName(endNodeId: number): string {
  return `__tc_end_${endNodeId}`;
}

function buildWorkflowEndOptionLabel(endNodeId: number, endOptionCount: number): string {
  const fallback = endOptionCount > 1 ? `结束${endNodeId}` : "结束";
  const normalized = sanitizeChooseOptionLabel(fallback);
  return normalized || `结束${endNodeId}`;
}

export function buildWorkflowTransitionLineWithEnd({
  roomId,
  workflowGraph,
  roomMap,
  getSceneName,
}: WorkflowSceneOptions & { roomId: number }): string | null {
  const roomOptions = buildWorkflowRoomTransitionOptions(roomId, workflowGraph, roomMap, getSceneName);
  const endNodeIds = getWorkflowEndNodeIdsForRoom(workflowGraph, roomId);
  const endOptions = endNodeIds
    .map((endNodeId) => {
      const label = buildWorkflowEndOptionLabel(endNodeId, endNodeIds.length);
      if (!label) {
        return null;
      }
      return {
        label,
        targetScene: `${getWorkflowEndSceneName(endNodeId)}.txt`,
      };
    })
    .filter((option): option is WorkflowTransitionOption => Boolean(option));

  return buildWorkflowTransitionCommand([...roomOptions, ...endOptions]);
}
