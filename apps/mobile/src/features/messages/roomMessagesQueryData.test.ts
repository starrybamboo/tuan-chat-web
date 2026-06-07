import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { extractRoomMessagesFromQueryData, updateRoomMessagesQueryData } from "./roomMessagesQueryData";

function createMessage(messageId: number): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      extra: {},
      messageId,
      messageType: 1,
      position: messageId,
      roomId: 9,
      status: 0,
      syncId: messageId,
      userId: 7,
    },
  };
}

describe("roomMessagesQueryData", () => {
  it("can read room messages from either a raw array or a sync result object", () => {
    const messages = [createMessage(1), createMessage(2)];

    expect(extractRoomMessagesFromQueryData(messages)).toEqual(messages);
    expect(extractRoomMessagesFromQueryData({
      messages,
      mode: "full",
    })).toEqual(messages);
  });

  it("keeps raw arrays when updating messages", () => {
    const messages = [createMessage(1)];
    const next = createMessage(2);

    expect(updateRoomMessagesQueryData(messages, current => [...(current ?? []), next])).toEqual([
      ...messages,
      next,
    ]);
  });

  it("converts sync result updates to arrays after merging cache state", () => {
    const messages = [createMessage(1)];
    const next = createMessage(2);

    expect(updateRoomMessagesQueryData({
      messages,
      mode: "delta",
    }, current => [...(current ?? []), next])).toEqual([...messages, next]);
  });
});
