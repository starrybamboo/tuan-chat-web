import type { StateEventAtom } from "@/types/stateEvent";

import { buildCommandStateEventExtra, toApiMessageExtraWithStateEvent } from "@/types/stateEvent";

import type { ChatMessageRequest } from "../../../../../api";

import { MessageType } from "../../../../../api/wsModels";

export function buildStateSyncMessageRequest(params: {
  events: StateEventAtom[];
  targetRoomId: number;
}): ChatMessageRequest {
  if (params.targetRoomId <= 0) {
    throw new Error("目标房间无效");
  }
  if (params.events.length === 0) {
    throw new Error("没有可同步的状态");
  }

  return {
    roomId: params.targetRoomId,
    content: "状态同步快照",
    messageType: MessageType.STATE_EVENT,
    extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("stateSync", params.events)),
  };
}
