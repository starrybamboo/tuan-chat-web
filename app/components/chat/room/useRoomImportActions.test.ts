import { vi } from "vitest";

import type { ChatMessageResponse } from "../../../../api";

import { createRoomUiStore } from "../stores/roomUiStore";
import useRoomImportActions from "./useRoomImportActions";

const {
  mockedGetCachedDocSnapshot,
  mockedGetRemoteSnapshot,
  mockedSetRemoteSnapshot,
} = vi.hoisted(() => {
  return {
    mockedGetCachedDocSnapshot: vi.fn(() => null),
    mockedGetRemoteSnapshot: vi.fn(async () => null),
    mockedSetRemoteSnapshot: vi.fn(async () => undefined),
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
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/common/dicer/utils/utils", () => ({
  default: {
    getDicerRoleId: vi.fn(async () => 1000),
  },
}));

vi.mock("@/components/chat/infra/doc/document/docSnapshotCache", () => ({
  getCachedDocSnapshot: mockedGetCachedDocSnapshot,
}));

vi.mock("@/components/chat/infra/doc/description/descriptionDocRemote", () => ({
  getRemoteSnapshot: mockedGetRemoteSnapshot,
  setRemoteSnapshot: mockedSetRemoteSnapshot,
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
    mockedGetRemoteSnapshot.mockReset();
    mockedGetRemoteSnapshot.mockResolvedValue(null);
    mockedSetRemoteSnapshot.mockReset();
    mockedSetRemoteSnapshot.mockResolvedValue(undefined);
  });

  it("导入链路在发送失败后停止推进进度", async () => {
    const roomUiStoreApi = createRoomUiStore();
    roomUiStoreApi.getState().setReplyMessage({
      messageId: 200,
    } as ChatMessageResponse["message"]);
    roomUiStoreApi.getState().setInsertAfterMessageId(300);

    const sendMessageWithInsert = vi.fn()
      .mockResolvedValueOnce(createMessage(1))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createMessage(3));
    const onProgress = vi.fn();
    const setIsSubmitting = vi.fn();

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
      sendMessageBatch: vi.fn(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn(async () => 7),
      roomUiStoreApi,
    });

    await handleImportChatText([
      { roleId: 3, content: "第一条" },
      { roleId: 3, content: "第二条" },
      { roleId: 3, content: "第三条" },
    ], onProgress);

    expect(sendMessageWithInsert).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(1, 3);
    expect(roomUiStoreApi.getState().replyMessage?.messageId).toBe(200);
    expect(roomUiStoreApi.getState().insertAfterMessageId).toBe(300);
    expect(setIsSubmitting).toHaveBeenNthCalledWith(1, true);
    expect(setIsSubmitting).toHaveBeenNthCalledWith(2, false);
  });

  it("发送文档卡片时保留源文档所属空间", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageWithInsert = vi.fn().mockResolvedValue(createMessage(10));

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
      docId: "udoc:123:description",
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
          docId: "udoc:123:description",
          spaceId: 99,
          title: "跨空间文档",
          excerpt: "摘要",
        }),
      },
    }));
  });

  it("跨空间发送文档卡片时会同步最新 blocknote 快照并回填摘要", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageWithInsert = vi.fn().mockResolvedValue(createMessage(12));
    mockedGetCachedDocSnapshot.mockReturnValue({
      v: 3,
      format: "blocknote",
      updateB64: "W3sidHlwZSI6InBhcmFncmFwaCIsImNvbnRlbnQiOiLmlrDmj5gifV0=",
      updatedAt: 1000,
      excerpt: "最新摘要",
      header: {
        title: "跨空间文档",
      },
    } as any);

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
      docId: "udoc:123:description",
      spaceId: 99,
      title: "跨空间文档",
    });

    expect(mockedSetRemoteSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      entityType: "space_user_doc",
      entityId: 123,
      docType: "description",
      snapshot: expect.objectContaining({
        v: 3,
        format: "blocknote",
        updateB64: "W3sidHlwZSI6InBhcmFncmFwaCIsImNvbnRlbnQiOiLmlrDmj5gifV0=",
        excerpt: "最新摘要",
      }),
    }));
    expect(sendMessageWithInsert).toHaveBeenCalledWith(expect.objectContaining({
      extra: {
        docCard: expect.objectContaining({
          docId: "udoc:123:description",
          spaceId: 99,
          excerpt: "最新摘要",
          title: "跨空间文档",
        }),
      },
    }));
  });

  it("发送群聊跳转时保留目标群聊所属空间", async () => {
    const roomUiStoreApi = createRoomUiStore();
    const sendMessageWithInsert = vi.fn().mockResolvedValue(createMessage(11));

    const { handleSendRoomJump } = useRoomImportActions({
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
