import type { ChatMessageResponse } from "../../../../../api";

type LogMessageOrderChangeInput = {
  source: string;
  roomId: number | null;
  prevMessages: ChatMessageResponse[];
  nextMessages: ChatMessageResponse[];
  incomingMessageIds?: number[];
};

const PREVIEW_COUNT = 8;

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function formatTail(messages: ChatMessageResponse[]): string[] {
  return messages.slice(-PREVIEW_COUNT).map((item) => {
    const message = item?.message;
    const id = toFiniteNumber(message?.messageId) ?? "NA";
    const pos = toFiniteNumber(message?.position);
    const syncId = toFiniteNumber(message?.syncId);
    return `${id}@${pos !== undefined ? pos.toFixed(3) : "x"}#${syncId ?? "x"}`;
  });
}

function extractIds(messages: ChatMessageResponse[]): number[] {
  const result: number[] = [];
  for (const item of messages) {
    const id = toFiniteNumber(item?.message?.messageId);
    if (id !== undefined) {
      result.push(id);
    }
  }
  return result;
}

function findOrderDrift(prevIds: number[], nextIds: number[]): { messageId: number; nextIndex: number } | null {
  const nextIndexMap = new Map<number, number>();
  for (let index = 0; index < nextIds.length; index++) {
    nextIndexMap.set(nextIds[index], index);
  }

  let lastNextIndex = -1;
  for (const id of prevIds) {
    const nextIndex = nextIndexMap.get(id);
    if (nextIndex === undefined) {
      continue;
    }
    if (nextIndex < lastNextIndex) {
      return { messageId: id, nextIndex };
    }
    lastNextIndex = nextIndex;
  }
  return null;
}

export function logMessageOrderChange(input: LogMessageOrderChangeInput): void {
  const prevIds = extractIds(input.prevMessages);
  const nextIds = extractIds(input.nextMessages);
  const nextIdSet = new Set(nextIds);
  const prevCommon = prevIds.filter(id => nextIdSet.has(id));
  const prevIdSet = new Set(prevIds);
  const nextCommon = nextIds.filter(id => prevIdSet.has(id));
  const drift = findOrderDrift(prevCommon, nextCommon);

  console.log("[TC_MSG_ORDER]", {
    source: input.source,
    roomId: input.roomId,
    incomingMessageIds: input.incomingMessageIds ?? [],
    prevLength: prevIds.length,
    nextLength: nextIds.length,
    commonLength: prevCommon.length,
    reordered: drift != null,
    drift,
    prevTail: formatTail(input.prevMessages),
    nextTail: formatTail(input.nextMessages),
  });
}
