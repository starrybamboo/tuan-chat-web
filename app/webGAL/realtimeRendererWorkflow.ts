const WORKFLOW_START_KEY = "start";
const WORKFLOW_END_NODE_VALUE_PREFIX = "end:";
const WORKFLOW_END_NODE_LIST_KEY = "endNodes";
const WORKFLOW_END_NODE_LINK_KEY_PREFIX = "endNode:";

export type WorkflowLink = {
  targetId: number;
  condition?: string;
};

export type WorkflowTransitionOption = {
  label: string;
  targetScene: string;
};

export type WorkflowGraph = {
  startRoomIds: number[];
  links: Record<number, WorkflowLink[]>;
  endNodeIds: number[];
  endNodeIncomingRoomIds: Record<number, number[]>;
};

export function normalizeWorkflowRoomIds(ids: number[]): number[] {
  return Array.from(new Set(
    ids.filter(id => Number.isFinite(id) && id > 0),
  )).sort((a, b) => a - b);
}

function parseWorkflowLink(raw: unknown): WorkflowLink | null {
  if (raw == null) {
    return null;
  }
  const value = typeof raw === "number" ? String(raw) : String(raw ?? "").trim();
  if (!value) {
    return null;
  }

  let splitIndex = 0;
  while (splitIndex < value.length) {
    const charCode = value.charCodeAt(splitIndex);
    if (charCode < 48 || charCode > 57) {
      break;
    }
    splitIndex += 1;
  }
  if (splitIndex === 0) {
    return null;
  }
  const targetId = Number(value.slice(0, splitIndex));
  if (!Number.isFinite(targetId) || targetId <= 0) {
    return null;
  }
  const condition = value.slice(splitIndex).trim() || undefined;
  return {
    targetId,
    condition,
  };
}

function parseWorkflowEndNodeId(raw: unknown): number | null {
  const value = String(raw ?? "").trim();
  if (!value) {
    return null;
  }
  const normalized = value.startsWith(WORKFLOW_END_NODE_VALUE_PREFIX)
    ? value.slice(WORKFLOW_END_NODE_VALUE_PREFIX.length)
    : value;
  const id = Number(normalized);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

export function parseWorkflowRoomMap(roomMap?: Record<string, Array<string>>): WorkflowGraph {
  const result: WorkflowGraph = {
    startRoomIds: [],
    links: {},
    endNodeIds: [],
    endNodeIncomingRoomIds: {},
  };
  if (!roomMap) {
    return result;
  }

  const parsedEndNodeIds: number[] = [];
  const parsedEndNodeIncomingRoomIds: Record<number, number[]> = {};

  Object.entries(roomMap).forEach(([key, value]) => {
    if (key === WORKFLOW_START_KEY) {
      result.startRoomIds = normalizeWorkflowRoomIds(
        (Array.isArray(value) ? value : [])
          .map((entry) => {
            if (typeof entry === "number") {
              return entry;
            }
            return Number(String(entry ?? "").trim());
          })
          .filter(id => Number.isFinite(id) && id > 0),
      );
      return;
    }
    if (key === WORKFLOW_END_NODE_LIST_KEY) {
      const ids = (Array.isArray(value) ? value : [])
        .map(entry => parseWorkflowEndNodeId(entry))
        .filter((id): id is number => id != null);
      parsedEndNodeIds.push(...ids);
      return;
    }
    if (key.startsWith(WORKFLOW_END_NODE_LINK_KEY_PREFIX)) {
      const endNodeId = Number(key.slice(WORKFLOW_END_NODE_LINK_KEY_PREFIX.length));
      if (!Number.isFinite(endNodeId) || endNodeId <= 0) {
        return;
      }
      const incomingRoomIds = normalizeWorkflowRoomIds(
        (Array.isArray(value) ? value : [])
          .map((entry) => {
            if (typeof entry === "number") {
              return entry;
            }
            return Number(String(entry ?? "").trim());
          })
          .filter(id => Number.isFinite(id) && id > 0),
      );
      parsedEndNodeIncomingRoomIds[endNodeId] = incomingRoomIds;
      return;
    }

    const sourceRoomId = Number(key);
    if (!Number.isFinite(sourceRoomId) || sourceRoomId <= 0) {
      return;
    }

    const dedupeMap = new Map<string, WorkflowLink>();
    const rawTargets = Array.isArray(value) ? value : [];
    rawTargets.forEach((entry) => {
      const link = parseWorkflowLink(entry);
      if (!link) {
        return;
      }
      const dedupeKey = `${link.targetId}|${link.condition ?? ""}`;
      if (!dedupeMap.has(dedupeKey)) {
        dedupeMap.set(dedupeKey, link);
      }
    });
    const parsedLinks = Array.from(dedupeMap.values()).sort((a, b) => {
      if (a.targetId !== b.targetId) {
        return a.targetId - b.targetId;
      }
      return (a.condition ?? "").localeCompare(b.condition ?? "");
    });
    if (parsedLinks.length > 0) {
      result.links[sourceRoomId] = parsedLinks;
    }
  });

  const normalizedEndNodeIds = normalizeWorkflowRoomIds([
    ...parsedEndNodeIds,
    ...Object.keys(parsedEndNodeIncomingRoomIds)
      .map(id => Number(id))
      .filter(id => Number.isFinite(id) && id > 0),
  ]);
  const normalizedIncoming: Record<number, number[]> = {};
  normalizedEndNodeIds.forEach((endNodeId) => {
    normalizedIncoming[endNodeId] = normalizeWorkflowRoomIds(parsedEndNodeIncomingRoomIds[endNodeId] ?? []);
  });
  result.endNodeIds = normalizedEndNodeIds;
  result.endNodeIncomingRoomIds = normalizedIncoming;

  return result;
}

export function sanitizeChooseOptionLabel(rawLabel: string): string {
  return String(rawLabel ?? "")
    .replace(/[\r\n|:;]/g, " ")
    .trim();
}

export function splitDiceContentToSteps(content: string): string[] {
  const normalized = String(content ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized
    .split("\n")
    .flatMap(line => line.split(/(?<!\\)\|/))
    .map(line => line.trim())
    .filter(line => line.length > 0);
}
