import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import { compareMessagesByOrder } from "@tuanchat/query/room-message";

function readFinitePosition(message: Message | undefined): number | null {
  return typeof message?.position === "number" && Number.isFinite(message.position)
    ? message.position
    : null;
}

export function resolveMovedRoomMessagePosition(params: {
  movingMessage: Message;
  messages: readonly ChatMessageResponse[];
  placement?: "after" | "before";
  targetMessage: Message;
}): number {
  const orderedMessages = params.messages
    .map(item => item.message)
    .filter(message => message.messageId !== params.movingMessage.messageId)
    .sort(compareMessagesByOrder);
  const targetIndex = orderedMessages.findIndex(message => message.messageId === params.targetMessage.messageId);
  if (targetIndex < 0) {
    throw new Error("找不到目标消息。");
  }

  const targetPosition = readFinitePosition(orderedMessages[targetIndex]) ?? targetIndex;
  if (params.placement === "before") {
    const previousPosition = readFinitePosition(orderedMessages[targetIndex - 1]) ?? targetPosition - 2;
    return (previousPosition + targetPosition) / 2;
  }

  const nextPosition = readFinitePosition(orderedMessages[targetIndex + 1]) ?? targetPosition + 2;
  return (targetPosition + nextPosition) / 2;
}
