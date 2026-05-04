import { describe, expect, it } from "vitest";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { Message } from "../../../../../api";

import {
  isImageMessageMarkedAsBackground,
  isSoundMessageMarkedAsBgm,
  toggleImageMessageBackground,
  toggleSoundMessageBgm,
} from "./messageMediaQuickActions";

function createImageMessage(partial?: Partial<Message>): Message {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 1,
    userId: 1,
    roleId: 1,
    avatarId: 1,
    content: "image",
    status: 0,
    messageType: MESSAGE_TYPE.IMG,
    position: 1,
    annotations: [],
    extra: {
      imageMessage: {
        url: "https://static.example.com/bg.webp",
        fileName: "bg.webp",
        width: 1920,
        height: 1080,
        size: 2048,
        background: false,
      },
    },
    ...partial,
  };
}

function createSoundMessage(partial?: Partial<Message>): Message {
  return {
    messageId: 2,
    syncId: 2,
    roomId: 1,
    userId: 1,
    roleId: 1,
    avatarId: 1,
    content: "audio",
    status: 0,
    messageType: MESSAGE_TYPE.SOUND,
    position: 2,
    annotations: [],
    extra: {
      soundMessage: {
        url: "https://static.example.com/bgm.mp3",
        fileName: "bgm.mp3",
        size: 4096,
        second: 10,
      },
    },
    ...partial,
  };
}

describe("messageMediaQuickActions", () => {
  it("图片快捷操作可切换为背景消息", () => {
    const next = toggleImageMessageBackground(createImageMessage());

    expect(next?.extra?.imageMessage?.background).toBe(true);
    expect(next?.annotations).toContain(ANNOTATION_IDS.BACKGROUND);
    expect(isImageMessageMarkedAsBackground(next)).toBe(true);
  });

  it("图片快捷操作可取消背景消息", () => {
    const next = toggleImageMessageBackground(createImageMessage({
      annotations: [ANNOTATION_IDS.BACKGROUND],
      extra: {
        imageMessage: {
          url: "https://static.example.com/bg.webp",
          fileName: "bg.webp",
          width: 1920,
          height: 1080,
          size: 2048,
          background: true,
        },
      },
    }));

    expect(next?.extra?.imageMessage?.background).toBe(false);
    expect(next?.annotations).not.toContain(ANNOTATION_IDS.BACKGROUND);
    expect(isImageMessageMarkedAsBackground(next)).toBe(false);
  });

  it("音频快捷操作可切换为 BGM 并移除音效标注", () => {
    const next = toggleSoundMessageBgm(createSoundMessage({
      annotations: [ANNOTATION_IDS.SE],
      extra: {
        soundMessage: {
          url: "https://static.example.com/bgm.mp3",
          fileName: "bgm.mp3",
          size: 4096,
          second: 10,
          purpose: "se",
        },
      },
    }));

    expect(next?.annotations).toContain(ANNOTATION_IDS.BGM);
    expect(next?.annotations).not.toContain(ANNOTATION_IDS.SE);
    expect(next?.extra?.soundMessage?.purpose).toBe("bgm");
    expect(isSoundMessageMarkedAsBgm(next)).toBe(true);
  });

  it("音频快捷操作可取消 BGM purpose", () => {
    const next = toggleSoundMessageBgm(createSoundMessage({
      extra: {
        soundMessage: {
          url: "https://static.example.com/bgm.mp3",
          fileName: "bgm.mp3",
          size: 4096,
          second: 10,
          purpose: "bgm",
        },
      },
    }));

    expect(next?.annotations).not.toContain(ANNOTATION_IDS.BGM);
    expect(next?.extra?.soundMessage?.purpose).toBeUndefined();
    expect(next?.content).toBe("audio");
    expect(isSoundMessageMarkedAsBgm(next)).toBe(false);
  });
});
