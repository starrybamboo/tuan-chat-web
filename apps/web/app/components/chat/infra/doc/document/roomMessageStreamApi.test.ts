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

    expect(patchRoomMessagesMock).toHaveBeenCalledWith({
      mutationMeta: {
        operationCause: "normal",
        sourceSurface: "doc_view",
      },
      roomId: 10,
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

  it("显式传入 mutationMeta 时会透传到统一 patch 请求", async () => {
    patchRoomMessagesMock.mockResolvedValueOnce({
      data: [createMessage({ content: "saved", messageId: 2, syncId: 101 })],
      success: true,
    });

    await patchRemoteRoomMessageStream({
      mutationMeta: {
        operationCause: "normal",
        sourceSurface: "doc_view",
      },
      operations: [
        {
          message: {
            content: "saved",
            messageType: 1,
          },
          op: "insert",
        },
      ],
      roomId: 10,
    });

    expect(patchRoomMessagesMock).toHaveBeenCalledWith(expect.objectContaining({
      mutationMeta: {
        operationCause: "normal",
        sourceSurface: "doc_view",
      },
    }));
  });

  it("未传 mutationMeta 时使用文档视图默认来源", async () => {
    patchRoomMessagesMock.mockResolvedValueOnce({
      data: [createMessage({ content: "saved", messageId: 2, syncId: 101 })],
      success: true,
    });

    await patchRemoteRoomMessageStream({
      operations: [
        {
          message: {
            content: "saved",
            messageType: 1,
          },
          op: "insert",
        },
      ],
      roomId: 10,
    });

    const [firstCall] = patchRoomMessagesMock.mock.calls;
    expect((firstCall?.[0] as any)?.mutationMeta).toEqual({
      operationCause: "normal",
      sourceSurface: "doc_view",
    });
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

  it("远端业务失败时不把 patch 当作成功响应读取", async () => {
    patchRoomMessagesMock.mockRejectedValueOnce(new Error("批量变更无权限"));

    await expect(patchRemoteRoomMessageStream({
      operations: [
        {
          message: {
            content: "saved",
            messageType: 1,
            position: 2,
          },
          op: "insert",
          position: 2,
        },
      ],
      roomId: 10,
    })).rejects.toThrow("批量变更无权限");
  });
});
