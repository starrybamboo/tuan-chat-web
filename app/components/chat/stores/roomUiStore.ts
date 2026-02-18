import React from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import type { Message } from "api";

export type MessageUndoAction
  = | { type: "send"; after: Message }
    | { type: "delete"; before: Message }
    | { type: "update"; before: Message; after: Message };

const MAX_MESSAGE_UNDO_STACK_SIZE = 100;

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
  messageUndoStack: MessageUndoAction[];
  messageRedoStack: MessageUndoAction[];
  isApplyingMessageUndo: boolean;

  setReplyMessage: (message: Message | undefined) => void;
  setThreadRootMessageId: (messageId: number | undefined) => void;
  setInsertAfterMessageId: (messageId: number | undefined) => void;
  setAvatarSamplerActive: (active: boolean) => void;
  setMultiSelecting: (active: boolean) => void;
  pushMessageUndo: (action: MessageUndoAction) => void;
  popMessageUndo: () => MessageUndoAction | undefined;
  restoreMessageUndo: (action: MessageUndoAction) => void;
  popMessageRedo: () => MessageUndoAction | undefined;
  restoreMessageRedo: (action: MessageUndoAction) => void;
  clearMessageUndo: () => void;
  clearMessageRedo: () => void;
  setApplyingMessageUndo: (active: boolean) => void;

  setComposerTarget: (target: "main" | "thread") => void;

  /** 切换房间时重置临时 UI 状态 */
  reset: () => void;
};

export type RoomUiStoreApi = ReturnType<typeof createRoomUiStore>;

export function createRoomUiStore() {
  return createStore<RoomUiState>((set, get) => ({
    replyMessage: undefined,
    threadRootMessageId: undefined,
    composerTarget: "main",
    insertAfterMessageId: undefined,
    isAvatarSamplerActive: false,
    isMultiSelecting: false,
    messageUndoStack: [],
    messageRedoStack: [],
    isApplyingMessageUndo: false,
    setReplyMessage: message => set(state => (state.replyMessage === message ? state : { replyMessage: message })),
    setThreadRootMessageId: messageId => set(state => (state.threadRootMessageId === messageId ? state : { threadRootMessageId: messageId })),
    setInsertAfterMessageId: messageId => set(state => (state.insertAfterMessageId === messageId ? state : { insertAfterMessageId: messageId })),
    setComposerTarget: target => set(state => (state.composerTarget === target ? state : { composerTarget: target })),
    setAvatarSamplerActive: active => set(state => (state.isAvatarSamplerActive === active ? state : { isAvatarSamplerActive: active })),
    setMultiSelecting: active => set(state => (state.isMultiSelecting === active ? state : { isMultiSelecting: active })),
    pushMessageUndo: (action) => {
      if (get().isApplyingMessageUndo) {
        return;
      }
      set((state) => {
        const nextStack = [...state.messageUndoStack, action];
        return {
          messageUndoStack: nextStack.length > MAX_MESSAGE_UNDO_STACK_SIZE
            ? nextStack.slice(nextStack.length - MAX_MESSAGE_UNDO_STACK_SIZE)
            : nextStack,
          messageRedoStack: [],
        };
      });
    },
    popMessageUndo: () => {
      const stack = get().messageUndoStack;
      if (stack.length === 0) {
        return undefined;
      }
      const action = stack[stack.length - 1];
      set({ messageUndoStack: stack.slice(0, -1) });
      return action;
    },
    restoreMessageUndo: (action) => {
      set(state => ({
        messageUndoStack: [...state.messageUndoStack, action],
      }));
    },
    popMessageRedo: () => {
      const stack = get().messageRedoStack;
      if (stack.length === 0) {
        return undefined;
      }
      const action = stack[stack.length - 1];
      set({ messageRedoStack: stack.slice(0, -1) });
      return action;
    },
    restoreMessageRedo: (action) => {
      set(state => ({
        messageRedoStack: [...state.messageRedoStack, action],
      }));
    },
    clearMessageUndo: () => set(state => (state.messageUndoStack.length === 0 ? state : { messageUndoStack: [] })),
    clearMessageRedo: () => set(state => (state.messageRedoStack.length === 0 ? state : { messageRedoStack: [] })),
    setApplyingMessageUndo: active => set(state => (state.isApplyingMessageUndo === active ? state : { isApplyingMessageUndo: active })),
    reset: () => set(state => (
      state.replyMessage === undefined
      && state.threadRootMessageId === undefined
      && state.composerTarget === "main"
      && state.insertAfterMessageId === undefined
      && state.isAvatarSamplerActive === false
      && state.isMultiSelecting === false
      && state.messageUndoStack.length === 0
      && state.messageRedoStack.length === 0
      && state.isApplyingMessageUndo === false
        ? state
        : {
            replyMessage: undefined,
            threadRootMessageId: undefined,
            composerTarget: "main",
            insertAfterMessageId: undefined,
            isAvatarSamplerActive: false,
            isMultiSelecting: false,
            messageUndoStack: [],
            messageRedoStack: [],
            isApplyingMessageUndo: false,
          }
    )),
  }));
}

const defaultRoomUiStore = createRoomUiStore();
const RoomUiStoreContext = React.createContext<RoomUiStoreApi | null>(null);

export function RoomUiStoreProvider({ store, children }: { store: RoomUiStoreApi; children: React.ReactNode }) {
  return React.createElement(RoomUiStoreContext.Provider, { value: store }, children);
}

export function useRoomUiStoreApi(): RoomUiStoreApi {
  return React.use(RoomUiStoreContext) ?? defaultRoomUiStore;
}

export function useRoomUiStore<T>(selector: (state: RoomUiState) => T): T {
  const store = useRoomUiStoreApi();
  return useStore(store, selector);
}
