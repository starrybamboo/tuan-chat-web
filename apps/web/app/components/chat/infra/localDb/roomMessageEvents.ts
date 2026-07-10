import type { ChatMessageResponse } from "../../../../../api";

export const ROOM_MESSAGES_RECEIVED_EVENT = "tc:room-messages-received";

export type RoomMessagesReceivedEventDetail = {
  roomId: number;
  messages: ChatMessageResponse[];
};

export function emitRoomMessagesReceived(roomId: number, messages: ChatMessageResponse[]): void {
  if (typeof window === "undefined" || !Number.isFinite(roomId) || roomId <= 0 || messages.length === 0) {
    return;
  }
  window.dispatchEvent(new CustomEvent<RoomMessagesReceivedEventDetail>(ROOM_MESSAGES_RECEIVED_EVENT, {
    detail: { roomId, messages },
  }));
}

export function isRoomMessagesReceivedEvent(event: Event): event is CustomEvent<RoomMessagesReceivedEventDetail> {
  return event.type === ROOM_MESSAGES_RECEIVED_EVENT
    && "detail" in event
    && typeof (event as CustomEvent<RoomMessagesReceivedEventDetail>).detail?.roomId === "number"
    && Array.isArray((event as CustomEvent<RoomMessagesReceivedEventDetail>).detail?.messages);
}
