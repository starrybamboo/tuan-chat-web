import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { MessageEditorMessage } from "../messageEditorTypes";

import { isMessageEditorTextMessage } from "../model/messageEditorTransforms";

/**
 * editor 内块 driver 的粗粒度类别。
 */
export type MessageEditorBlockDriverKind = "text" | "atomic" | "stub";

/**
 * 单个块 driver 的描述信息。
 */
export type MessageEditorBlockDriver = {
  kind: MessageEditorBlockDriverKind;
  key: string;
  label: string;
  matches: (message: MessageEditorMessage) => boolean;
};

const TEXT_DRIVER: MessageEditorBlockDriver = {
  key: "text",
  kind: "text",
  label: "文本",
  matches: message => isMessageEditorTextMessage(message),
};

const ATOMIC_DRIVERS: MessageEditorBlockDriver[] = [
  {
    key: "image",
    kind: "atomic",
    label: "图片",
    matches: message => message.messageType === MESSAGE_TYPE.IMG,
  },
  {
    key: "sound",
    kind: "atomic",
    label: "音频",
    matches: message => message.messageType === MESSAGE_TYPE.SOUND,
  },
  {
    key: "video",
    kind: "atomic",
    label: "视频",
    matches: message => message.messageType === MESSAGE_TYPE.VIDEO,
  },
  {
    key: "doc-card",
    kind: "atomic",
    label: "文档",
    matches: message => message.messageType === MESSAGE_TYPE.DOC_CARD,
  },
  {
    key: "room-jump",
    kind: "atomic",
    label: "房间跳转",
    matches: message => message.messageType === MESSAGE_TYPE.ROOM_JUMP,
  },
  {
    key: "webgal-choose",
    kind: "atomic",
    label: "选项",
    matches: message => message.messageType === MESSAGE_TYPE.WEBGAL_CHOOSE,
  },
];

const STUB_DRIVER: MessageEditorBlockDriver = {
  key: "stub",
  kind: "stub",
  label: "未知块",
  matches: () => true,
};

/**
 * message editor 的 block registry。
 */
export type MessageEditorRegistry = {
  resolve: (message: MessageEditorMessage) => MessageEditorBlockDriver;
  isTextBlock: (message: MessageEditorMessage) => boolean;
};

/**
 * 创建默认 block registry。
 */
export function createMessageEditorRegistry(): MessageEditorRegistry {
  const drivers = [TEXT_DRIVER, ...ATOMIC_DRIVERS, STUB_DRIVER];

  return {
    resolve(message) {
      return drivers.find(driver => driver.matches(message)) ?? STUB_DRIVER;
    },
    isTextBlock(message) {
      return TEXT_DRIVER.matches(message);
    },
  };
}
