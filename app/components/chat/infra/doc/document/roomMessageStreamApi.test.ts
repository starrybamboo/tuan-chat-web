import { afterEach, describe, expect, it, vi } from "vitest";

import type { Message } from "../../../../../../api";

import { patchRemoteRoomMessageStream } from "./roomMessageStreamApi";

const { patchRoomMessagesMock } = vi.hoisted(() => ({
  patchRoomMessagesMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("api/instance", () => ({
  tuanchat: {
    chatController: {
      patchRoomMessages: patchRoomMessagesMock,
    },
  },
}));

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    content: "hello",
    messageId: 1,
    messageType: 1,
    position: 1,
    roomId: 10,
    status: 0,
    syncId: 100,
    userId: 20,
    ...overrides,
  };
}

describe("roomMessageStreamApi", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("patch 走统一聊天室复合 patch 并返回 changed messages", async () => {
    const changed = createMessage({ content: "saved", messageId: 2, syncId: 101 });
    patchRoomMessagesMock.mockResolvedValueOnce({
      data: [changed],
      success: true,
    });

    const messages = await patchRemoteRoomMessageStream({
      operations: [
        {
          clientId: "block_1",
          message: {
            content: "saved",
            customRoleName: "  Alice  ",
            messageType: 1,
            position: 2,
          },
          op: "insert",
          position: 2,
        },
      ],
      roomId: 10,
    });

    expect(patchRoomMessagesMock).toHaveBeenCalledWith(10, {
      operations: [
        {
          clientId: "block_1",
          message: {
            content: "saved",
            customRoleName: "Alice",
            messageType: 1,
            position: 2,
          },
          op: "insert",
          position: 2,
        },
      ],
    });
    expect(messages).toEqual([changed]);
  });

  it("没有有效内容操作时不请求远端", async () => {
    const messages = await patchRemoteRoomMessageStream({
      operations: [
        {
          message: null as never,
          op: "insert",
        },
      ],
      roomId: 10,
    });

    expect(messages).toEqual([]);
    expect(patchRoomMessagesMock).not.toHaveBeenCalled();
  });
});
