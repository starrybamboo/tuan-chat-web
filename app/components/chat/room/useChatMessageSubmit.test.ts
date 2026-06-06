import { vi } from "vitest";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";

import type { ChatMessageRequest, ChatMessageResponse, UserRole } from "../../../../api";

import { MessageType } from "../../../../api/wsModels";
import { useChatComposerStore } from "../stores/chatComposerStore";
import { useChatInputUiStore } from "../stores/chatInputUiStore";
import { createRoomUiStore } from "../stores/roomUiStore";
import useChatMessageSubmit from "./useChatMessageSubmit";

const mocks = vi.hoisted(() => ({
  buildMessageDraftsFromComposerSnapshotMock: vi.fn(),
  triggerAudioAutoPlayMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  isCommandMock: vi.fn(),
  writeRoleVarOpsThroughAbilitiesMock: vi.fn(),
  setCachedDicerRoleAbilityMock: vi.fn(),
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
    success: mocks.toastSuccessMock,
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

vi.mock("@/components/common/dicer/roleAbilityCache", () => ({
  setCachedDicerRoleAbility: mocks.setCachedDicerRoleAbilityMock,
}));

vi.mock("@/components/chat/state/roleVarWriteThrough", () => ({
  mergeRoleVarOpSnapshotsIntoEvents: (events: any[], roleVarOps: any[]) => {
    const snapshots = [...roleVarOps];
    return events.map((event) => {
      if (event.type !== "varOp" || event.scope?.kind !== "role") {
        return event;
      }
      return snapshots.shift() ?? event;
    });
  },
  writeRoleVarOpsThroughAbilities: mocks.writeRoleVarOpsThroughAbilitiesMock,
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
    mocks.buildMessageDraftsFromComposerSnapshotMock.mockReset();
    mocks.isCommandMock.mockReset();
    mocks.writeRoleVarOpsThroughAbilitiesMock.mockReset();
    mocks.setCachedDicerRoleAbilityMock.mockReset();
    mocks.isCommandMock.mockReturnValue(false);
    mocks.writeRoleVarOpsThroughAbilitiesMock.mockResolvedValue({ changedAbilities: [], changedRoleIds: [], roleVarOps: [] });
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
    mocks.writeRoleVarOpsThroughAbilitiesMock.mockResolvedValueOnce({
      changedRoleIds: [3],
      roleVarOps: [{
        type: "varOp",
        scope: {
          kind: "role",
          roleId: 3,
        },
        key: "hp",
        op: "sub",
        value: 2,
        beforeValue: 10,
        afterValue: 8,
      }],
    });

    await handleMessageSubmit();

    expect(sendMessageBatch).toHaveBeenCalledTimes(1);
    expect(setInputText).toHaveBeenNthCalledWith(1, "");
    expect(setInputText).toHaveBeenNthCalledWith(2, "原始消息");
    expect(useChatComposerStore.getState().tempAnnotations).toEqual(["bgm"]);
    expect(useChatInputUiStore.getState().plainText).toBe("原始消息");
    expect(roomUiStoreApi.getState().replyMessage?.messageId).toBe(99);
    expect(roomUiStoreApi.getState().insertAfterMessageId).toBeUndefined();
    expect(setIsSubmitting).not.toHaveBeenCalled();
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

  it("附件上传完成前会先插入本地乐观消息，并在上传后复用这些消息提交", async () => {
    const draftDeferred = createDeferred<Array<{
      content: string;
      messageType: number;
      annotations?: string[];
      extra: Record<string, unknown>;
    }>>();
    mocks.buildMessageDraftsFromComposerSnapshotMock.mockReturnValue(draftDeferred.promise);

    useChatInputUiStore.setState({
      plainText: "附件说明",
      textWithoutMentions: "附件说明",
      mentionedRoles: [],
    });
    useChatComposerStore.setState({
      imgFiles: [new File(["image"], "scene.png", { type: "image/png" })],
      audioFile: new File(["audio"], "voice.mp3", { type: "audio/mpeg" }),
      fileAttachments: [new File(["video"], "clip.webm", { type: "video/webm" })],
      tempAnnotations: [ANNOTATION_IDS.BGM],
    });

    const optimisticMessages: ChatMessageResponse[] = [
      { message: { ...createMessage(-1), messageType: MessageType.IMG } },
      { message: { ...createMessage(-2), messageType: MessageType.SOUND } },
      { message: { ...createMessage(-3), messageType: MessageType.VIDEO } },
    ];
    const insertLocalOptimisticMessages = vi.fn((_requests: ChatMessageRequest[]) => optimisticMessages);
    const sendMessageBatchWithLocalOptimistic = vi.fn(async () => [
      { ...createMessage(41), messageType: MessageType.IMG },
      { ...createMessage(42), messageType: MessageType.SOUND },
      { ...createMessage(43), messageType: MessageType.VIDEO },
    ]);
    const sendMessageBatch = vi.fn(async () => []);
    const sendMessageWithInsert = vi.fn(async () => createMessage(44));
    const roomUiStoreApi = createRoomUiStore();

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      notMember: false,
      noRole: false,
      isSubmitting: false,
      setIsSubmitting: vi.fn(),
      discardLocalOptimisticMessages: vi.fn(async () => {}),
      insertLocalOptimisticMessages,
      sendMessageBatchWithLocalOptimistic,
      sendMessageWithInsert,
      sendMessageBatch,
      ensureRuntimeAvatarIdForRole: vi.fn(async () => 7),
      commandExecutor: vi.fn(),
      containsCommandRequestAllToken: vi.fn(() => false),
      stripCommandRequestAllToken: vi.fn((text: string) => text),
      extractFirstCommandText: vi.fn(() => null),
      setInputText: createSetInputTextMock(),
      roomUiStoreApi,
    });

    const submitPromise = handleMessageSubmit();
    await Promise.resolve();

    expect(insertLocalOptimisticMessages).toHaveBeenCalledTimes(1);
    expect(sendMessageBatchWithLocalOptimistic).not.toHaveBeenCalled();
    const pendingRequests = insertLocalOptimisticMessages.mock.calls[0][0];
    expect(pendingRequests.map(request => request.messageType)).toEqual([
      MessageType.IMG,
      MessageType.SOUND,
      MessageType.VIDEO,
    ]);
    expect(pendingRequests[0]).toEqual(expect.objectContaining({
      content: "附件说明",
      annotations: [ANNOTATION_IDS.BGM],
      avatarId: 7,
    }));
    expect((pendingRequests[0].extra as any).imageMessage).toEqual(expect.objectContaining({
      source: { kind: "internal", fileId: -1 },
      localFile: expect.any(File),
      fileName: "scene.png",
      background: false,
      width: 1,
      height: 1,
    }));
    expect((pendingRequests[1].extra as any).soundMessage).toEqual(expect.objectContaining({
      source: { kind: "internal", fileId: -1 },
      localFile: expect.any(File),
      fileName: "voice.mp3",
      second: 1,
    }));
    expect((pendingRequests[2].extra as any).videoMessage).toEqual(expect.objectContaining({
      source: { kind: "internal", fileId: -1 },
      localFile: expect.any(File),
      fileName: "clip.webm",
    }));

    draftDeferred.resolve([
      {
        content: "附件说明",
        messageType: MessageType.IMG,
        annotations: [ANNOTATION_IDS.BGM],
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: 101 },
            fileName: "scene.png",
            size: 5,
            width: 640,
            height: 480,
            background: false,
          },
        },
      },
      {
        content: "",
        messageType: MessageType.SOUND,
        annotations: [ANNOTATION_IDS.BGM],
        extra: {
          soundMessage: {
            source: { kind: "internal", fileId: 102 },
            fileName: "voice.mp3",
            size: 5,
            second: 3,
            purpose: "bgm",
          },
        },
      },
      {
        content: "",
        messageType: MessageType.VIDEO,
        annotations: [ANNOTATION_IDS.BGM],
        extra: {
          videoMessage: {
            source: { kind: "internal", fileId: 103 },
            fileName: "clip.webm",
            size: 5,
            second: 4,
          },
        },
      },
    ]);
    await submitPromise;

    expect(sendMessageBatchWithLocalOptimistic).toHaveBeenCalledTimes(1);
    expect(sendMessageBatchWithLocalOptimistic).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ messageType: MessageType.IMG }),
        expect.objectContaining({ messageType: MessageType.SOUND }),
        expect.objectContaining({ messageType: MessageType.VIDEO }),
      ]),
      optimisticMessages,
    );
    expect(sendMessageBatch).not.toHaveBeenCalled();
    expect(sendMessageWithInsert).not.toHaveBeenCalled();
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
            source: { kind: "internal", fileId: 12 },
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
          source: { kind: "internal", fileId: 12 },
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
      url: "https://media.tuan.chat/media/v1/files/012/12/audio/low.webm",
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

  it("简单 .st 会先发送骰娘反馈，再记录 STATE_EVENT(varOp)", async () => {
    mocks.isCommandMock.mockReturnValue(true);
    useChatInputUiStore.setState({
      plainText: ".st hp -2",
      textWithoutMentions: ".st hp -2",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    roomUiStoreApi.getState().setReplyMessage({
      ...createMessage(99),
      content: "被回复的普通消息",
    });
    const commandExecutor = vi.fn();
    const sendMessageWithInsert = vi.fn(async request => ({
      ...createMessage(20),
      messageType: request.messageType,
      content: request.content,
      extra: request.extra,
    }));
    mocks.writeRoleVarOpsThroughAbilitiesMock.mockResolvedValueOnce({
      changedAbilities: [{
        ability: {
          roleId: 3,
          ruleId: 7,
          ability: { hp: "8" },
        },
        roleId: 3,
        ruleId: 7,
      }],
      changedRoleIds: [3],
      roleVarOps: [{
        type: "varOp",
        scope: {
          kind: "role",
          roleId: 3,
        },
        key: "hp",
        op: "sub",
        value: 2,
        beforeValue: 10,
        afterValue: 8,
      }],
    });

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      ruleId: 7,
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
    expect(mocks.writeRoleVarOpsThroughAbilitiesMock).toHaveBeenCalledWith(expect.objectContaining({
      ruleId: 7,
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
    }));
    expect(sendMessageWithInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      messageType: MessageType.DICE,
      content: ".st hp -2",
      replayMessageId: 99,
      extra: expect.objectContaining({
        diceResult: {
          result: "状态已更新：角色 #3 · HP 10 -> 8",
        },
        diceTurn: {
          command: ".st hp -2",
          replies: [{
            content: "状态已更新：角色 #3 · HP 10 -> 8",
            customRoleName: "骰娘",
          }],
        },
      }),
    }));
    expect(sendMessageWithInsert.mock.calls[1]?.[0]).not.toHaveProperty("replayMessageId");
    expect(sendMessageWithInsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      messageType: MessageType.STATE_EVENT,
      content: "状态更新：HP -2",
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
            beforeValue: 10,
            afterValue: 8,
          }],
        },
      },
    }));
    expect(mocks.setCachedDicerRoleAbilityMock).toHaveBeenCalledWith(7, 3, {
      roleId: 3,
      ruleId: 7,
      ability: { hp: "8" },
    });
    expect(String(sendMessageWithInsert.mock.calls[1]?.[0]?.content ?? "")).not.toMatch(/^[.。/]/);
    expect(mocks.toastSuccessMock).toHaveBeenCalledWith("状态已更新", { id: "state-event-sent" });
  });

  it("连写带符号 .st 会发送骰娘反馈和 STATE_EVENT(varOp)", async () => {
    mocks.isCommandMock.mockReturnValue(true);
    useChatInputUiStore.setState({
      plainText: ".st hp+6",
      textWithoutMentions: ".st hp+6",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const commandExecutor = vi.fn();
    const sendMessageWithInsert = vi.fn(async request => ({
      ...createMessage(24),
      messageType: request.messageType,
      content: request.content,
      extra: request.extra,
    }));

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      ruleId: 7,
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
    mocks.writeRoleVarOpsThroughAbilitiesMock.mockResolvedValueOnce({
      changedAbilities: [{
        ability: {
          roleId: 3,
          ruleId: 7,
          ability: { hp: "14" },
        },
        roleId: 3,
        ruleId: 7,
      }],
      changedRoleIds: [3],
      roleVarOps: [{
        type: "varOp",
        scope: {
          kind: "role",
          roleId: 3,
        },
        key: "hp",
        op: "add",
        value: 6,
        beforeValue: 8,
        afterValue: 14,
      }],
    });

    await handleMessageSubmit();

    expect(commandExecutor).not.toHaveBeenCalled();
    expect(mocks.writeRoleVarOpsThroughAbilitiesMock).toHaveBeenCalledWith(expect.objectContaining({
      events: [{
        type: "varOp",
        scope: {
          kind: "role",
          roleId: 3,
        },
        key: "hp",
        op: "add",
        value: 6,
      }],
    }));
    expect(sendMessageWithInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      messageType: MessageType.DICE,
      content: ".st hp+6",
      extra: expect.objectContaining({
        diceTurn: {
          command: ".st hp+6",
          replies: [{
            content: "状态已更新：角色 #3 · HP 8 -> 14",
            customRoleName: "骰娘",
          }],
        },
      }),
    }));
    expect(sendMessageWithInsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      messageType: MessageType.STATE_EVENT,
      content: "状态更新：HP +6",
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
            op: "add",
            value: 6,
            beforeValue: 8,
            afterValue: 14,
          }],
        },
      },
    }));
    expect(String(sendMessageWithInsert.mock.calls[1]?.[0]?.content ?? "")).not.toMatch(/^[.。/]/);
  });

  it("空格赋值 。st 手枪 80 会发送骰娘反馈并同步 dicer 能力缓存", async () => {
    mocks.isCommandMock.mockReturnValue(true);
    useChatInputUiStore.setState({
      plainText: "。st 手枪 80",
      textWithoutMentions: "。st 手枪 80",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const commandExecutor = vi.fn();
    const sendMessageWithInsert = vi.fn(async request => ({
      ...createMessage(28),
      messageType: request.messageType,
      content: request.content,
      extra: request.extra,
    }));
    mocks.writeRoleVarOpsThroughAbilitiesMock.mockResolvedValueOnce({
      changedAbilities: [{
        ability: {
          roleId: 3,
          ruleId: 7,
          skill: { 手枪: "80" },
        },
        roleId: 3,
        ruleId: 7,
      }],
      changedRoleIds: [3],
      roleVarOps: [{
        type: "varOp",
        scope: {
          kind: "role",
          roleId: 3,
        },
        key: "手枪",
        op: "set",
        value: 80,
        beforeValue: 0,
        afterValue: 80,
      }],
    });

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      ruleId: 7,
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
    expect(mocks.writeRoleVarOpsThroughAbilitiesMock).toHaveBeenCalledWith(expect.objectContaining({
      events: [{
        type: "varOp",
        scope: {
          kind: "role",
          roleId: 3,
        },
        key: "手枪",
        op: "set",
        value: 80,
      }],
    }));
    expect(sendMessageWithInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      messageType: MessageType.DICE,
      content: "。st 手枪 80",
      extra: expect.objectContaining({
        diceTurn: {
          command: "。st 手枪 80",
          replies: [{
            content: "状态已更新：角色 #3 · 手枪 0 -> 80",
            customRoleName: "骰娘",
          }],
        },
      }),
    }));
    expect(sendMessageWithInsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      messageType: MessageType.STATE_EVENT,
      content: "状态更新：手枪 = 80",
    }));
    expect(mocks.setCachedDicerRoleAbilityMock).toHaveBeenCalledWith(7, 3, {
      roleId: 3,
      ruleId: 7,
      skill: { 手枪: "80" },
    });
  });

  it("连写无符号 .st 赋值会发送骰娘反馈和 STATE_EVENT(varOp)", async () => {
    mocks.isCommandMock.mockReturnValue(true);
    useChatInputUiStore.setState({
      plainText: ".st hp20",
      textWithoutMentions: ".st hp20",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const commandExecutor = vi.fn();
    const sendMessageWithInsert = vi.fn(async request => ({
      ...createMessage(26),
      messageType: request.messageType,
      content: request.content,
      extra: request.extra,
    }));
    mocks.writeRoleVarOpsThroughAbilitiesMock.mockResolvedValueOnce({
      changedAbilities: [{
        ability: {
          roleId: 3,
          ruleId: 7,
          ability: { hp: "20" },
        },
        roleId: 3,
        ruleId: 7,
      }],
      changedRoleIds: [3],
      roleVarOps: [{
        type: "varOp",
        scope: {
          kind: "role",
          roleId: 3,
        },
        key: "hp",
        op: "set",
        value: 20,
        beforeValue: 30,
        afterValue: 20,
      }],
    });

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      ruleId: 7,
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
    expect(mocks.writeRoleVarOpsThroughAbilitiesMock).toHaveBeenCalledWith(expect.objectContaining({
      events: [{
        type: "varOp",
        scope: {
          kind: "role",
          roleId: 3,
        },
        key: "hp",
        op: "set",
        value: 20,
      }],
    }));
    expect(sendMessageWithInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      messageType: MessageType.DICE,
      content: ".st hp20",
      extra: expect.objectContaining({
        diceTurn: {
          command: ".st hp20",
          replies: [{
            content: "状态已更新：角色 #3 · HP 30 -> 20",
            customRoleName: "骰娘",
          }],
        },
      }),
    }));
    expect(sendMessageWithInsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      messageType: MessageType.STATE_EVENT,
      content: "状态更新：HP = 20",
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
            op: "set",
            value: 20,
            beforeValue: 30,
            afterValue: 20,
          }],
        },
      },
    }));
    expect(String(sendMessageWithInsert.mock.calls[1]?.[0]?.content ?? "")).not.toMatch(/^[.。/]/);
  });

  it("简单 .st 写角色卡失败时不发送 STATE_EVENT 记录", async () => {
    mocks.isCommandMock.mockReturnValue(true);
    mocks.writeRoleVarOpsThroughAbilitiesMock.mockRejectedValue(new Error("角色卡保存失败"));
    useChatInputUiStore.setState({
      plainText: ".st hp-2",
      textWithoutMentions: ".st hp-2",
      mentionedRoles: [],
    });

    const roomUiStoreApi = createRoomUiStore();
    const commandExecutor = vi.fn();
    const sendMessageWithInsert = vi.fn(async () => createMessage(25));

    const { handleMessageSubmit } = useChatMessageSubmit({
      roomId: 1,
      spaceId: 2,
      isSpaceOwner: false,
      curRoleId: 3,
      ruleId: 7,
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
    expect(sendMessageWithInsert).not.toHaveBeenCalled();
    expect(mocks.toastErrorMock).toHaveBeenCalledWith("角色卡保存失败");
    expect(mocks.toastSuccessMock).not.toHaveBeenCalled();
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
      content: "下一回合",
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
    expect(mocks.toastSuccessMock).toHaveBeenCalledWith("状态已更新", { id: "state-event-sent" });
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
