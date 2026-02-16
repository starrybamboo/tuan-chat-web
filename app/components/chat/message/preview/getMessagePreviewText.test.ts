import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { Message } from "../../../../../api";
import { getMessagePreviewText } from "./getMessagePreviewText";

function createBaseMessage(overrides: Partial<Message>): Message {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 1,
    userId: 1,
    content: "",
    status: 0,
    messageType: MESSAGE_TYPE.TEXT,
    position: 0,
    ...overrides,
  };
}

describe("getMessagePreviewText", () => {
  it("空消息返回加载中", () => {
    expect(getMessagePreviewText(undefined)).toBe("加载中...");
  });

  it("已删除消息返回删除提示", () => {
    const msg = createBaseMessage({ status: 1, content: "hi" });
    expect(getMessagePreviewText(msg)).toBe("[原消息已被删除]");
  });

  it("文本/黑屏文字返回原内容", () => {
    const text = createBaseMessage({ messageType: MESSAGE_TYPE.TEXT, content: "hello" });
    const intro = createBaseMessage({ messageType: MESSAGE_TYPE.INTRO_TEXT, content: "intro" });
    expect(getMessagePreviewText(text)).toBe("hello");
    expect(getMessagePreviewText(intro)).toBe("intro");
  });

  it("检定请求显示指令文本", () => {
    const msg = createBaseMessage({
      messageType: MESSAGE_TYPE.COMMAND_REQUEST,
      content: "",
      extra: { commandRequest: { command: ".rc 射击" } } as any,
    });
    expect(getMessagePreviewText(msg)).toBe("[检定请求] .rc 射击");
  });

  it("骰娘消息优先使用 diceResult.result", () => {
    const msg = createBaseMessage({
      messageType: MESSAGE_TYPE.DICE,
      content: "fallback",
      extra: { diceResult: { result: "D100=63/100 成功" } } as any,
    });
    expect(getMessagePreviewText(msg)).toBe("[骰娘] D100=63/100 成功");
  });

  it("图片消息显示文件名（不区分背景）", () => {
    const img = createBaseMessage({
      messageType: MESSAGE_TYPE.IMG,
      extra: { imageMessage: { fileName: "a.png", background: false } } as any,
    });
    const bg = createBaseMessage({
      messageType: MESSAGE_TYPE.IMG,
      extra: { imageMessage: { fileName: "bg.jpg", background: true } } as any,
    });
    expect(getMessagePreviewText(img)).toBe("[图片] a.png");
    expect(getMessagePreviewText(bg)).toBe("[图片] bg.jpg");
  });

  it("图片消息遇到疑似哈希文件名时只显示类型标签", () => {
    const msg = createBaseMessage({
      messageType: MESSAGE_TYPE.IMG,
      extra: {
        imageMessage: {
          fileName: "1b49d9c3af4decd18dd3c3b84000d932699708.jpg",
          background: true,
        },
      } as any,
    });
    expect(getMessagePreviewText(msg)).toBe("[图片]");
  });

  it("视频消息显示文件名", () => {
    const msg = createBaseMessage({
      messageType: MESSAGE_TYPE.VIDEO,
      extra: { videoMessage: { fileName: "clip.webm" } } as any,
    });
    expect(getMessagePreviewText(msg)).toBe("[视频] clip.webm");
  });

  it("WebGAL 指令消息自动补全 % 前缀", () => {
    const msg = createBaseMessage({
      messageType: MESSAGE_TYPE.WEBGAL_COMMAND,
      content: "bgm:1",
    });
    expect(getMessagePreviewText(msg)).toBe("[WebGAL] %bgm:1");
  });

  it("未知类型优先返回 content", () => {
    const msg = createBaseMessage({
      messageType: 999999,
      content: "几乎就是文本消息",
    });
    expect(getMessagePreviewText(msg)).toBe("几乎就是文本消息");
  });
});
