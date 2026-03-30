import type { ChatMessageResponse, UserRole } from "../../../../api";

import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildMessageDraftsFromComposerSnapshotMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    default: actual,
    useCallback: <T extends (...args: any[]) => any>(fn: T) => fn,
    useRef: <T>(value: T) => ({ current: value }),
  };
});

vi.mock("react-hot-toast", () => ({
  toast: {
    error: mocks.toastErrorMock,
    success: vi.fn(),
  },
}));

vi.mock("@/components/chat/utils/messageDraftBuilder", () => ({
  buildMessageDraftsFromComposerSnapshot: mocks.buildMessageDraftsFromComposerSnapshotMock,
}));

vi.mock("@/components/chat/utils/roomJump", () => ({
  isRoomJumpCommandText: () => false,
  parseRoomJumpCommand: () => null,
}));

vi.mock("@/components/common/dicer/cmdPre", () => ({
  isCommand: () => false,
}));

vi.mock("@/components/chat/infra/audioMessage/audioMessageBgmCoordinator", () => ({
  requestPlayBgmMessageWithUrl: vi.fn(),
}));

vi.mock("@/components/chat/stores/audioMessageAutoPlayStore", () => ({
  useAudioMessageAutoPlayStore: {
    getState: () => ({
      enqueueFromWs: vi.fn(),
    }),
  },
}));

import { MessageType } from "../../../../api/wsModels";
import useChatMessageSubmit from "./useChatMessageSubmit";
import { useChatComposerStore } from "../stores/chatComposerStore";
import { useChatInputUiStore } from "../stores/chatInputUiStore";
import { createRoomUiStore } from "../stores/roomUiStore";

function createMessage(messageId: number): ChatMessageResponse["message"] {
  return {
    messageId,
    syncId: messageId,
    roomId: 1,
    userId: 2,
    roleId: 3,
    content: "created",
    status: 0,
    messageType: MessageType.TEXT,
    position: messageId,
    createTime: "2026-03-30 22:00:00",
    updateTime: "2026-03-30 22:00:00",
  };
}

describe("useChatMessageSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatInputUiStore.getState().reset();
    useChatComposerStore.getState().reset();
  });

  it("批量发送失败时保留当前草稿和回复态", async () => {
    mocks.buildMessageDraftsFromComposerSnapshotMock.mockResolvedValue([
      {
        content: "第一条",
        messageType: MessageType.TEXT,
        extra: {},
      },
      {
        content: "第二条",
        messageType: MessageType.TEXT,
        extra: {},
      },
    ]);

    const mentionedRoles = [{ roleId: 9 }] as UserRole[];
    useChatInputUiStore.setState({
      plainText: "原始消息",
      textWithoutMentions: "原始消息",
      mentionedRoles,
    });
    useChatComposerStore.setState({
      tempAnnotations: ["bgm"],
    });

    const roomUiStoreApi = createRoomUiStore();
    roomUiStoreApi.getState().setReplyMessage({
      messageId: 99,
    } as ChatMessageResponse["message"]);

    const setInputText = vi.fn((text: string) => {
      useChatInputUiStore.setState({
        plainText: text,
        textWithoutMentions: text,
        mentionedRoles: [],
      });
    });
    const setIsSubmitting = vi.fn();
    const sendMessageBatch = vi.fn(async () => []);
    const sendMessageWithInsert = vi.fn(async () => createMessage(10));

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      noRole: false,
      isSubmitting: false,
      setIsSubmitting,
      sendMessageWithInsert,
      sendMessageBatch,
      ensureRuntimeAvatarIdForRole: vi.fn(async () => 7),
      commandExecutor: vi.fn(),
      containsCommandRequestAllToken: vi.fn(() => false),
      stripCommandRequestAllToken: vi.fn((text: string) => text),
      extractFirstCommandText: vi.fn(() => null),
      setInputText,
      roomUiStoreApi,
    });

    await handleMessageSubmit();

    expect(sendMessageBatch).toHaveBeenCalledTimes(1);
    expect(setInputText).not.toHaveBeenCalled();
    expect(useChatComposerStore.getState().tempAnnotations).toEqual(["bgm"]);
    expect(roomUiStoreApi.getState().replyMessage?.messageId).toBe(99);
    expect(roomUiStoreApi.getState().insertAfterMessageId).toBeUndefined();
    expect(setIsSubmitting).toHaveBeenNthCalledWith(1, true);
    expect(setIsSubmitting).toHaveBeenNthCalledWith(2, false);
    expect(mocks.toastErrorMock).not.toHaveBeenCalled();
  });
});
