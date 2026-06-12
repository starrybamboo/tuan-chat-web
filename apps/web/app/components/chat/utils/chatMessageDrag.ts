const CHAT_MESSAGE_DRAG_MIME = "application/x-tc-chat-message-drag";

export type ChatMessageDragPayload = {
  kind: "chat-message";
  sourceRoomId: number;
  messageIds: number[];
  anchorMessageId: number;
  effect: "move";
};

function toPositiveInteger(value: unknown): number | null {
  const numberValue = typeof value === "number"
    ? value
    : (typeof value === "string" && value.trim() ? Number(value) : Number.NaN);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return null;
  }
  return numberValue;
}

function normalizePayload(raw: unknown): ChatMessageDragPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = raw as Partial<ChatMessageDragPayload>;
  if (payload.kind !== "chat-message" || payload.effect !== "move") {
    return null;
  }

  const sourceRoomId = toPositiveInteger(payload.sourceRoomId);
  const anchorMessageId = toPositiveInteger(payload.anchorMessageId);
  if (!sourceRoomId || !anchorMessageId || !Array.isArray(payload.messageIds)) {
    return null;
  }

  const seenMessageIds = new Set<number>();
  const messageIds: number[] = [];
  for (const rawMessageId of payload.messageIds) {
    const messageId = toPositiveInteger(rawMessageId);
    if (!messageId) {
      return null;
    }
    if (!seenMessageIds.has(messageId)) {
      seenMessageIds.add(messageId);
      messageIds.push(messageId);
    }
  }

  if (messageIds.length === 0) {
    return null;
  }

  return {
    kind: "chat-message",
    sourceRoomId,
    messageIds,
    anchorMessageId,
    effect: "move",
  };
}

export function setChatMessageDragData(dataTransfer: DataTransfer, payload: ChatMessageDragPayload): void {
  const normalizedPayload = normalizePayload(payload);
  if (!normalizedPayload) {
    return;
  }

  try {
    dataTransfer.setData(CHAT_MESSAGE_DRAG_MIME, JSON.stringify(normalizedPayload));
  }
  catch {
    // ignore
  }
}

export function getChatMessageDragData(
  dataTransfer: DataTransfer | null | undefined,
): ChatMessageDragPayload | null {
  if (!dataTransfer) {
    return null;
  }

  try {
    const raw = dataTransfer.getData(CHAT_MESSAGE_DRAG_MIME);
    if (!raw) {
      return null;
    }
    return normalizePayload(JSON.parse(raw));
  }
  catch {
    return null;
  }
}

export function isChatMessageDrag(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) {
    return false;
  }

  try {
    const types = Array.from(dataTransfer.types || []);
    if (types.includes(CHAT_MESSAGE_DRAG_MIME)) {
      return true;
    }
    return Boolean(getChatMessageDragData(dataTransfer));
  }
  catch {
    return false;
  }
}
