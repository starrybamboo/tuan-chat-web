import type { Node } from "@xyflow/react";

import dagre from "dagre";

import type { RoomMap } from "@/components/chat/window/workflowGraphUtils";

const WORKFLOW_NODE_WIDTH = 200;
const WORKFLOW_NODE_HEIGHT = 120;
const INITIAL_ROOM_NODE_HEIGHT = 100;
const WORKFLOW_NODE_OFFSET_X = WORKFLOW_NODE_WIDTH / 2;
const WORKFLOW_NODE_OFFSET_Y = WORKFLOW_NODE_HEIGHT / 2;

function createWorkflowGraph() {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });
  return graph;
}

type WorkflowGraph = ReturnType<typeof createWorkflowGraph>;

function applyRoomMapEdges(graph: WorkflowGraph, roomMap: RoomMap) {
  Object.entries(roomMap).forEach(([source, targets]) => {
    targets.forEach((link) => {
      graph.setEdge(String(source), String(link.targetId));
    });
  });
}

export function computePositionForNewWorkflowNode(
  nodeId: string,
  baseNodes: Node[],
  currentRoomMap: RoomMap,
): { x: number; y: number } {
  const graph = createWorkflowGraph();

  baseNodes.forEach((node) => {
    graph.setNode(node.id, { width: WORKFLOW_NODE_WIDTH, height: WORKFLOW_NODE_HEIGHT });
  });
  graph.setNode(nodeId, { width: WORKFLOW_NODE_WIDTH, height: WORKFLOW_NODE_HEIGHT });
  applyRoomMapEdges(graph, currentRoomMap);

  try {
    dagre.layout(graph);
    const pos = graph.node(nodeId);
    if (pos)
      return { x: pos.x - WORKFLOW_NODE_OFFSET_X, y: pos.y - WORKFLOW_NODE_OFFSET_Y };
  }
  catch {
    // fallback below
  }

  if (baseNodes.length > 0) {
    const xs = baseNodes.map(n => n.position.x);
    const ys = baseNodes.map(n => n.position.y);
    const maxX = Math.max(...xs);
    const avgY = ys.reduce((acc, val) => acc + val, 0) / ys.length;
    return { x: maxX + WORKFLOW_NODE_WIDTH + 60, y: avgY };
  }

  return { x: 0, y: 0 };
}

export function computeInitialRoomNodePositions(
  roomIds: number[],
  roomMap: RoomMap,
): Map<number, { x: number; y: number }> {
  const graph = createWorkflowGraph();

  roomIds.forEach((roomId) => {
    graph.setNode(roomId.toString(), { width: WORKFLOW_NODE_WIDTH, height: INITIAL_ROOM_NODE_HEIGHT });
  });
  applyRoomMapEdges(graph, roomMap);
  dagre.layout(graph);

  const positions = new Map<number, { x: number; y: number }>();
  roomIds.forEach((roomId) => {
    const position = graph.node(roomId.toString());
    if (position) {
      positions.set(roomId, {
        x: position.x - WORKFLOW_NODE_OFFSET_X,
        y: position.y - WORKFLOW_NODE_OFFSET_Y,
      });
    }
  });
  return positions;
}
