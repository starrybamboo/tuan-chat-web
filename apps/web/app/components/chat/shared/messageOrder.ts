import { compareMessagesByOrder as compareSharedMessagesByOrder } from "@tuanchat/query/room-message";
import { getNextAppendPosition as getSharedNextAppendPosition } from "@tuanchat/query/room-message-lifecycle";

import type { ChatMessageResponse, Message } from "../../../../api";

export function compareChatMessageResponsesByOrder(left: ChatMessageResponse, right: ChatMessageResponse): number {
  return compareSharedMessagesByOrder(left.message, right.message);
}

export function compareMessagesByOrder(left: Message, right: Message): number {
  return compareSharedMessagesByOrder(left, right);
}

export function getNextAppendPosition(messages: ChatMessageResponse[]): number {
  return getSharedNextAppendPosition(messages);
}
