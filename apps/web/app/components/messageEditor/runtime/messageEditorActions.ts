import type { MessageEditorMessage } from "../messageEditorTypes";
import type {
  MessageEditorInsertBlockResult,
  MessageEditorSelectionTextResult,
} from "../model/messageEditorTextTransforms";
import type {
  MessageEditorInsertableBlockKind,
  MessageEditorUploadedMediaPayload,
} from "../model/messageEditorTransforms";
import type {
  MessageEditorHistoryEntry,
  MessageEditorHistoryManager,
} from "./messageEditorHistoryManager";
import type { MessageEditorRegistry } from "./messageEditorRegistry";
import type { MessageEditorSelection } from "./messageEditorSelection";
import type {
  MessageEditorMutationKind,
  MessageEditorMutationPlan,
  MessageEditorTransactionPlanner,
} from "./messageEditorTransactionPlanner";

import {
  setMessageEditorSpeakerMetadata,
  setMessageEditorUploadedMedia,
  updateMessageEditorMediaSize,
  updateMessageEditorTextContent,
} from "../model/messageEditorTransforms";
import { createMessageEditorTransactionPlanner } from "./messageEditorTransactionPlanner";

export type MessageEditorEditActionKind
  = | "append-paragraph"
    | "apply-text-style"
    | "assign-speaker"
    | "create-paragraph"
    | "delete-block"
    | "edit-selection"
    | "input-text"
    | "insert-block"
    | "insert-media"
    | "join-next-paragraph"
    | "join-previous-paragraph"
    | "paste-content"
    | "reorder-block"
    | "replace-media"
    | "resize-media"
    | "select-speaker-avatar";

export type MessageEditorHistoryActionKind = "redo" | "undo";

export type MessageEditorActionKind = MessageEditorEditActionKind | MessageEditorHistoryActionKind;

/** 用户操作解析完成后交给消息 mutation 门面的同步事务。 */
export type MessageEditorEditTransaction<TResult = unknown> = {
  action: MessageEditorEditActionKind;
  changed: boolean;
  changedBlockIds: string[];
  historyGroupKey: string | null;
  historyKind: "default" | "typing";
  messages: MessageEditorMessage[];
  mutation: MessageEditorMutationKind;
  result: TResult;
  structureChanged: boolean;
};

export type MessageEditorHistoryTransaction = {
  action: MessageEditorHistoryActionKind;
  entry: MessageEditorHistoryEntry;
};

type MessageEditorActionsParams = {
  createHistoryEntry: (messages: MessageEditorMessage[]) => MessageEditorHistoryEntry;
  getMessages: () => MessageEditorMessage[];
  historyManager: MessageEditorHistoryManager;
  registry: MessageEditorRegistry;
};

type MessageEditorFocusResult = { blockId: string; caret: number } | null;

export type MessageEditorActions = {
  appendParagraph: () => MessageEditorEditTransaction<MessageEditorFocusResult>;
  applyTextStyle: (
    selection: MessageEditorSelection,
    params: {
      replacement: string;
      selectedText: string;
      transform?: (selectedPart: string) => string;
    },
  ) => MessageEditorEditTransaction<MessageEditorSelectionTextResult> | null;
  assignSpeaker: (params: {
    avatarId?: number;
    blockId: string;
    content: string;
    roleId?: number;
  }) => MessageEditorEditTransaction<void>;
  createParagraph: (
    selection: MessageEditorSelection,
  ) => MessageEditorEditTransaction<MessageEditorFocusResult> | null;
  deleteBlock: (blockId: string) => MessageEditorEditTransaction<MessageEditorFocusResult> | null;
  editSelection: (
    selection: MessageEditorSelection,
    replacement: string,
  ) => MessageEditorEditTransaction<MessageEditorSelectionTextResult> | null;
  inputText: (blockId: string, nextContent: string) => MessageEditorEditTransaction<void>;
  insertBlock: (
    blockId: string,
    kind: MessageEditorInsertableBlockKind,
  ) => MessageEditorEditTransaction<MessageEditorFocusResult> | null;
  insertMedia: (
    selection: MessageEditorSelection,
    kind: MessageEditorInsertableBlockKind,
    options?: { createTrailingTextBlock?: boolean },
  ) => MessageEditorEditTransaction<MessageEditorInsertBlockResult> | null;
  joinNextParagraph: (blockId: string) => MessageEditorEditTransaction<MessageEditorFocusResult> | null;
  joinPreviousParagraph: (blockId: string) => MessageEditorEditTransaction<MessageEditorFocusResult> | null;
  pasteContent: (
    selection: MessageEditorSelection,
    content: string,
  ) => MessageEditorEditTransaction<MessageEditorSelectionTextResult> | null;
  reorderBlock: (blockId: string, targetIndex: number) => MessageEditorEditTransaction<void>;
  replaceMedia: (
    blockId: string,
    payload: MessageEditorUploadedMediaPayload,
  ) => MessageEditorEditTransaction<void>;
  resizeMedia: (
    blockId: string,
    size: { height: number; width: number },
  ) => MessageEditorEditTransaction<void>;
  redo: () => MessageEditorHistoryTransaction | null;
  selectSpeakerAvatar: (params: {
    avatarId?: number;
    blockId: string;
    clearSpeaker: boolean;
    content: string;
    roleId: number;
  }) => MessageEditorEditTransaction<void>;
  undo: () => MessageEditorHistoryTransaction | null;
};

