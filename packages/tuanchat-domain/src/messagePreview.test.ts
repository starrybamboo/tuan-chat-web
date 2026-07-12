import type { Message } from "@tuanchat/openapi-client/models/Message";

import { describe, expect, it } from "vitest";

import { ANNOTATION_IDS, getSceneEffectFromAnnotations } from "./message-annotations";
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
    }))).toBe("[图片]");

    expect(getMessagePreviewText(createMessage({
      messageType: MESSAGE_TYPE.FILE,
      extra: { fileMessage: { fileName: "handout.pdf" } },
    }))).toBe("[文件]");

    expect(getMessagePreviewText(createMessage({
      content: "手写地图",
      messageType: MESSAGE_TYPE.IMG,
      extra: { imageMessage: { fileName: "scene.png" } },
    }))).toBe("[图片] 手写地图");
  });

  it("音频和演出特效预览会读取 annotation 语义", () => {
    expect(getMessagePreviewText(createMessage({
      annotations: [ANNOTATION_IDS.SE],
      extra: { soundMessage: { fileName: "mystery.mp3", purpose: "bgm" } },
      messageType: MESSAGE_TYPE.SOUND,
    }))).toBe("[语音]");

    expect(getMessagePreviewText(createMessage({
      annotations: [ANNOTATION_IDS.SCENE_EFFECT_RAIN],
      messageType: MESSAGE_TYPE.EFFECT,
    }))).toBe("[特效] 下雨");
  });

  it("樱花场景特效使用 WebGAL 预制命令名但预览保持中文标签", () => {
    expect(getSceneEffectFromAnnotations([ANNOTATION_IDS.SCENE_EFFECT_SAKURA])).toBe("cherryBlossoms");
    expect(getMessagePreviewText(createMessage({
      annotations: [ANNOTATION_IDS.SCENE_EFFECT_SAKURA],
      messageType: MESSAGE_TYPE.EFFECT,
    }))).toBe("[特效] 樱花");
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

  it("骰子消息直接预览结果文本", () => {
    expect(getMessagePreviewText(createMessage({
      content: "fallback",
      messageType: MESSAGE_TYPE.DICE,
      extra: { diceResult: { result: "D100=63/100 成功" } },
    }))).toBe("D100=63/100 成功");
  });

  it("diceTurn 暗骰预览默认显示指令，授权后显示回复", () => {
    const message = createMessage({
      content: ".r 1d20",
      messageType: MESSAGE_TYPE.DICE,
      extra: {
        diceTurn: {
          command: ".r 1d20",
          replies: [{ content: "D20=19", hidden: true }],
        },
      },
    });

    expect(getMessagePreviewText(message)).toBe(".r 1d20");
    expect(getMessagePreviewText(message, { canViewHiddenDiceReply: true })).toBe("D20=19");
  });

  it("支持房间跳转和文档卡片", () => {
    expect(getMessagePreviewText(createMessage({
      messageType: MESSAGE_TYPE.ROOM_JUMP,
      extra: { roomJump: { roomId: 9, label: "作战频道" } },
    }))).toBe("[群聊] 作战频道");

    expect(getMessagePreviewText(createMessage({
      messageType: MESSAGE_TYPE.DOC_CARD,
      extra: { docCard: { title: "调查笔记" } },
    }))).toBe("[文档] 调查笔记");
  });

  it("为戳一戳消息增加稳定预览前缀", () => {
    expect(getMessagePreviewText(createMessage({
      content: "@爱丽丝 戳了戳 @鲍勃",
      messageType: MESSAGE_TYPE.POKE,
      extra: { poke: { targetRoleId: 9 } },
    }))).toBe("[戳一戳] @爱丽丝 戳了戳 @鲍勃");
  });
});
