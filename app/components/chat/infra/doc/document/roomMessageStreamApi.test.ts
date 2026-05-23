import { afterEach, describe, expect, it, vi } from "vitest";

import type { Message } from "../../../../../../api";

import {
  getRemoteRoomMessageStream,
  patchRemoteRoomMessageStream,
} from "./roomMessageStreamApi";

const { getHistoryMessagesMock, patchRoomMessagesMock } = vi.hoisted(() => ({
  getHistoryMessagesMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  patchRoomMessagesMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("api/instance", () => ({
  tuanchat: {
    chatController: {
      getHistoryMessages: getHistoryMessagesMock,
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

  it("通过 history syncId=0 读取统一 room/message 列表响应", async () => {
    const earlier = createMessage({ messageId: 1, position: 1, syncId: 101 });
    const later = createMessage({ messageId: 2, position: 2, syncId: 100 });
    getHistoryMessagesMock.mockResolvedValueOnce({
      data: [
        { message: later },
        { message: earlier },
      ],
      success: true,
    });

    const messages = await getRemoteRoomMessageStream({ roomId: 10 });

    expect(getHistoryMessagesMock).toHaveBeenCalledWith({
      roomId: 10,
      syncId: 0,
    });
    expect(messages).toEqual([earlier, later]);
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
