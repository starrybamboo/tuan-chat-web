import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { MessageEditorMessage } from "../../messageEditorTypes";
import type {
  MessageEditorMutationPlan,
  MessageEditorMutationPlanner,
} from "../../document/messageEditorMutationPlanner";

import { createMessageEditorRegistry } from "../../messageEditorRegistry";
import { createMessageEditorMutationPlanner } from "../../document/messageEditorMutationPlanner";
import {
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
  normalizeMessageEditorDraft,
  setMessageEditorUploadedMedia,
} from "../../document/messageEditorTransforms";

function createCommittedMessageEditorMutationPlanner(params: {
  getMessages: () => MessageEditorMessage[];
  registry: Parameters<typeof createMessageEditorMutationPlanner>[0]["registry"];
  setMessages: (updater: (previous: MessageEditorMessage[]) => MessageEditorMessage[]) => void;
}) {
  const planner = createMessageEditorMutationPlanner({
    getMessages: params.getMessages,
    registry: params.registry,
  });
  const commit = <T,>(plan: MessageEditorMutationPlan<T> | null) => {
    if (!plan) {
      return null;
    }
    params.setMessages(() => plan.messages);
    return plan.result;
  };

  return {
    ensureTrailingTextBlock: () => commit(planner.ensureTrailingTextBlock()),
    getAdjacentTextBlock: (...args: Parameters<MessageEditorMutationPlanner["getAdjacentTextBlock"]>) => planner.getAdjacentTextBlock(...args),
    insertBlockAtPoint: (...args: Parameters<MessageEditorMutationPlanner["insertBlockAtPoint"]>) => commit(planner.insertBlockAtPoint(...args)),
    insertBlockAtSelection: (...args: Parameters<MessageEditorMutationPlanner["insertBlockAtSelection"]>) => commit(planner.insertBlockAtSelection(...args)),
    mergeBackward: (...args: Parameters<MessageEditorMutationPlanner["mergeBackward"]>) => commit(planner.mergeBackward(...args)),
    mergeForward: (...args: Parameters<MessageEditorMutationPlanner["mergeForward"]>) => commit(planner.mergeForward(...args)),
    moveBlock: (...args: Parameters<MessageEditorMutationPlanner["moveBlock"]>) => commit(planner.moveBlock(...args)),
    moveBlockToIndex: (...args: Parameters<MessageEditorMutationPlanner["moveBlockToIndex"]>) => commit(planner.moveBlockToIndex(...args)),
    removeBlock: (...args: Parameters<MessageEditorMutationPlanner["removeBlock"]>) => commit(planner.removeBlock(...args)),
    replaceBlockWithKind: (...args: Parameters<MessageEditorMutationPlanner["replaceBlockWithKind"]>) => commit(planner.replaceBlockWithKind(...args)),
    replaceSelectionText: (...args: Parameters<MessageEditorMutationPlanner["replaceSelectionText"]>) => commit(planner.replaceSelectionText(...args)),
    replaceSelectionTextAsBlocks: (...args: Parameters<MessageEditorMutationPlanner["replaceSelectionTextAsBlocks"]>) => commit(planner.replaceSelectionTextAsBlocks(...args)),
    transformSelectionText: (...args: Parameters<MessageEditorMutationPlanner["transformSelectionText"]>) => commit(planner.transformSelectionText(...args)),
    updateBlock: (...args: Parameters<MessageEditorMutationPlanner["updateBlock"]>) => commit(planner.updateBlock(...args)),
    updateTextContent: (...args: Parameters<MessageEditorMutationPlanner["updateTextContent"]>) => commit(planner.updateTextContent(...args)),
  };
}

