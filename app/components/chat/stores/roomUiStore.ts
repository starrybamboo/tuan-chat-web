import { create } from "zustand";

import type { Message } from "api";

type RoomUiState = {
  /** 当前回复的消息（仅用于当前房间的 UI 交互） */
  replyMessage?: Message;

  /** 当前正在查看/回复的消息 Thread（root messageId） */
  threadRootMessageId?: number;

  /** 输入框发送目标：主区 or Thread 子区 */
  composerTarget: "main" | "thread";

  /** 插入消息模式：在指定消息下方插入下一条发送的消息 */
  insertAfterMessageId?: number;
  isAvatarSamplerActive: boolean;
  isMultiSelecting: boolean;

  setReplyMessage: (message: Message | undefined) => void;
  setThreadRootMessageId: (messageId: number | undefined) => void;
  setInsertAfterMessageId: (messageId: number | undefined) => void;
  setAvatarSamplerActive: (active: boolean) => void;
  setMultiSelecting: (active: boolean) => void;

  setComposerTarget: (target: "main" | "thread") => void;

  /** 切换房间时重置临时 UI ״̬ */
  reset: () => void;
};

export const useRoomUiStore = create<RoomUiState>(set => ({
  replyMessage: undefined,
  threadRootMessageId: undefined,
  composerTarget: "main",
  insertAfterMessageId: undefined,
  isAvatarSamplerActive: false,
  isMultiSelecting: false,
  setReplyMessage: message => set(state => (state.replyMessage === message ? state : { replyMessage: message })),
  setThreadRootMessageId: messageId => set(state => (state.threadRootMessageId === messageId ? state : { threadRootMessageId: messageId })),
  setInsertAfterMessageId: messageId => set(state => (state.insertAfterMessageId === messageId ? state : { insertAfterMessageId: messageId })),
  setComposerTarget: target => set(state => (state.composerTarget === target ? state : { composerTarget: target })),
  setAvatarSamplerActive: active => set(state => (state.isAvatarSamplerActive === active ? state : { isAvatarSamplerActive: active })),
  setMultiSelecting: active => set(state => (state.isMultiSelecting === active ? state : { isMultiSelecting: active })),
  reset: () => set(state => (
    state.replyMessage === undefined
    && state.threadRootMessageId === undefined
    && state.composerTarget === "main"
    && state.insertAfterMessageId === undefined
    && state.isAvatarSamplerActive === false
    && state.isMultiSelecting === false
      ? state
      : {
          replyMessage: undefined,
          threadRootMessageId: undefined,
          composerTarget: "main",
          insertAfterMessageId: undefined,
          isAvatarSamplerActive: false,
          isMultiSelecting: false,
        }
  )),
}));
