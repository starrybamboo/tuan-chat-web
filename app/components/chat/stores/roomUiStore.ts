import { create } from "zustand";

import type { Message } from "api";

type RoomUiState = {
  /** 当前回复的消息（仅用于当前房间的 UI 交互） */
  replyMessage?: Message;

  /** 插入消息模式：在指定消息下方插入下一条发送的消息 */
  insertAfterMessageId?: number;

  setReplyMessage: (message: Message | undefined) => void;
  setInsertAfterMessageId: (messageId: number | undefined) => void;

  /** 切换房间时重置临时 UI 状态 */
  reset: () => void;
};

export const useRoomUiStore = create<RoomUiState>(set => ({
  replyMessage: undefined,
  insertAfterMessageId: undefined,
  setReplyMessage: message => set({ replyMessage: message }),
  setInsertAfterMessageId: messageId => set({ insertAfterMessageId: messageId }),
  reset: () => set({ replyMessage: undefined, insertAfterMessageId: undefined }),
}));
