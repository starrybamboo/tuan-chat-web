import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

export type RoomMessagesQueryData =
  | ChatMessageResponse[]
  | {
      data?: ChatMessageResponse[] | {
        list?: ChatMessageResponse[];
      };
    }
  | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isMessage(value: unknown): value is Message {
  return isRecord(value)
    && typeof value.messageId === "number"
    && typeof value.roomId === "number"
    && typeof value.content === "string";
}

function isChatMessageResponse(value: unknown): value is ChatMessageResponse {
  return isRecord(value) && isMessage(value.message);
}

function extractRoomMessages(value: unknown): ChatMessageResponse[] {
  const rawList = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.data)
      ? value.data
      : isRecord(value) && isRecord(value.data) && Array.isArray(value.data.list)
        ? value.data.list
        : [];

  return rawList.flatMap((item): ChatMessageResponse[] => {
    if (isChatMessageResponse(item)) {
      return [{ message: item.message }];
    }
    if (isMessage(item)) {
      return [{ message: item }];
    }
    return [];
  });
}

export function updateRoomMessagesQueryData(
  currentData: RoomMessagesQueryData,
  updater: (messages: ChatMessageResponse[]) => ChatMessageResponse[],
): RoomMessagesQueryData {
  if (Array.isArray(currentData)) {
    return updater(extractRoomMessages(currentData));
  }
  if (isRecord(currentData) && Array.isArray(currentData.data)) {
    return {
      ...currentData,
      data: updater(extractRoomMessages(currentData.data)),
    };
  }
  if (isRecord(currentData) && isRecord(currentData.data) && Array.isArray(currentData.data.list)) {
    return {
      ...currentData,
      data: {
        ...currentData.data,
        list: updater(extractRoomMessages(currentData.data.list)),
      },
    };
  }
  return currentData;
}
