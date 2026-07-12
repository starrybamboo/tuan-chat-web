import { describe, expect, it, vi } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageRequest, ChatMessageResponse, Message } from "../../../../api";

import useChatFrameMessageActions from "./useChatFrameMessageActions";

const mocks = vi.hoisted(() => {
  const toastMock = vi.fn<(...args: any[]) => any>();
  return {
    toastMock,
    toastErrorMock: vi.fn<(...args: any[]) => any>(),
    toastSuccessMock: vi.fn<(...args: any[]) => any>(),
  };
});

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    default: actual,
    useCallback: <T extends (...args: any[]) => any>(fn: T) => fn,
  };
});

vi.mock("@/components/common/appToast/appToast", () => ({
  appToast: {
    error: mocks.toastErrorMock,
    info: mocks.toastMock,
    success: mocks.toastSuccessMock,
  },
}));

function createMessage(messageId: number, overrides?: Partial<Message>): ChatMessageResponse {
  return {
    message: {
      messageId,
      syncId: messageId,
      roomId: 1,
      userId: 2,
      roleId: 3,
      avatarId: 4,
      content: `消息 ${messageId}`,
      status: 0,
      messageType: MESSAGE_TYPE.TEXT,
      position: messageId,
      createTime: "2026-05-22 10:00:00",
      updateTime: "2026-05-22 10:00:00",
      extra: {},
      ...overrides,
    },
  } as ChatMessageResponse;
}

function useTestHook(overrides?: Partial<Parameters<typeof useChatFrameMessageActions>[0]>) {
  return useChatFrameMessageActions({
    historyMessages: [
      createMessage(1, { position: 2 }),
      createMessage(2, { position: 1 }),
    ],
    selectedMessageIds: new Set([1, 2]),
    curRoleId: 30,
    curAvatarId: 40,
    send: vi.fn(),
    insertMessages: vi.fn(async () => ({ success: true, data: [] })),
    updateMessage: vi.fn(),
    setIsForwardWindowOpen: vi.fn(),
    clearSelection: vi.fn(),
    ...overrides,
  });
}

describe("useChatFrameMessageActions", () => {
  it("合并转发到多个房间时会去重并在最后统一收尾", async () => {
    const send = vi.fn();
    const setIsForwardWindowOpen = vi.fn();
    const clearSelection = vi.fn();
    const hook = useTestHook({
      send,
      setIsForwardWindowOpen,
      clearSelection,
    });

    const success = await hook.handleForwardToRooms([10, -1, 10, 11], "merged");

    expect(success).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map(([request]) => request.roomId)).toEqual([10, 11]);
    expect(send.mock.calls.map(([request]) => request.messageType)).toEqual([
      MESSAGE_TYPE.FORWARD,
      MESSAGE_TYPE.FORWARD,
    ]);
    expect(setIsForwardWindowOpen).toHaveBeenCalledOnce();
    expect(setIsForwardWindowOpen).toHaveBeenCalledWith(false);
    expect(clearSelection).toHaveBeenCalledOnce();
    expect(mocks.toastMock).not.toHaveBeenCalled();
    expect(mocks.toastSuccessMock).toHaveBeenCalledWith("已转发到 2 个房间");
  });

  it("逐条转发到多个房间时每个目标都会提交同一批已选消息", async () => {
    const insertMessages = vi.fn(async (requests: ChatMessageRequest[]) => ({
      success: true,
      data: requests.map((request: ChatMessageRequest, index: number) => ({
        ...request,
        messageId: 100 + index,
        syncId: 100 + index,
        userId: 2,
        status: 0,
        position: index,
        createTime: "2026-05-22 10:00:00",
        updateTime: "2026-05-22 10:00:00",
      })) as Message[],
    }));
    const hook = useTestHook({
      insertMessages,
    });

    const success = await hook.handleForwardToRooms([20, 21], "separate");

    expect(success).toBe(true);
    expect(insertMessages).toHaveBeenCalledTimes(2);
    expect(insertMessages.mock.calls.map(([requests]) => requests.map((request: ChatMessageRequest) => request.roomId))).toEqual([
      [20, 20],
      [21, 21],
    ]);
    expect(insertMessages.mock.calls[0]?.[0].map((request: ChatMessageRequest) => request.content)).toEqual([
      "消息 2",
      "消息 1",
    ]);
    expect(mocks.toastSuccessMock).toHaveBeenCalledWith("已转发到 2 个房间");
  });
});
