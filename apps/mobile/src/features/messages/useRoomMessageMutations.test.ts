import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import { resolveRoomMessageSnapshots } from "./roomMessageMutationSnapshots";

function createMessage(messageId: number, content: string): Message {
  return {
    avatarId: 1,
    content,
    createTime: "2026-05-21T00:00:00.000Z",
    messageId,
    messageType: 1,
    position: messageId,
    roomId: 7,
    status: 0,
    syncId: messageId,
    updateTime: "2026-05-21T00:00:00.000Z",
    userId: 42,
  };
}

function createSnapshot(messageId: number, content: string): ChatMessageResponse {
  return {
    message: createMessage(messageId, content),
  };
}

describe("useRoomMessageMutations snapshot resolution", () => {
  it("falls back to the caller-held original message when query data does not contain the target", () => {
    const originalMessage = createMessage(101, "cached only");

    const snapshots = resolveRoomMessageSnapshots({
      fallbackMessages: [originalMessage],
      messageIds: [101],
      queryMessages: [],
    });

    expect(snapshots).toEqual([{ message: originalMessage }]);
  });

  it("falls back to cached room messages when query data misses the target", () => {
    const snapshots = resolveRoomMessageSnapshots({
      cachedMessages: [createSnapshot(202, "from sqlite cache")],
      messageIds: [202],
      queryMessages: [],
    });

    expect(snapshots).toEqual([createSnapshot(202, "from sqlite cache")]);
  });

  it("prefers query snapshots over fallback sources for the same message", () => {
    const snapshots = resolveRoomMessageSnapshots({
      cachedMessages: [createSnapshot(303, "cached")],
      fallbackMessages: [createMessage(303, "original")],
      messageIds: [303],
      queryMessages: [createSnapshot(303, "query")],
    });

    expect(snapshots).toEqual([createSnapshot(303, "query")]);
  });
});
