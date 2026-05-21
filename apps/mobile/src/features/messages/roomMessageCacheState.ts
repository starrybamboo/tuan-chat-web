import type { RoomMessagesSyncResult } from "./roomMessageSync";

export function shouldResetCachedRoomMessages(
  networkResult: RoomMessagesSyncResult | undefined,
  queryIsSuccess: boolean,
): boolean {
  return queryIsSuccess
    && networkResult?.mode === "full"
    && networkResult.messages.length === 0;
}
