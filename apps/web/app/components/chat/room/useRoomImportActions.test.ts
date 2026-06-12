import { vi } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../../../api";

import { createRoomUiStore } from "../stores/roomUiStore";
import useRoomImportActions from "./useRoomImportActions";

const {
  mockedGetCachedDocSnapshot,
  mockedGetPersistedDocSnapshot,
  mockedSetCachedDocSnapshot,
} = vi.hoisted(() => {
  return {
    mockedGetCachedDocSnapshot: vi.fn<(...args: any[]) => any>(() => null),
    mockedGetPersistedDocSnapshot: vi.fn(async () => null),
    mockedSetCachedDocSnapshot: vi.fn(),
  };
});

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    default: actual,
    useCallback: (fn: any) => fn,
  };
});

vi.mock("react-hot-toast", () => ({
  toast: {
    error: vi.fn<(...args: any[]) => any>(),
    success: vi.fn<(...args: any[]) => any>(),
  },
}));

vi.mock("@/components/common/dicer/utils/utils", () => ({
  default: {
    getDicerRoleId: vi.fn<(...args: any[]) => any>(async () => 1000),
  },
}));

vi.mock("@/components/chat/infra/doc/document/docSnapshotCache", () => ({
  getCachedDocSnapshot: mockedGetCachedDocSnapshot,
  setCachedDocSnapshot: mockedSetCachedDocSnapshot,
}));

vi.mock("@/components/chat/infra/doc/document/docSnapshotPersistence", () => ({
  getPersistedDocSnapshot: mockedGetPersistedDocSnapshot,
}));

function createMessage(messageId: number): ChatMessageResponse["message"] {
  return {
    messageId,
    syncId: messageId,
    roomId: 1,
    userId: 2,
    roleId: 3,
    content: "created",
    status: 0,
    messageType: 0,
    position: messageId,
    createTime: "2026-03-30 22:10:00",
    updateTime: "2026-03-30 22:10:00",
  };
}

