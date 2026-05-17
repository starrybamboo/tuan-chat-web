import { describe, expect, it } from "vitest";

import type { Message } from "@tuanchat/openapi-client/models/Message";

import { ANNOTATION_IDS } from "./message-annotations";
import { getMessagePreviewText } from "./messagePreview";
import { MESSAGE_TYPE } from "./messageType";

function createMessage(overrides: Partial<Message>): Message {
  return {
    content: "",
    messageId: 1,
    messageType: MESSAGE_TYPE.TEXT,
    roomId: 1,
    status: 0,
    userId: 7,
    ...overrides,
  };
}

describe("getMessagePreviewText", () => {
  it("覆盖删除消息和文本消息", () => {
    expect(getMessagePreviewText(createMessage({ content: "你好" }))).toBe("你好");
    expect(getMessagePreviewText(createMessage({ status: 1 }))).toBe("[原消息已被删除]");
  });

  it("为媒体消息生成稳定摘要", () => {
    expect(getMessagePreviewText(createMessage({
      messageType: MESSAGE_TYPE.IMG,
      extra: { imageMessage: { fileName: "scene.png" } },
    }))).toBe("[图片] scene.png");

    expect(getMessagePreviewText(createMessage({
      messageType: MESSAGE_TYPE.FILE,
      extra: { fileMessage: { fileName: "handout.pdf" } },
    }))).toBe("[文件] handout.pdf");
  });

  it("音频和演出特效预览会读取 annotation 语义", () => {
    expect(getMessagePreviewText(createMessage({
      annotations: [ANNOTATION_IDS.SE],
      extra: { soundMessage: { fileName: "mystery.mp3", purpose: "bgm" } },
      messageType: MESSAGE_TYPE.SOUND,
    }))).toBe("[语音] mystery.mp3");

    expect(getMessagePreviewText(createMessage({
      annotations: [ANNOTATION_IDS.SCENE_EFFECT_RAIN],
      messageType: MESSAGE_TYPE.EFFECT,
    }))).toBe("[特效] 下雨");
  });

  it("复用状态事件预览", () => {
    expect(getMessagePreviewText(createMessage({
      content: ".next",
      messageType: MESSAGE_TYPE.STATE_EVENT,
      extra: {
        stateEvent: {
          source: { kind: "command", parserVersion: "state-event-v1" },
          events: [{ type: "nextTurn" }],
        },
      },
    }))).toBe("[状态] 下一回合");
  });

  it("支持房间跳转、子区和文档卡片", () => {
    expect(getMessagePreviewText(createMessage({
      messageType: MESSAGE_TYPE.ROOM_JUMP,
      extra: { roomJump: { roomId: 9, label: "作战频道" } },
    }))).toBe("[群聊] 作战频道");

    expect(getMessagePreviewText(createMessage({
      messageType: MESSAGE_TYPE.THREAD_ROOT,
      extra: { threadRoot: { title: "支线讨论" } },
    }))).toBe("[子区] 支线讨论");

    expect(getMessagePreviewText(createMessage({
      messageType: MESSAGE_TYPE.DOC_CARD,
      extra: { docCard: { title: "调查笔记" } },
    }))).toBe("[文档] 调查笔记");
  });
});
