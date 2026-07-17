import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { MessageEditorMessage } from "../../messageEditorTypes";
import type { MessageEditorSelection } from "../../runtime/messageEditorSelection";

import {
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
} from "../../model/messageEditorTransforms";
import { createMessageEditorActions } from "../../runtime/messageEditorActions";
import { MessageEditorHistoryManager } from "../../runtime/messageEditorHistoryManager";
import { createMessageEditorRegistry } from "../../runtime/messageEditorRegistry";

function createHistoryEntry(messages: MessageEditorMessage[]) {
  return {
    focus: null,
    messages,
  };
}

function createActions(
  getMessages: () => MessageEditorMessage[],
  historyManager = new MessageEditorHistoryManager(),
) {
  return createMessageEditorActions({
    createHistoryEntry,
    getMessages,
    historyManager,
    registry: createMessageEditorRegistry(),
  });
}

function createSelection(
  message: MessageEditorMessage,
  start: number,
  end: number,
): MessageEditorSelection {
  const blockId = getMessageEditorBlockId(message);
  return {
    anchor: { blockId, offset: start },
    blockIds: [blockId],
    collapsed: start === end,
    end: { blockId, offset: end },
    focus: { blockId, offset: end },
    multiBlock: false,
    segments: [{ blockId, end, start }],
    start: { blockId, offset: start },
  };
}

describe("messageEditorActions", () => {
  it("declares text input in user language while retaining its internal mutation", () => {
    const messages = [createMessageEditorTextDraft({ content: "before" })];
    const actions = createActions(() => messages);

    const transaction = actions.inputText(getMessageEditorBlockId(messages[0]), "after");

    expect(transaction).toMatchObject({
      action: "input-text",
      changed: true,
      historyGroupKey: getMessageEditorBlockId(messages[0]),
      historyKind: "typing",
      mutation: "update-text-content",
      result: undefined,
      structureChanged: false,
    });
    expect(transaction.messages[0].content).toBe("after");
    expect(messages[0].content).toBe("before");
  });

  it("declares paragraph creation instead of exposing selection splitting", () => {
    const messages = [createMessageEditorTextDraft({ content: "hello" })];
    const actions = createActions(() => messages);

    const transaction = actions.createParagraph(createSelection(messages[0], 2, 2));

    expect(transaction).toMatchObject({
      action: "create-paragraph",
      historyKind: "default",
      mutation: "split-selection",
    });
    expect(transaction?.messages.map(message => message.content)).toEqual(["he", "llo"]);
  });

  it("applies one style action across the selected text", () => {
    const messages = [createMessageEditorTextDraft({ content: "alpha" })];
    const actions = createActions(() => messages);

    const transaction = actions.applyTextStyle(createSelection(messages[0], 1, 4), {
      replacement: "[lph](style=font-weight:bold)",
      selectedText: "lph",
    });

    expect(transaction).toMatchObject({
      action: "apply-text-style",
      historyKind: "default",
      mutation: "transform-selection-text",
    });
    expect(transaction?.messages[0].content).toBe("a[lph](style=font-weight:bold)a");
  });

  it("assigns a speaker as one semantic action", () => {
    const messages = [createMessageEditorTextDraft({ content: "/alice hello" })];
    const actions = createActions(() => messages);

    const transaction = actions.assignSpeaker({
      avatarId: 71,
      blockId: getMessageEditorBlockId(messages[0]),
      content: "hello",
      roleId: 7,
    });

    expect(transaction).toMatchObject({
      action: "assign-speaker",
      mutation: "update-block",
    });
    expect(transaction.messages[0]).toMatchObject({
      avatarId: 71,
      content: "hello",
      roleId: 7,
    });
  });

  it("clears speaker identity through the avatar selection workflow", () => {
    const messages = [{
      ...createMessageEditorTextDraft({ content: "hello" }),
      avatarId: 71,
      roleId: 7,
    }];
    const actions = createActions(() => messages);

    const transaction = actions.selectSpeakerAvatar({
      blockId: getMessageEditorBlockId(messages[0]),
      clearSpeaker: true,
      content: "hello",
      roleId: 7,
    });

    expect(transaction.action).toBe("select-speaker-avatar");
    expect(transaction.messages[0].avatarId).toBeUndefined();
    expect(transaction.messages[0].roleId).toBeUndefined();
  });

  it("declares media replacement without exposing a generic block updater", () => {
    const mediaMessage = {
      content: "",
      extra: { imageMessage: {} },
      messageType: MESSAGE_TYPE.IMG,
    } as MessageEditorMessage;
    const messages = [mediaMessage];
    const actions = createActions(() => messages);

    const transaction = actions.replaceMedia(getMessageEditorBlockId(mediaMessage), {
      fileId: 45,
      fileName: "cover.png",
      mediaType: "image/png",
      size: 1024,
    });

    expect(transaction).toMatchObject({
      action: "replace-media",
      mutation: "update-block",
    });
    expect(transaction.messages[0].extra?.imageMessage?.source).toEqual({
      fileId: 45,
      kind: "internal",
    });
  });

  it("declares undo and redo as user actions", () => {
    const baseline = [createMessageEditorTextDraft({ content: "before" })];
    let messages = [createMessageEditorTextDraft({ content: "after" })];
    const historyManager = new MessageEditorHistoryManager();
    historyManager.pushUndoEntry(createHistoryEntry(baseline));
    const actions = createActions(() => messages, historyManager);

    const undoTransaction = actions.undo();
    expect(undoTransaction).toMatchObject({
      action: "undo",
      entry: {
        messages: baseline,
      },
    });

    messages = undoTransaction!.entry.messages;
    const redoTransaction = actions.redo();
    expect(redoTransaction).toMatchObject({
      action: "redo",
      entry: {
        messages: [{ content: "after" }],
      },
    });
  });
});
