import { buildStateSyncMessageRequest } from "@/components/chat/room/drawers/stateSyncRequest";
import { compareMessagesByOrder } from "@/components/chat/shared/messageOrder";
import { buildCombatStateRuntime, buildStateSnapshotEvents } from "@/components/chat/state/stateRuntime";

import type { ChatMessageRequest, ChatMessageResponse, Message } from "../../../../api";

export type RoomStateInheritanceHistoryItem = ChatMessageResponse | Message;

function toMessage(item: RoomStateInheritanceHistoryItem): Message {
  if ("message" in item) {
    return item.message;
  }
  return item;
}

export function toStateRuntimeMessages(items: RoomStateInheritanceHistoryItem[]): Message[] {
  return items
    .map(toMessage)
    .sort(compareMessagesByOrder);
}

export function buildInheritedRoomStateSyncRequest(params: {
  sourceMessages: RoomStateInheritanceHistoryItem[];
  targetRoomId: number;
}): ChatMessageRequest | null {
  const runtime = buildCombatStateRuntime({
    messages: toStateRuntimeMessages(params.sourceMessages),
  });
  const events = buildStateSnapshotEvents(runtime);
  if (events.length === 0) {
    return null;
  }
  return buildStateSyncMessageRequest({
    events,
    targetRoomId: params.targetRoomId,
  });
}
