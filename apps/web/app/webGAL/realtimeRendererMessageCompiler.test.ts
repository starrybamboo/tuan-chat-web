import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../api";
import type { RealtimeRenderMessageCompilerInput } from "./realtimeRendererMessageCompiler";

import {
  compileRealtimeRenderMessageLines,

} from "./realtimeRendererMessageCompiler";

function createMessage(overrides: Partial<ChatMessageResponse["message"]> = {}): ChatMessageResponse["message"] {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 1,
    userId: 1,
    roleId: 1,
    content: "",
    status: 0,
    messageType: MESSAGE_TYPE.TEXT,
    position: 1,
    annotations: [],
    extra: {},
    ...overrides,
  } as ChatMessageResponse["message"];
}

function createInput(overrides: Partial<RealtimeRenderMessageCompilerInput> = {}): RealtimeRenderMessageCompilerInput {
  const message = overrides.message ?? createMessage();
  return {
    roleName: "明日香",
    roleId: 1,
    processedContent: "你好",
    renderContent: "你好",
    isNarrator: false,
    isIntroText: false,
    isDiceMessage: false,
    diceRenderMode: null,
    diceContent: "",
    dicePayload: null,
    hasDiceScriptLines: false,
    dialogNext: false,
    dialogNotend: false,
    dialogConcat: false,
    introHold: false,
    dialogFigureIdPart: "",
    shouldClearBackground: false,
    isBackgroundImageMessage: false,
    shouldClearBgm: false,
    shouldClearImageFigure: false,
    shouldClearFigure: false,
    miniAvatarVisibleBefore: false,
    forceMiniAvatar: false,
    ...overrides,
    message,
  };
}

describe("compileRealtimeRenderMessageLines", () => {
  it("编译普通对话时会保留语音、立绘和对话参数", () => {
    const lines = compileRealtimeRenderMessageLines(createInput({
      processedContent: "你好",
      vocalPart: " -voice.ogg",
      dialogFigureIdPart: " -figureId=left",
      dialogNotend: true,
      dialogConcat: true,
      dialogNext: true,
    }));

    expect(lines).toEqual([
      "明日香: 你好 -voice.ogg -figureId=left -notend -concat -next;",
    ]);
  });

  it("语音消息（SOUND）作为带配音的角色台词渲染", () => {
    const lines = compileRealtimeRenderMessageLines(createInput({
      message: createMessage({ messageType: MESSAGE_TYPE.SOUND, content: "我来了" }),
      isVoiceMessage: true,
      processedContent: "我来了",
      vocalPart: " -vocal=voice_abc.mp3",
    }));

    expect(lines).toEqual([
      "明日香: 我来了 -vocal=voice_abc.mp3;",
    ]);
  });

  it("语音消息（SOUND）作为旁白时渲染带配音的旁白行", () => {
    const lines = compileRealtimeRenderMessageLines(createInput({
      message: createMessage({ messageType: MESSAGE_TYPE.SOUND, roleId: 0, content: "远处传来脚步声" }),
      isVoiceMessage: true,
      isNarrator: true,
      roleId: 0,
      processedContent: "远处传来脚步声",
      vocalPart: " -vocal=voice_def.mp3",
    }));

    expect(lines).toEqual([
      ":远处传来脚步声 -vocal=voice_def.mp3;",
    ]);
  });

  it("语音消息无配音时仍渲染台词，只是不挂 -vocal", () => {
    const lines = compileRealtimeRenderMessageLines(createInput({
      message: createMessage({ messageType: MESSAGE_TYPE.SOUND, content: "我来了" }),
      isVoiceMessage: true,
      processedContent: "我来了",
      vocalPart: "",
    }));

    expect(lines).toEqual([
      "明日香: 我来了;",
    ]);
  });

  it("语音消息内容为空时不产出对话行", () => {
    const lines = compileRealtimeRenderMessageLines(createInput({
      message: createMessage({ messageType: MESSAGE_TYPE.SOUND, content: "" }),
      isVoiceMessage: true,
      processedContent: "",
      vocalPart: " -vocal=voice_abc.mp3",
    }));

    expect(lines).toEqual([]);
  });

  it("非语音的 SOUND 消息（bgm）仍只输出音频行", () => {
    const lines = compileRealtimeRenderMessageLines(createInput({
      message: createMessage({ messageType: MESSAGE_TYPE.SOUND, content: "" }),
      isVoiceMessage: false,
      bgmLine: "bgm:battle.mp3 -next;",
    }));

    expect(lines).toEqual([
      "bgm:battle.mp3 -next;",
    ]);
  });

  it("编译黑屏文字时会输出 intro 指令", () => {
    const lines = compileRealtimeRenderMessageLines(createInput({
      message: createMessage({ messageType: MESSAGE_TYPE.INTRO_TEXT }),
      isIntroText: true,
      processedContent: "序章 开始",
      introHold: true,
    }));

    expect(lines).toEqual([
      "intro:序章|开始 -hold;",
    ]);
  });

  it("编译 script 骰子时会先输出音效再输出脚本行", () => {
    const lines = compileRealtimeRenderMessageLines(createInput({
      message: createMessage({ messageType: MESSAGE_TYPE.DICE }),
      isDiceMessage: true,
      diceRenderMode: "script",
      hasDiceScriptLines: true,
      dicePayload: {
        sound: true,
        lines: [
          "pixiPerform:effect.customDice -once -next;",
          "dice:掷出了 42 -mode=script;",
        ],
      } as unknown as NonNullable<RealtimeRenderMessageCompilerInput["dicePayload"]>,
      soundLine: "playEffect:./game/vocal/dice.wav -next;",
    }));

    expect(lines).toEqual([
      "playEffect:./game/vocal/dice.wav -next;",
      "pixiPerform:effect.customDice -once -next;",
      "dice:掷出了 42 -mode=script;",
    ]);
  });
});
