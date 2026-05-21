import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

function createMessageSnapshot(message: Message): ChatMessageResponse {
  return { message };
}

/**
 * 从 query、缓存或调用方持有的原消息中解析可回滚的消息快照。
 */
export function resolveRoomMessageSnapshots({
  cachedMessages,
  fallbackMessages,
  messageIds,
  queryMessages,
}: {
  cachedMessages?: readonly ChatMessageResponse[];
  fallbackMessages?: readonly Message[];
  messageIds: readonly number[];
  queryMessages?: readonly ChatMessageResponse[];
}): ChatMessageResponse[] {
  const targetIds = new Set(
    messageIds.filter(messageId => Number.isInteger(messageId) && messageId > 0),
  );
  const snapshots = new Map<number, ChatMessageResponse>();

  const addSnapshot = (snapshot: ChatMessageResponse | null | undefined) => {
    const messageId = snapshot?.message?.messageId;
    if (typeof messageId !== "number" || !targetIds.has(messageId) || snapshots.has(messageId)) {
      return;
    }
    snapshots.set(messageId, snapshot);
  };

  queryMessages?.forEach(addSnapshot);
  fallbackMessages?.forEach(message => addSnapshot(createMessageSnapshot(message)));
  cachedMessages?.forEach(addSnapshot);

  return messageIds
    .map(messageId => snapshots.get(messageId))
    .filter((snapshot): snapshot is ChatMessageResponse => snapshot != null);
}
