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

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    default: actual,
    useCallback: (fn: any) => fn,
    useRef: (value: any) => ({ current: value }),
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

function createSetInputTextMock() {
  return vi.fn((text: string) => {
    useChatInputUiStore.setState({
      plainText: text,
      textWithoutMentions: text,
      mentionedRoles: [],
    });
  });
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
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

    const setInputText = createSetInputTextMock();
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
    expect(setInputText).toHaveBeenNthCalledWith(1, "");
    expect(setInputText).toHaveBeenNthCalledWith(2, "原始消息");
    expect(useChatComposerStore.getState().tempAnnotations).toEqual(["bgm"]);
    expect(useChatInputUiStore.getState().plainText).toBe("原始消息");
    expect(roomUiStoreApi.getState().replyMessage?.messageId).toBe(99);
    expect(roomUiStoreApi.getState().insertAfterMessageId).toBeUndefined();
    expect(setIsSubmitting).toHaveBeenNthCalledWith(1, true);
    expect(setIsSubmitting).toHaveBeenNthCalledWith(2, false);
    expect(mocks.toastErrorMock).not.toHaveBeenCalled();
  });

  it("开始发送后会立即清空输入框，不等待发送回包", async () => {
    mocks.buildMessageDraftsFromComposerSnapshotMock.mockResolvedValue([
      {
        content: "普通消息",
        messageType: MessageType.TEXT,
        extra: {},
      },
    ]);
    useChatInputUiStore.setState({
      plainText: "普通消息",
      textWithoutMentions: "普通消息",
      mentionedRoles: [],
    });

    const ensureAvatarDeferred = createDeferred<number>();
    const roomUiStoreApi = createRoomUiStore();
    const setInputText = createSetInputTextMock();
    const sendMessageWithInsert = vi.fn(async () => createMessage(30));

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
      ensureRuntimeAvatarIdForRole: vi.fn(() => ensureAvatarDeferred.promise),
      commandExecutor: vi.fn(),
      containsCommandRequestAllToken: vi.fn(() => false),
      stripCommandRequestAllToken: vi.fn((text: string) => text),
      extractFirstCommandText: vi.fn(() => null),
      setInputText,
      roomUiStoreApi,
    });

    const submitPromise = handleMessageSubmit();

    expect(setInputText).toHaveBeenCalledWith("");
    expect(useChatInputUiStore.getState().plainText).toBe("");
    expect(sendMessageWithInsert).not.toHaveBeenCalled();

    ensureAvatarDeferred.resolve(7);
    await submitPromise;
  });

  it("发送失败时会回填原始输入框内容", async () => {
    mocks.buildMessageDraftsFromComposerSnapshotMock.mockResolvedValue([
      {
        content: "普通消息",
        messageType: MessageType.TEXT,
        extra: {},
      },
    ]);
    useChatInputUiStore.setState({
      plainText: "普通消息",
      textWithoutMentions: "普通消息",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const setInputText = createSetInputTextMock();
    const sendMessageWithInsert = vi.fn(async () => null);

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
      setInputText,
      roomUiStoreApi,
    });

    await handleMessageSubmit();

    expect(setInputText).toHaveBeenNthCalledWith(1, "");
    expect(setInputText).toHaveBeenNthCalledWith(2, "普通消息");
    expect(useChatInputUiStore.getState().plainText).toBe("普通消息");
  });

  it("真正空字符串且无附件时会直接提示不能为空", async () => {
    useChatInputUiStore.setState({
      plainText: "",
      textWithoutMentions: "",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const setInputText = createSetInputTextMock();
    const setIsSubmitting = vi.fn();
    const sendMessageWithInsert = vi.fn(async () => createMessage(31));

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
      sendMessageBatch: vi.fn(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn(async () => 7),
      commandExecutor: vi.fn(),
      containsCommandRequestAllToken: vi.fn(() => false),
      stripCommandRequestAllToken: vi.fn((text: string) => text),
      extractFirstCommandText: vi.fn(() => null),
      setInputText,
      roomUiStoreApi,
    });

    await handleMessageSubmit();

    expect(mocks.toastErrorMock).toHaveBeenCalledWith("消息不能为无");
    expect(setIsSubmitting).not.toHaveBeenCalled();
    expect(setInputText).not.toHaveBeenCalled();
    expect(mocks.buildMessageDraftsFromComposerSnapshotMock).not.toHaveBeenCalled();
    expect(sendMessageWithInsert).not.toHaveBeenCalled();
  });

  it("纯空白输入会把原始空白交给草稿构建器", async () => {
    useChatInputUiStore.setState({
      plainText: " \n\t ",
      textWithoutMentions: " \n\t ",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const setInputText = createSetInputTextMock();

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      noRole: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn(),
      sendMessageWithInsert: vi.fn(async () => createMessage(32)),
      sendMessageBatch: vi.fn(async () => []),
      ensureRuntimeAvatarIdForRole: vi.fn(async () => 7),
      commandExecutor: vi.fn(),
      containsCommandRequestAllToken: vi.fn(() => false),
      stripCommandRequestAllToken: vi.fn((text: string) => text),
      extractFirstCommandText: vi.fn(() => null),
      setInputText,
      roomUiStoreApi,
    });

    await handleMessageSubmit();

    expect(mocks.buildMessageDraftsFromComposerSnapshotMock).toHaveBeenCalledWith(expect.objectContaining({
      inputText: " \n\t ",
      allowEmptyTextMessage: false,
    }));
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
    useChatComposerStore.setState({
      audioFile: new File(["audio"], "bgm.mp3", { type: "audio/mpeg" }),
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

  it("以 % 开头的纯文本保持为普通文本消息", async () => {
    mocks.buildMessageDraftsFromComposerSnapshotMock.mockResolvedValue([
      {
        content: "%bgm:1",
        messageType: MessageType.TEXT,
        extra: {},
      },
    ]);

    useChatInputUiStore.setState({
      plainText: "%bgm:1",
      textWithoutMentions: "%bgm:1",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const sendMessageWithInsert = vi.fn(async request => ({
      ...createMessage(11),
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
      messageType: MessageType.TEXT,
      content: "%bgm:1",
      extra: {},
    }));
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
    const sendMessageWithInsert = vi.fn(async request => ({
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
    const sendMessageWithInsert = vi.fn(async request => ({
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

  it("@提及开头的骰子命令仍会走旧 cmdPre，支持旁白给其他角色代骰", async () => {
    mocks.isCommandMock.mockImplementation((text: string) => String(text).startsWith("."));
    const mentionedRoles = [{
      roleId: 9,
      roleName: "调查员A",
    }] as UserRole[];
    useChatInputUiStore.setState({
      plainText: "@调查员A .ra 侦查",
      textWithoutMentions: ".ra 侦查",
      mentionedRoles,
    });

    const roomUiStoreApi = createRoomUiStore();
    const commandExecutor = vi.fn();
    const sendMessageWithInsert = vi.fn(async () => createMessage(23));

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: true,
      curRoleId: -1,
      notMember: false,
      noRole: true,
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
      mentionedRoles,
      originMessage: "@调查员A .ra 侦查",
    }));
    expect(sendMessageWithInsert).not.toHaveBeenCalled();
  });
});