function parseWholeTextEnhanceReplacement(replacement: string, selectedText: string): string | null {
  if (!selectedText) {
    return null;
  }

  const prefix = `[${selectedText}](`;
  if (!replacement.startsWith(prefix) || !replacement.endsWith(")")) {
    return null;
  }

  return replacement.slice(prefix.length, -1);
}

/**
 * 面向用户意图的 MessageEditor 操作集合。
 *
 * UI 只声明“新建段落、粘贴内容、选择角色”等动作；该对象负责把动作翻译为
 * 内部消息变换计划，再补齐 history 与 action 标签形成可提交事务。
 */
class MessageEditorDocumentActions implements MessageEditorActions {
  private readonly createHistoryEntry: MessageEditorActionsParams["createHistoryEntry"];
  private readonly getMessages: MessageEditorActionsParams["getMessages"];
  private readonly historyManager: MessageEditorHistoryManager;
  private readonly planner: MessageEditorTransactionPlanner;

  constructor(params: MessageEditorActionsParams) {
    this.createHistoryEntry = params.createHistoryEntry;
    this.getMessages = params.getMessages;
    this.historyManager = params.historyManager;
    this.planner = createMessageEditorTransactionPlanner(params);
  }

  appendParagraph() {
    return this.createTransaction("append-paragraph", this.planner.ensureTrailingTextBlock());
  }

  applyTextStyle(
    selection: MessageEditorSelection,
    params: {
      replacement: string;
      selectedText: string;
      transform?: (selectedPart: string) => string;
    },
  ) {
    if (params.transform) {
      return this.createOptionalTransaction(
        "apply-text-style",
        this.planner.transformSelectionText(selection, params.transform),
      );
    }

    const textEnhanceParams = parseWholeTextEnhanceReplacement(params.replacement, params.selectedText);
    const plan = textEnhanceParams
      ? this.planner.transformSelectionText(
          selection,
          selectedPart => `[${selectedPart}](${textEnhanceParams})`,
        )
      : this.planner.replaceSelectionText(selection, params.replacement);
    return this.createOptionalTransaction("apply-text-style", plan);
  }

  assignSpeaker(params: {
    avatarId?: number;
    blockId: string;
    content: string;
    roleId?: number;
  }) {
    const plan = this.planner.updateBlock(params.blockId, (current) => {
      const nextMessage = typeof params.roleId === "number"
        ? setMessageEditorSpeakerMetadata(current, {
            avatarId: params.avatarId,
            customRoleName: undefined,
            roleId: params.roleId,
          })
        : current;
      return updateMessageEditorTextContent(nextMessage, params.content);
    });
    return this.createTransaction("assign-speaker", plan);
  }

  createParagraph(selection: MessageEditorSelection) {
    return this.createOptionalTransaction("create-paragraph", this.planner.splitAtSelection(selection));
  }

  deleteBlock(blockId: string) {
    return this.createOptionalTransaction("delete-block", this.planner.removeBlock(blockId));
  }

