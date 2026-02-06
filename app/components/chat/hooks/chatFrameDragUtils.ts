import type { ChatMessageResponse, Message } from "../../../../api";

type ComputeMoveMessageUpdatesParams = {
  historyMessages: ChatMessageResponse[];
  targetIndex: number;
  messageIds: number[];
  isMessageMovable?: (message: Message) => boolean;
};

type ComputeMoveMessageUpdatesResult = {
  updatedMessages: Message[];
  hasUnmovable: boolean;
};

export function computeMoveMessageUpdates({
  historyMessages,
  targetIndex,
  messageIds,
  isMessageMovable,
}: ComputeMoveMessageUpdatesParams): ComputeMoveMessageUpdatesResult {
  if (!Array.isArray(historyMessages) || historyMessages.length === 0) {
    return {
      updatedMessages: [],
      hasUnmovable: messageIds.length > 0,
    };
  }

  const movableMessageIds = isMessageMovable
    ? messageIds.filter((id) => {
        const msg = historyMessages.find(m => m.message.messageId === id)?.message;
        return msg ? isMessageMovable(msg) : false;
      })
    : messageIds;

  const hasUnmovable = movableMessageIds.length !== messageIds.length;
  if (movableMessageIds.length === 0) {
    return {
      updatedMessages: [],
      hasUnmovable,
    };
  }

  const messageIdSet = new Set(movableMessageIds);
  const selectedMessages = Array.from(movableMessageIds)
    .map(id => historyMessages.find(m => m.message.messageId === id)?.message)
    .filter((msg): msg is Message => msg !== undefined)
    .sort((a, b) => a.position - b.position);

  if (selectedMessages.length === 0) {
    return {
      updatedMessages: [],
      hasUnmovable,
    };
  }

  let topMessageIndex: number = targetIndex;
  let bottomMessageIndex: number = targetIndex + 1;
  while (messageIdSet.has(historyMessages[topMessageIndex]?.message.messageId)) {
    topMessageIndex--;
  }
  while (messageIdSet.has(historyMessages[bottomMessageIndex]?.message.messageId)) {
    bottomMessageIndex++;
  }
  const topMessagePosition = historyMessages[topMessageIndex]?.message.position
    ?? historyMessages[0].message.position - 1;
  const bottomMessagePosition = historyMessages[bottomMessageIndex]?.message.position
    ?? historyMessages[historyMessages.length - 1].message.position + 1;

  const step = (bottomMessagePosition - topMessagePosition) / (selectedMessages.length + 1);
  const updatedMessages = selectedMessages.map((selectedMessage, index) => {
    const nextPosition = step * (index + 1) + topMessagePosition;
    return {
      ...selectedMessage,
      position: nextPosition,
    };
  });

  return {
    updatedMessages,
    hasUnmovable,
  };
}
