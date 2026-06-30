import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { getNextAppendPosition } from "@tuanchat/query/room-message-lifecycle";

function hasFinitePosition(position: unknown): position is number {
  return typeof position === "number" && Number.isFinite(position);
}

// 稳定 position 必须随请求提交，否则服务端会回退 syncId，导致本地历史和新发消息分成两段时间线。
export function withStableRoomMessagePosition(
  request: ChatMessageRequest,
  currentMessages: readonly ChatMessageResponse[],
): ChatMessageRequest {
  if (hasFinitePosition(request.position)) {
    return request;
  }

  return {
    ...request,
    position: getNextAppendPosition(currentMessages),
  };
}

export function withStableRoomMessagePositions(
  requests: readonly ChatMessageRequest[],
  currentMessages: readonly ChatMessageResponse[],
): ChatMessageRequest[] {
  let nextPosition = getNextAppendPosition(currentMessages);

  return requests.map((request) => {
    if (hasFinitePosition(request.position)) {
      nextPosition = Math.max(nextPosition, request.position + 1);
      return request;
    }

    const requestWithPosition = {
      ...request,
      position: nextPosition,
    };
    nextPosition += 1;
    return requestWithPosition;
  });
}
