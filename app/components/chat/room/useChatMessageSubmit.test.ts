import { vi } from "vitest";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";

import type { ChatMessageResponse, UserRole } from "../../../../api";

import { MessageType } from "../../../../api/wsModels";
import { useChatComposerStore } from "../stores/chatComposerStore";
import { useChatInputUiStore } from "../stores/chatInputUiStore";
import { createRoomUiStore } from "../stores/roomUiStore";
import useChatMessageSubmit from "./useChatMessageSubmit";

const mocks = vi.hoisted(() => ({
  buildMessageDraftsFromComposerSnapshotMock: vi.fn(),
  triggerAudioAutoPlayMock: vi.fn(),
  toastErrorMock: vi.fn(),
  isCommandMock: vi.fn(),
}));

const passthroughCallback = <T extends (...args: any[]) => any>(fn: T) => fn;
const createStaticRef = <T>(value: T) => ({ current: value });

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    default: actual,
    useCallback: passthroughCallback,
    useRef: createStaticRef,
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
  isCommand: mocks.isCommandMock,
}));

vi.mock("@/components/chat/infra/audioMessage/audioMessageAutoPlayRuntime", () => ({
  triggerAudioAutoPlay: mocks.triggerAudioAutoPlayMock,
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
    messageType: MessageType.TEXT,
    position: messageId,
    createTime: "2026-03-30 22:00:00",
    updateTime: "2026-03-30 22:00:00",
  };
}

describe("useChatMessageSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isCommandMock.mockReturnValue(false);
    mocks.buildMessageDraftsFromComposerSnapshotMock.mockResolvedValue([]);
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

  it("首发带 BGM annotation 的音频消息会直接触发自动播放，即使回包未回显 annotation", async () => {
    mocks.buildMessageDraftsFromComposerSnapshotMock.mockResolvedValue([
      {
        content: "",
        messageType: MessageType.SOUND,
        annotations: [ANNOTATION_IDS.BGM],
        extra: {
          soundMessage: {
            url: "https://static.example.com/bgm.mp3",
            fileName: "bgm.mp3",
            size: 1024,
            second: 3,
            purpose: "bgm",
          },
        },
      },
    ]);

    useChatInputUiStore.setState({
      plainText: "",
      textWithoutMentions: "",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const setInputText = vi.fn();
    const setIsSubmitting = vi.fn();
    const sendMessageBatch = vi.fn(async () => []);
    const sendMessageWithInsert = vi.fn(async () => ({
      ...createMessage(10),
      messageType: MessageType.SOUND,
      extra: {
        soundMessage: {
          url: "https://static.example.com/bgm.mp3",
          fileName: "bgm.mp3",
          size: 1024,
          second: 3,
          purpose: "bgm",
        },
      },
      annotations: [],
    }));

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

    expect(mocks.triggerAudioAutoPlayMock).toHaveBeenCalledWith({
      source: "localSend",
      roomId: 1,
      messageId: 10,
      purpose: "bgm",
      url: "https://static.example.com/bgm.mp3",
    });
  });

  it("简单 .st 会优先编译成 STATE_EVENT(varOp)，不再走旧 cmdPre", async () => {
    mocks.isCommandMock.mockReturnValue(true);
    useChatInputUiStore.setState({
      plainText: ".st hp -2",
      textWithoutMentions: ".st hp -2",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const commandExecutor = vi.fn();
    const sendMessageWithInsert = vi.fn(async (request) => ({
      ...createMessage(20),
      messageType: request.messageType,
      content: request.content,
      extra: request.extra,
    }));

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      noRole: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn(),
      sendMessageWithInsert,
      sendMessageBatch: vi.fn(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn(async () => 7),
      commandExecutor,
      containsCommandRequestAllToken: vi.fn(() => false),
      stripCommandRequestAllToken: vi.fn((text: string) => text),
      extractFirstCommandText: vi.fn(() => null),
      setInputText: vi.fn(),
      roomUiStoreApi,
    });

    await handleMessageSubmit();

    expect(commandExecutor).not.toHaveBeenCalled();
    expect(sendMessageWithInsert).toHaveBeenCalledWith(expect.objectContaining({
      messageType: MessageType.STATE_EVENT,
      content: ".st hp -2",
      extra: {
        stateEvent: {
          source: {
            kind: "command",
            commandName: "st",
            parserVersion: "state-event-v1",
          },
          events: [{
            type: "varOp",
            scope: {
              kind: "role",
              roleId: 3,
            },
            key: "hp",
            op: "sub",
            value: 2,
          }],
        },
      },
    }));
  });

  it("简单 .next 会生成 STATE_EVENT(nextTurn)", async () => {
    useChatInputUiStore.setState({
      plainText: ".next",
      textWithoutMentions: ".next",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const sendMessageWithInsert = vi.fn(async (request) => ({
      ...createMessage(21),
      messageType: request.messageType,
      content: request.content,
      extra: request.extra,
    }));

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      noRole: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn(),
      sendMessageWithInsert,
      sendMessageBatch: vi.fn(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn(async () => 7),
      commandExecutor: vi.fn(),
      containsCommandRequestAllToken: vi.fn(() => false),
      stripCommandRequestAllToken: vi.fn((text: string) => text),
      extractFirstCommandText: vi.fn(() => null),
      setInputText: vi.fn(),
      roomUiStoreApi,
    });

    await handleMessageSubmit();

    expect(sendMessageWithInsert).toHaveBeenCalledWith(expect.objectContaining({
      messageType: MessageType.STATE_EVENT,
      content: ".next",
      extra: {
        stateEvent: {
          source: {
            kind: "command",
            commandName: "next",
            parserVersion: "state-event-v1",
          },
          events: [{ type: "nextTurn" }],
        },
      },
    }));
  });

  it("其他命令仍然走旧 cmdPre 逻辑", async () => {
    mocks.isCommandMock.mockReturnValue(true);
    useChatInputUiStore.setState({
      plainText: ".ra 侦查",
      textWithoutMentions: ".ra 侦查",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const commandExecutor = vi.fn();
    const sendMessageWithInsert = vi.fn(async () => createMessage(22));

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      noRole: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn(),
      sendMessageWithInsert,
      sendMessageBatch: vi.fn(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn(async () => 7),
      commandExecutor,
      containsCommandRequestAllToken: vi.fn(() => false),
      stripCommandRequestAllToken: vi.fn((text: string) => text),
      extractFirstCommandText: vi.fn(() => null),
      setInputText: vi.fn(),
      roomUiStoreApi,
    });

    await handleMessageSubmit();

    expect(commandExecutor).toHaveBeenCalledWith(expect.objectContaining({
      command: ".ra 侦查",
      originMessage: ".ra 侦查",
    }));
    expect(sendMessageWithInsert).not.toHaveBeenCalled();
  });
});