describe("useRoomImportActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCachedDocSnapshot.mockReset();
    mockedGetCachedDocSnapshot.mockReturnValue(null);
    mockedGetPersistedDocSnapshot.mockReset();
    mockedGetPersistedDocSnapshot.mockResolvedValue(null);
    mockedSetCachedDocSnapshot.mockReset();
  });

  it("导入链路一次性批量发送并恢复回复/插入状态", async () => {
    const roomUiStoreApi = createRoomUiStore();
    roomUiStoreApi.getState().setReplyMessage({
      messageId: 200,
    } as ChatMessageResponse["message"]);
    roomUiStoreApi.getState().setInsertAfterMessageId(300);

    const sendMessageWithInsert = vi.fn<(...args: any[]) => any>();
    const sendMessageBatch = vi.fn<(...args: any[]) => any>(async () => [
      createMessage(1),
      createMessage(2),
      createMessage(3),
    ]);
    const onProgress = vi.fn<(...args: any[]) => any>();
    const setIsSubmitting = vi.fn<(...args: any[]) => any>();

    const { handleImportChatText } = useRoomImportActions({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      isSubmitting: false,
      setIsSubmitting,
      roomContext: {} as any,
      sendMessageWithInsert,
      sendMessageBatch,
      ensureRuntimeAvatarIdForRole: vi.fn<(...args: any[]) => any>(async () => 7),
      roomUiStoreApi,
    });

    await handleImportChatText([
      { roleId: 3, content: "第一条" },
      { roleId: 3, content: "第二条" },
      { roleId: 3, content: "第三条" },
    ], onProgress);

    expect(sendMessageWithInsert).not.toHaveBeenCalled();
    expect(sendMessageBatch).toHaveBeenCalledTimes(1);
    expect(sendMessageBatch.mock.calls[0]?.[0].map((request: any) => request.content)).toEqual([
      "第一条",
      "第二条",
      "第三条",
    ]);
    expect(sendMessageBatch.mock.calls[0]?.[1]).toEqual({
      mutationMeta: {
        operationCause: "normal",
        sourceSurface: "import",
      },
    });
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(3, 3);
    expect(roomUiStoreApi.getState().replyMessage?.messageId).toBe(200);
    expect(roomUiStoreApi.getState().insertAfterMessageId).toBe(300);
    expect(setIsSubmitting).toHaveBeenNthCalledWith(1, true);
    expect(setIsSubmitting).toHaveBeenNthCalledWith(2, false);
  });

  it("导入骰娘消息时在批量请求里使用房间骰娘身份", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageBatch = vi.fn<(...args: any[]) => any>(async () => [createMessage(1)]);

    const { handleImportChatText } = useRoomImportActions({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn<(...args: any[]) => any>(),
      roomContext: {} as any,
      sendMessageWithInsert: vi.fn<(...args: any[]) => any>(),
      sendMessageBatch,
      ensureRuntimeAvatarIdForRole: vi.fn<(...args: any[]) => any>(async (roleId: number) => roleId === 1000 ? 1001 : 7),
      roomUiStoreApi,
    });

    await handleImportChatText([
      { roleId: -2, speakerName: "海豹一号机", content: "由于a 灵感，<木落>掷出了 D20=5" },
    ]);

    expect(sendMessageBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        roleId: 1000,
        avatarId: 1001,
        messageType: MESSAGE_TYPE.DICE,
        customRoleName: "海豹一号机",
        extra: { diceResult: { result: "由于a 灵感，<木落>掷出了 D20=5" } },
      }),
    ], {
      mutationMeta: {
        operationCause: "normal",
        sourceSurface: "import",
      },
    });
  });

  it("导入骰子指令和骰娘回复合并项时由发起人发送 diceTurn", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageBatch = vi.fn<(...args: any[]) => any>(async () => [createMessage(1)]);

    const { handleImportChatText } = useRoomImportActions({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn<(...args: any[]) => any>(),
      roomContext: {} as any,
      sendMessageWithInsert: vi.fn<(...args: any[]) => any>(),
      sendMessageBatch,
      ensureRuntimeAvatarIdForRole: vi.fn<(...args: any[]) => any>(async (roleId: number) => roleId === 1000 ? 1001 : 7),
      roomUiStoreApi,
    });

    await handleImportChatText([
      {
        roleId: 3,
        speakerName: "木落",
        content: ".ra 灵感",
        diceTurn: {
          dicerSpeakerName: "海豹一号机",
          replyContent: "由于a 灵感，<木落>掷出了 D20=5",
        },
      },
    ]);

    expect(sendMessageBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        roomId: 1,
        roleId: 3,
        avatarId: 7,
        content: ".ra 灵感",
        customRoleName: "木落",
        messageType: MESSAGE_TYPE.DICE,
        extra: {
          diceTurn: {
            command: ".ra 灵感",
            replies: [{
              content: "由于a 灵感，<木落>掷出了 D20=5",
              roleId: 1000,
              avatarId: 1001,
              customRoleName: "海豹一号机",
            }],
          },
        },
      }),
    ], {
      mutationMeta: {
        operationCause: "normal",
        sourceSurface: "import",
      },
    });
  });

  it("房间导入 CQ 视频时通过批量请求发送外链视频消息", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageBatch = vi.fn<(...args: any[]) => any>(async () => [createMessage(1)]);

    const { handleImportChatText } = useRoomImportActions({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn<(...args: any[]) => any>(),
      roomContext: {} as any,
      sendMessageWithInsert: vi.fn<(...args: any[]) => any>(),
      sendMessageBatch,
      ensureRuntimeAvatarIdForRole: vi.fn<(...args: any[]) => any>(async () => 7),
      roomUiStoreApi,
    });

    await handleImportChatText([
      {
        roleId: 3,
        speakerName: "博丽灵梦",
        content: "录像 [CQ:video,file=replay.mp4,url=https://example.com/replay.mp4]",
      },
    ]);

    expect(sendMessageBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        roomId: 1,
        roleId: 3,
        avatarId: 7,
        content: "录像",
        customRoleName: "博丽灵梦",
        messageType: MESSAGE_TYPE.VIDEO,
        extra: {
          videoMessage: {
            source: {
              kind: "external",
              url: "https://example.com/replay.mp4",
              provider: "cq",
            },
            fileName: "replay.mp4",
          },
        },
      }),
    ], {
      mutationMeta: {
        operationCause: "normal",
        sourceSurface: "import",
      },
    });
  });

  it("发送共享文档卡片时保留源文档所属空间和 roomId", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageWithInsert = vi.fn<(...args: any[]) => any>().mockResolvedValue(createMessage(10));

    const { handleSendDocCard } = useRoomImportActions({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn<(...args: any[]) => any>(),
      roomContext: {} as any,
      sendMessageWithInsert,
      sendMessageBatch: vi.fn<(...args: any[]) => any>(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn<(...args: any[]) => any>(async () => 7),
      roomUiStoreApi,
    });

    await handleSendDocCard({
      docId: "321",
      spaceId: 99,
      title: "跨空间文档",
      excerpt: "摘要",
    });

    expect(sendMessageWithInsert).toHaveBeenCalledWith(expect.objectContaining({
      roomId: 1,
      roleId: 3,
      avatarId: 7,
      extra: {
        docCard: expect.objectContaining({
          docId: "321",
          roomId: 321,
          spaceId: 99,
          title: "跨空间文档",
          excerpt: "摘要",
        }),
      },
    }));
  });

  it("跨空间发送文档卡片时只从本地 message-stream 快照回填摘要", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageWithInsert = vi.fn<(...args: any[]) => any>().mockResolvedValue(createMessage(12));
    mockedGetCachedDocSnapshot.mockReturnValue({
      v: 4,
      format: "message-stream",
      updateB64: "W3sibWVzc2FnZVR5cGUiOjEsImNvbnRlbnQiOiLmnIDmlrDmkZjopoHvvIzkuI3oh6rliqjlkIzmraUifV0=",
      updatedAt: 1000,
    } as any);

    const { handleSendDocCard } = useRoomImportActions({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn<(...args: any[]) => any>(),
      roomContext: {} as any,
      sendMessageWithInsert,
      sendMessageBatch: vi.fn<(...args: any[]) => any>(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn<(...args: any[]) => any>(async () => 7),
      roomUiStoreApi,
    });

    await handleSendDocCard({
      docId: "123",
      roomId: 123,
      spaceId: 99,
      title: "跨空间文档",
    });

    expect(sendMessageWithInsert).toHaveBeenCalledWith(expect.objectContaining({
      extra: {
        docCard: expect.objectContaining({
          docId: "123",
          roomId: 123,
          spaceId: 99,
          excerpt: "最新摘要，不自动同步",
          title: "跨空间文档",
        }),
      },
    }));
  });

  it("发送我的文档卡片时使用文档房间 id", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageWithInsert = vi.fn().mockResolvedValue(createMessage(14));

    const { handleSendDocCard } = useRoomImportActions({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn(),
      roomContext: {} as any,
      sendMessageWithInsert,
      sendMessageBatch: vi.fn(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn(async () => 7),
      roomUiStoreApi,
    });

    await handleSendDocCard({
      docId: "123",
      roomId: 123,
      spaceId: 99,
      title: "我的文档",
    });

    expect(sendMessageWithInsert).toHaveBeenCalledWith(expect.objectContaining({
      extra: {
        docCard: expect.objectContaining({
          docId: "123",
          roomId: 123,
          spaceId: 99,
          title: "我的文档",
        }),
      },
    }));
  });

  it("本地内存没有文档快照时会从持久化快照回填摘要", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageWithInsert = vi.fn().mockResolvedValue(createMessage(13));
    const persistedSnapshot = {
      v: 4,
      format: "message-stream",
      updateB64: "W3sibWVzc2FnZVR5cGUiOjEsImNvbnRlbnQiOiLmnIDmlrDmkZjopoHvvIzkuI3oh6rliqjlkIzmraUifV0=",
      updatedAt: 1000,
    } as any;
    mockedGetPersistedDocSnapshot.mockResolvedValue(persistedSnapshot);

    const { handleSendDocCard } = useRoomImportActions({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn(),
      roomContext: {} as any,
      sendMessageWithInsert,
      sendMessageBatch: vi.fn(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn(async () => 7),
      roomUiStoreApi,
    });

    await handleSendDocCard({
      docId: "123",
      roomId: 123,
      spaceId: 99,
      title: "跨空间文档",
    });

    expect(mockedGetPersistedDocSnapshot).toHaveBeenCalledWith("123");
    expect(mockedSetCachedDocSnapshot).toHaveBeenCalledWith("123", persistedSnapshot);
    expect(sendMessageWithInsert).toHaveBeenCalledWith(expect.objectContaining({
      extra: {
        docCard: expect.objectContaining({
          docId: "123",
          roomId: 123,
          spaceId: 99,
          excerpt: "最新摘要，不自动同步",
          title: "跨空间文档",
        }),
      },
    }));
  });

  it("发送线索卡片时保留原线索快照", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageWithInsert = vi.fn<(...args: any[]) => any>().mockResolvedValue(createMessage(15));

    const { handleSendClueCard } = useRoomImportActions({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn<(...args: any[]) => any>(),
      roomContext: {} as any,
      sendMessageWithInsert,
      sendMessageBatch: vi.fn<(...args: any[]) => any>(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn<(...args: any[]) => any>(async () => 7),
      roomUiStoreApi,
    });

    await handleSendClueCard({
      snapshot: {
        messageType: MESSAGE_TYPE.TEXT,
        content: "旧钥匙",
        extra: {
          textStyle: {
            bold: true,
          },
        },
      },
    });

    expect(sendMessageWithInsert).toHaveBeenCalledWith(expect.objectContaining({
      roomId: 1,
      roleId: 3,
      avatarId: 7,
      content: "旧钥匙",
      messageType: MESSAGE_TYPE.CLUE_CARD,
      extra: {
        clueMessage: {
          snapshot: {
            messageType: MESSAGE_TYPE.TEXT,
            content: "旧钥匙",
            extra: {
              textStyle: {
                bold: true,
              },
            },
          },
        },
      },
    }));
  });

  it("发送群聊跳转时保留目标群聊所属空间", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageWithInsert = vi.fn<(...args: any[]) => any>().mockResolvedValue(createMessage(11));

    const { handleSendRoomJump } = useRoomImportActions({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn<(...args: any[]) => any>(),
      roomContext: {} as any,
      sendMessageWithInsert,
      sendMessageBatch: vi.fn<(...args: any[]) => any>(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn<(...args: any[]) => any>(async () => 7),
      roomUiStoreApi,
    });

    await handleSendRoomJump({
      roomId: 456,
      spaceId: 88,
      roomName: "跨空间群聊",
      categoryName: "外部分类",
    });

    expect(sendMessageWithInsert).toHaveBeenCalledWith(expect.objectContaining({
      roomId: 1,
      roleId: 3,
      avatarId: 7,
      extra: {
        roomJump: expect.objectContaining({
          roomId: 456,
          spaceId: 88,
          roomName: "跨空间群聊",
          categoryName: "外部分类",
        }),
      },
    }));
  });
});
