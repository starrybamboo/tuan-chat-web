import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../api";

import {
  areRealtimeRenderMessagesEquivalent,
  getRealtimeRenderChangedMessageIndices,
  getRealtimeRenderMessageFingerprint,
  getRealtimeRenderUpdateStrategy,
} from "./realtimeRenderMessageDelta";

function createResponse(overrides: Partial<ChatMessageResponse["message"]>): ChatMessageResponse {
  return {
    message: {
      messageId: 1,
      roomId: 1,
      roleId: 1,
      avatarId: 11,
      messageType: MESSAGE_TYPE.TEXT,
      content: "hello",
      annotations: [],
      status: 0,
      extra: {},
      webgal: undefined,
      ...overrides,
    } as ChatMessageResponse["message"],
  } as ChatMessageResponse;
}

describe("realtimeRenderMessageDelta", () => {
  it("忽略仅 updateTime 类的无渲染差异提交", () => {
    const previous = createResponse({ content: "hello" }).message;
    const next = createResponse({ content: "hello" }).message;

    expect(areRealtimeRenderMessagesEquivalent(previous, next)).toBe(true);
    expect(getRealtimeRenderMessageFingerprint(previous)).toBe(getRealtimeRenderMessageFingerprint(next));
  });

  it("普通文本改字在关闭自动立绘和房间级小头像时只需局部更新", () => {
    const previous = createResponse({ content: "hello" }).message;
    const next = createResponse({ content: "world" }).message;

    expect(getRealtimeRenderUpdateStrategy(previous, next, {
      autoFigureEnabled: false,
      miniAvatarEnabled: false,
    })).toBe("self");
  });

  it("figure.mini-avatar 变更会升级为后缀重渲染", () => {
    const previous = createResponse({ annotations: [] }).message;
    const next = createResponse({ annotations: [ANNOTATION_IDS.FIGURE_MINI_AVATAR] }).message;

    expect(getRealtimeRenderUpdateStrategy(previous, next, {
      autoFigureEnabled: false,
      miniAvatarEnabled: false,
    })).toBe("suffix");
  });

  it("在开启房间级小头像时，普通对话内容改动也按后缀状态处理", () => {
    const previous = createResponse({ content: "hello" }).message;
    const next = createResponse({ content: "world" }).message;

    expect(getRealtimeRenderUpdateStrategy(previous, next, {
      autoFigureEnabled: false,
      miniAvatarEnabled: true,
    })).toBe("suffix");
  });

  it("骰子消息改动保守走后缀重渲染，避免破坏成对合并语义", () => {
    const previous = createResponse({
      messageType: MESSAGE_TYPE.DICE,
      content: "1d100",
    }).message;
    const next = createResponse({
      messageType: MESSAGE_TYPE.DICE,
      content: "2d100",
    }).message;

    expect(getRealtimeRenderUpdateStrategy(previous, next, {
      autoFigureEnabled: false,
      miniAvatarEnabled: false,
    })).toBe("suffix");
  });

  it("能区分同序更新里的局部替换和后缀重渲染起点", () => {
    const previousMessagesById = new Map<number, ChatMessageResponse["message"]>([
      [1, createResponse({ messageId: 1, content: "a" }).message],
      [2, createResponse({ messageId: 2, content: "b" }).message],
      [3, createResponse({ messageId: 3, content: "c" }).message],
    ]);

    const currentMessages = [
      createResponse({ messageId: 1, content: "a1" }),
      createResponse({ messageId: 2, annotations: [ANNOTATION_IDS.FIGURE_MINI_AVATAR] }),
      createResponse({ messageId: 3, content: "c" }),
    ];

    expect(getRealtimeRenderChangedMessageIndices(previousMessagesById, currentMessages, {
      autoFigureEnabled: false,
      miniAvatarEnabled: false,
    })).toEqual({
      selfIndices: [0],
      firstSuffixIndex: 1,
    });
  });
});
