type RoomMessageTimingDetails = Record<string, boolean | null | number | string | undefined>;

const ROOM_MESSAGE_TIMING_TRACE_ENABLED
  = process.env.EXPO_PUBLIC_CHAT_TIMING_TRACE === "1";

export function traceRoomMessageTiming(
  event: string,
  details: RoomMessageTimingDetails = {},
) {
  if (!ROOM_MESSAGE_TIMING_TRACE_ENABLED) {
    return;
  }

  console.warn(`[room-message-timing] ${JSON.stringify({
    event,
    timestamp: Date.now(),
    ...details,
  })}`);
}