describe("messageEditorMutationPlanner", () => {
  it("plans a declared edit transaction without mutating the current document", () => {
    const messages = [createMessageEditorTextDraft({ content: "before" })];
    const planner = createMessageEditorMutationPlanner({
      getMessages: () => messages,
      registry: createMessageEditorRegistry(),
    });

    const plan = planner.updateTextContent(getMessageEditorBlockId(messages[0]), "after");

    expect(messages[0].content).toBe("before");
    expect(plan).toMatchObject({
      changed: true,
      changedBlockIds: [getMessageEditorBlockId(messages[0])],
      mutation: "update-text-content",
      result: undefined,
      structureChanged: false,
    });
    expect(plan.messages[0].content).toBe("after");
  });

  it("preserves unchanged block references and reports no-op text input", () => {
    const messages = [
      createMessageEditorTextDraft({ content: "before" }),
      createMessageEditorTextDraft({ content: "stable" }),
    ];
    const planner = createMessageEditorMutationPlanner({
      getMessages: () => messages,
      registry: createMessageEditorRegistry(),
    });

    const changedPlan = planner.updateTextContent(getMessageEditorBlockId(messages[0]), "after");
    const unchangedPlan = planner.updateTextContent(getMessageEditorBlockId(messages[0]), "before");

    expect(changedPlan.messages[1]).toBe(messages[1]);
    expect(unchangedPlan).toMatchObject({
      changed: false,
      changedBlockIds: [],
      messages,
      structureChanged: false,
    });
    expect(unchangedPlan.messages).toBe(messages);
  });

  it("moves a block to a target index", () => {
    let messages: MessageEditorMessage[] = [
      createMessageEditorTextDraft({ content: "one" }),
      createMessageEditorTextDraft({ content: "two" }),
      createMessageEditorTextDraft({ content: "three" }),
    ];
    const registry = createMessageEditorRegistry();
    const planner = createCommittedMessageEditorMutationPlanner({
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    planner.moveBlockToIndex(getMessageEditorBlockId(messages[0]), 2);
    expect(messages.map(message => message.content)).toEqual(["two", "three", "one"]);
  });

  it("replaces a slash block with an atomic block kind", () => {
    let messages: MessageEditorMessage[] = [
      createMessageEditorTextDraft({ content: "/" }),
    ];
    const registry = createMessageEditorRegistry();
    const planner = createCommittedMessageEditorMutationPlanner({
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    const focus = planner.replaceBlockWithKind(getMessageEditorBlockId(messages[0]), "image");

    expect(focus).toBeNull();
    expect(messages).toHaveLength(1);
    expect(messages[0].messageType).toBe(MESSAGE_TYPE.IMG);
    expect(messages[0].extra?.imageMessage).toEqual({});
  });

  it("keeps speaker metadata when replacing a slash block kind", () => {
    const source = normalizeMessageEditorDraft({
      messageType: MESSAGE_TYPE.TEXT,
      content: "/",
      roleId: 7,
      avatarId: 71,
      customRoleName: "绯月",
    })!;
    let messages: MessageEditorMessage[] = [source];
    const registry = createMessageEditorRegistry();
    const planner = createCommittedMessageEditorMutationPlanner({
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    planner.replaceBlockWithKind(getMessageEditorBlockId(source), "image");

    expect(messages[0]).toMatchObject({
      messageType: MESSAGE_TYPE.IMG,
      roleId: 7,
      avatarId: 71,
      customRoleName: "绯月",
    });
  });

  it("inserts an atomic block at a text point", () => {
    let messages: MessageEditorMessage[] = [
      createMessageEditorTextDraft({ content: "helloworld" }),
    ];
    const registry = createMessageEditorRegistry();
    const planner = createCommittedMessageEditorMutationPlanner({
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    const result = planner.insertBlockAtPoint({
      blockId: getMessageEditorBlockId(messages[0]),
      offset: 5,
    }, "image");

    expect(result?.insertedBlockId).toBe(getMessageEditorBlockId(messages[1]));
    expect(messages.map(message => message.messageType)).toEqual([
      MESSAGE_TYPE.TEXT,
      MESSAGE_TYPE.IMG,
      MESSAGE_TYPE.TEXT,
    ]);
    expect(messages.map(message => message.content)).toEqual(["hello", "", "world"]);
    expect(result?.focus).toEqual({
      blockId: getMessageEditorBlockId(messages[2]),
      caret: 0,
    });
  });

  it("preserves preferred caret offset when moving to an adjacent text block", () => {
    const first = createMessageEditorTextDraft({ content: "123456" });
    const second = createMessageEditorTextDraft({ content: "abc" });
    const messages = [first, second];
    const registry = createMessageEditorRegistry();
    const planner = createCommittedMessageEditorMutationPlanner({
      registry,
      getMessages: () => messages,
      setMessages() {},
    });

    expect(planner.getAdjacentTextBlock(getMessageEditorBlockId(first), 1, 5)).toEqual({
      blockId: getMessageEditorBlockId(second),
      caret: 3,
    });
    expect(planner.getAdjacentTextBlock(getMessageEditorBlockId(second), -1, 2)).toEqual({
      blockId: getMessageEditorBlockId(first),
      caret: 2,
    });
  });

  it("uses block boundary defaults when no preferred offset is provided", () => {
    const first = createMessageEditorTextDraft({ content: "123456" });
    const second = createMessageEditorTextDraft({ content: "abc" });
    const messages = [first, second];
    const registry = createMessageEditorRegistry();
    const planner = createCommittedMessageEditorMutationPlanner({
      registry,
      getMessages: () => messages,
      setMessages() {},
    });

    expect(planner.getAdjacentTextBlock(getMessageEditorBlockId(first), 1)).toEqual({
      blockId: getMessageEditorBlockId(second),
      caret: 0,
    });
    expect(planner.getAdjacentTextBlock(getMessageEditorBlockId(second), -1)).toEqual({
      blockId: getMessageEditorBlockId(first),
      caret: 6,
    });
  });

  it("updates a block through the planner", () => {
    let messages: MessageEditorMessage[] = [
      createMessageEditorTextDraft({ content: "hello" }),
    ];
    const registry = createMessageEditorRegistry();
    const planner = createCommittedMessageEditorMutationPlanner({
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    planner.updateBlock(getMessageEditorBlockId(messages[0]), message => setMessageEditorUploadedMedia({
      ...message,
      messageType: MESSAGE_TYPE.FILE,
    }, {
      fileId: 7,
      fileName: "demo.txt",
      mediaType: "text/plain",
      size: 32,
    }));

    expect(messages[0].extra?.fileMessage).toEqual({
      fileId: 7,
      fileName: "demo.txt",
      mediaType: "text/plain",
      size: 32,
    });
  });

  it("removes an atomic block and focuses the adjacent text block", () => {
    const imageBlock = {
      messageType: MESSAGE_TYPE.IMG,
      content: "",
      extra: {
        imageMessage: {},
      },
    } as MessageEditorMessage;
    const imageBlockId = getMessageEditorBlockId(imageBlock);
    let messages: MessageEditorMessage[] = [
      createMessageEditorTextDraft({ content: "before" }),
      imageBlock,
      createMessageEditorTextDraft({ content: "after" }),
    ];
    const registry = createMessageEditorRegistry();
    const planner = createCommittedMessageEditorMutationPlanner({
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    const focus = planner.removeBlock(imageBlockId);

    expect(messages).toHaveLength(2);
    expect(messages.map(message => message.content)).toEqual(["before", "after"]);
    expect(focus).toEqual({
      blockId: getMessageEditorBlockId(messages[1]),
      caret: "after".length,
    });
  });

  it("removes an atomic block through document selection replacement", () => {
    const imageBlock = {
      messageType: MESSAGE_TYPE.IMG,
      content: "",
      extra: {
        imageMessage: {},
      },
    } as MessageEditorMessage;
    const imageBlockId = getMessageEditorBlockId(imageBlock);
    let messages: MessageEditorMessage[] = [
      createMessageEditorTextDraft({ content: "before" }),
      imageBlock,
      createMessageEditorTextDraft({ content: "after" }),
    ];
    const registry = createMessageEditorRegistry();
    const planner = createCommittedMessageEditorMutationPlanner({
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    const result = planner.replaceSelectionText({
      anchor: {
        blockId: imageBlockId,
        offset: 0,
      },
      focus: {
        blockId: imageBlockId,
        offset: 1,
      },
      start: {
        blockId: imageBlockId,
        offset: 0,
      },
      end: {
        blockId: imageBlockId,
        offset: 1,
      },
      blockIds: [imageBlockId],
      collapsed: false,
      multiBlock: false,
      segments: [
        {
          blockId: imageBlockId,
          start: 0,
          end: 1,
        },
      ],
    }, "");

    expect(messages).toHaveLength(2);
    expect(messages.map(message => message.content)).toEqual(["before", "after"]);
    expect(result?.focus).toEqual({
      blockId: getMessageEditorBlockId(messages[1]),
      caret: "after".length,
    });
  });

  it("appends a trailing empty text block only when needed", () => {
    let messages: MessageEditorMessage[] = [
      createMessageEditorTextDraft({ content: "filled" }),
    ];
    const registry = createMessageEditorRegistry();
    const planner = createCommittedMessageEditorMutationPlanner({
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    const firstFocus = planner.ensureTrailingTextBlock();
    expect(messages).toHaveLength(2);
    expect(messages[1].content).toBe("");
    expect(firstFocus).toEqual({
      blockId: getMessageEditorBlockId(messages[1]),
      caret: 0,
    });

    const secondFocus = planner.ensureTrailingTextBlock();
    expect(messages).toHaveLength(2);
    expect(secondFocus).toEqual(firstFocus);
  });

  it("transforms a multi-block selection through the planner", () => {
    let messages: MessageEditorMessage[] = [
      createMessageEditorTextDraft({ content: "alpha" }),
      createMessageEditorTextDraft({ content: "beta" }),
    ];
    const registry = createMessageEditorRegistry();
    const planner = createCommittedMessageEditorMutationPlanner({
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    const result = planner.transformSelectionText({
      anchor: {
        blockId: getMessageEditorBlockId(messages[0]),
        offset: 1,
      },
      focus: {
        blockId: getMessageEditorBlockId(messages[1]),
        offset: 2,
      },
      start: {
        blockId: getMessageEditorBlockId(messages[0]),
        offset: 1,
      },
      end: {
        blockId: getMessageEditorBlockId(messages[1]),
        offset: 2,
      },
      blockIds: messages.map(message => getMessageEditorBlockId(message)),
      collapsed: false,
      multiBlock: true,
      segments: [
        {
          blockId: getMessageEditorBlockId(messages[0]),
          start: 1,
          end: 5,
        },
        {
          blockId: getMessageEditorBlockId(messages[1]),
          start: 0,
          end: 2,
        },
      ],
    }, selectedText => `[${selectedText}](style=color:#FF0000)`);

    expect(messages.map(message => message.content)).toEqual([
      "a[lpha](style=color:#FF0000)",
      "[be](style=color:#FF0000)ta",
    ]);
    expect(result?.focus).toEqual({
      blockId: getMessageEditorBlockId(messages[1]),
      caret: "[be](style=color:#FF0000)".length,
    });
    expect(result?.selection).toEqual({
      start: {
        blockId: getMessageEditorBlockId(messages[0]),
        offset: 1,
      },
      end: {
        blockId: getMessageEditorBlockId(messages[1]),
        offset: "[be](style=color:#FF0000)".length,
      },
      segments: [
        {
          blockId: getMessageEditorBlockId(messages[0]),
          start: 1,
          end: 1 + "[lpha](style=color:#FF0000)".length,
        },
        {
          blockId: getMessageEditorBlockId(messages[1]),
          start: 0,
          end: "[be](style=color:#FF0000)".length,
        },
      ],
    });
  });

});
