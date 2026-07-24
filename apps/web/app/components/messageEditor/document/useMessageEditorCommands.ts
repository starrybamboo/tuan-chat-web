import type { RefObject } from "react";

import { useEffect, useRef } from "react";

import type { MessageEditorRegistry } from "../messageEditorRegistry";
import type { MessageEditorMessage } from "../messageEditorTypes";
import type { MessageEditorCommands } from "./messageEditorCommands";
import type { MessageEditorHistoryEntry, MessageEditorHistoryManager } from "./messageEditorHistoryManager";

import { createMessageEditorCommands } from "./messageEditorCommands";

type UseMessageEditorCommandsParams = {
  createHistoryEntry: (messages: MessageEditorMessage[]) => MessageEditorHistoryEntry;
  getMessages: () => MessageEditorMessage[];
  historyManager: MessageEditorHistoryManager;
  registry: MessageEditorRegistry;
};

/**
 * 将当前消息快照与文档命令绑定。
 *
 * 命令始终通过 getMessages 读取最新受控消息，React 组件无需维护第二份文档状态。
 */
export function useMessageEditorCommands({
  createHistoryEntry,
  getMessages,
  historyManager,
  registry,
}: UseMessageEditorCommandsParams): RefObject<MessageEditorCommands | null> {
  const commandsRef = useRef<MessageEditorCommands | null>(null);

  useEffect(() => {
    commandsRef.current = createMessageEditorCommands({
      createHistoryEntry,
      getMessages,
      historyManager,
      registry,
    });
  }, [createHistoryEntry, getMessages, historyManager, registry]);

  return commandsRef;
}
