import type { Message } from "@tuanchat/openapi-client/models/Message";

import { describe, expect, it } from "vitest";

import { buildEditedRoomMessage } from "./roomMessageEditPayload";

function createMessage(): Message {
  return {
    avatarId: 1,
    content: "old content",
    createTime: "2026-05-21 15:20:00",
    messageId: 101,
    messageType: 1,
    position: 1,
    roomId: 7,
    status: 0,
    syncId: 101,
    updateTime: "2026-05-21 15:20:05",
    userId: 42,
  };
}

describe("roomMessageEditPayload", () => {
  it("keeps the original updateTime instead of injecting a client ISO timestamp", () => {
    const originalMessage = createMessage();

    const result = buildEditedRoomMessage(originalMessage, "new content");

    expect(result.content).toBe("new content");
    expect(result.updateTime).toBe("2026-05-21 15:20:05");
  });
});
