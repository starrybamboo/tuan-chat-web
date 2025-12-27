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

  setReplyMessage: (message: Message | undefined) => void;
  setThreadRootMessageId: (messageId: number | undefined) => void;
  setInsertAfterMessageId: (messageId: number | undefined) => void;

  setComposerTarget: (target: "main" | "thread") => void;

  /** 切换房间时重置临时 UI 状态 */
  reset: () => void;
};

export const useRoomUiStore = create<RoomUiState>(set => ({
  replyMessage: undefined,
  threadRootMessageId: undefined,
  composerTarget: "main",
  insertAfterMessageId: undefined,
  setReplyMessage: message => set({ replyMessage: message }),
  setThreadRootMessageId: messageId => set({ threadRootMessageId: messageId }),
  setInsertAfterMessageId: messageId => set({ insertAfterMessageId: messageId }),
  setComposerTarget: target => set({ composerTarget: target }),
  reset: () => set({ replyMessage: undefined, threadRootMessageId: undefined, composerTarget: "main", insertAfterMessageId: undefined }),
}));