  editSelection(selection: MessageEditorSelection, replacement: string) {
    return this.createOptionalTransaction(
      "edit-selection",
      this.planner.replaceSelectionText(selection, replacement),
    );
  }

  inputText(blockId: string, nextContent: string) {
    return this.createTransaction(
      "input-text",
      this.planner.updateTextContent(blockId, nextContent),
      "typing",
      blockId,
    );
  }

  insertBlock(blockId: string, kind: MessageEditorInsertableBlockKind) {
    return this.createOptionalTransaction("insert-block", this.planner.replaceBlockWithKind(blockId, kind));
  }

  insertMedia(
    selection: MessageEditorSelection,
    kind: MessageEditorInsertableBlockKind,
    options: { createTrailingTextBlock?: boolean } = {},
  ) {
    return this.createOptionalTransaction("insert-media", this.planner.insertBlockAtSelection(selection, kind, options));
  }

  joinNextParagraph(blockId: string) {
    return this.createOptionalTransaction("join-next-paragraph", this.planner.mergeForward(blockId));
  }

  joinPreviousParagraph(blockId: string) {
    return this.createOptionalTransaction("join-previous-paragraph", this.planner.mergeBackward(blockId));
  }

  pasteContent(selection: MessageEditorSelection, content: string) {
    return this.createOptionalTransaction(
      "paste-content",
      this.planner.replaceSelectionTextAsBlocks(selection, content),
    );
  }

  reorderBlock(blockId: string, targetIndex: number) {
    return this.createTransaction("reorder-block", this.planner.moveBlockToIndex(blockId, targetIndex));
  }

  replaceMedia(blockId: string, payload: MessageEditorUploadedMediaPayload) {
    return this.createTransaction(
      "replace-media",
      this.planner.updateBlock(blockId, message => setMessageEditorUploadedMedia(message, payload)),
    );
  }

  resizeMedia(blockId: string, size: { height: number; width: number }) {
    return this.createTransaction(
      "resize-media",
      this.planner.updateBlock(blockId, message => updateMessageEditorMediaSize(message, size)),
    );
  }

  redo() {
    return this.createHistoryTransaction("redo");
  }

  selectSpeakerAvatar(params: {
    avatarId?: number;
    blockId: string;
    clearSpeaker: boolean;
    content: string;
    roleId: number;
  }) {
    const plan = this.planner.updateBlock(params.blockId, (current) => {
      if (typeof params.avatarId !== "number") {
        const nextMessage = setMessageEditorSpeakerMetadata(current, {
          avatarId: undefined,
          customRoleName: params.clearSpeaker ? undefined : current.customRoleName ?? undefined,
          roleId: params.clearSpeaker ? undefined : current.roleId ?? params.roleId,
        });
        return params.clearSpeaker
          ? updateMessageEditorTextContent(nextMessage, params.content)
          : nextMessage;
      }
      return setMessageEditorSpeakerMetadata(current, {
        avatarId: params.avatarId,
        customRoleName: current.customRoleName ?? undefined,
        roleId: current.roleId ?? params.roleId,
      });
    });
    return this.createTransaction("select-speaker-avatar", plan);
  }

  undo() {
    return this.createHistoryTransaction("undo");
  }

  private createHistoryTransaction(action: MessageEditorHistoryActionKind) {
    const entry = this.historyManager.restore(
      action,
      this.createHistoryEntry(this.getMessages()),
    );
    return entry ? { action, entry } : null;
  }

  private createOptionalTransaction<TResult>(
    action: MessageEditorEditActionKind,
    plan: MessageEditorMutationPlan<TResult> | null,
    historyKind: "default" | "typing" = "default",
  ) {
    return plan ? this.createTransaction(action, plan, historyKind) : null;
  }

  private createTransaction<TResult>(
    action: MessageEditorEditActionKind,
    plan: MessageEditorMutationPlan<TResult>,
    historyKind: "default" | "typing" = "default",
    historyGroupKey: string | null = null,
  ): MessageEditorEditTransaction<TResult> {
    return {
      ...plan,
      action,
      historyGroupKey,
      historyKind,
    };
  }
}

/** 创建绑定当前文档快照的用户意图操作集合。 */
export function createMessageEditorActions(params: MessageEditorActionsParams): MessageEditorActions {
  return new MessageEditorDocumentActions(params);
}
