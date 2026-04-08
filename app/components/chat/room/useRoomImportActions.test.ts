import { vi } from "vitest";

import type { ChatMessageResponse } from "../../../../api";

import { createRoomUiStore } from "../stores/roomUiStore";
import useRoomImportActions from "./useRoomImportActions";

const passthroughCallback = <T extends (...args: any[]) => any>(fn: T) => fn;

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    default: actual,
    useCallback: passthroughCallback,
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

vi.mock("@/components/chat/infra/blocksuite/space/spaceWorkspaceRegistry", () => ({
  getSpaceWorkspaceIfExists: vi.fn(() => null),
  getOrCreateSpaceDoc: vi.fn(() => null),
}));

vi.mock("@/components/chat/infra/blocksuite/description/descriptionDocRemote", () => ({
  setRemoteSnapshot: vi.fn(async () => undefined),
}));

vi.mock("@/components/chat/infra/blocksuite/shared/base64", () => ({
  uint8ArrayToBase64: vi.fn(() => ""),
}));

vi.mock("@/components/chat/infra/blocksuite/document/docExcerpt", () => ({
  extractDocExcerptFromStore: vi.fn(() => ""),
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
