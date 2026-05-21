import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

export function shouldResetCachedRoomMessages(
  networkMessages: readonly ChatMessageResponse[],
  queryIsSuccess: boolean,
): boolean {
  return queryIsSuccess && networkMessages.length === 0;
}
