import type { Edge } from "@xyflow/react";

import { MarkerType } from "@xyflow/react";

const ROOM_EDGE_COLOR = "#333";

export function resolveWorkflowRoomEdgeCondition(edge: Edge): string {
  const edgeData = (edge.data ?? {}) as { condition?: string };
  return (edgeData.condition ?? (typeof edge.label === "string" ? edge.label : "")).trim();
}

export function buildWorkflowRoomEdge(
  sourceId: number,
  targetId: number,
  condition = "",
  edgeIndex = 0,
): Edge {
  const normalizedCondition = condition.trim();
  const conditionKey = normalizedCondition.length > 0 ? encodeURIComponent(normalizedCondition) : "plain";
  return {
    id: `e${sourceId}-${targetId}-${conditionKey}-${edgeIndex}`,
    source: String(sourceId),
    target: String(targetId),
    type: "smoothstep",
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: ROOM_EDGE_COLOR,
    },
    style: {
      strokeWidth: 2,
    },
    label: normalizedCondition || undefined,
    labelStyle: normalizedCondition ? { fill: ROOM_EDGE_COLOR, fontWeight: 500, fontSize: 12 } : undefined,
    labelBgPadding: normalizedCondition ? [6, 4] : undefined,
    labelBgBorderRadius: normalizedCondition ? 4 : undefined,
    labelShowBg: normalizedCondition ? true : undefined,
    labelBgStyle: normalizedCondition ? { fill: "rgba(255,255,255,0.9)", stroke: "#999" } : undefined,
    data: {
      condition: normalizedCondition,
      edgeKind: "room",
    },
  };
}
