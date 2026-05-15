import type { MessageDraft } from "@/types/messageDraft";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
  setMessageEditorUploadedMedia,
} from "../model/messageEditorTransforms";
import { createMessageEditorController } from "./messageEditorController";
import { MessageEditorEventBus } from "./messageEditorEventBus";
import { createMessageEditorRegistry } from "./messageEditorRegistry";

describe("messageEditorController", () => {
  it("moves a block to a target index", () => {
    let messages: MessageDraft[] = [
      createMessageEditorTextDraft({ content: "one" }),
      createMessageEditorTextDraft({ content: "two" }),
      createMessageEditorTextDraft({ content: "three" }),
    ];
    const registry = createMessageEditorRegistry();
    const controller = createMessageEditorController({
      eventBus: new MessageEditorEventBus(),
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    controller.moveBlockToIndex(getMessageEditorBlockId(messages[0]), 2);
    expect(messages.map(message => message.content)).toEqual(["two", "three", "one"]);
  });

  it("replaces a slash block with an atomic block kind", () => {
    let messages: MessageDraft[] = [
      createMessageEditorTextDraft({ content: "/" }),
    ];
    const registry = createMessageEditorRegistry();
    const controller = createMessageEditorController({
      eventBus: new MessageEditorEventBus(),
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    const focus = controller.replaceBlockWithKind(getMessageEditorBlockId(messages[0]), "image");

    expect(focus).toBeNull();
    expect(messages).toHaveLength(1);
    expect(messages[0].messageType).toBe(MESSAGE_TYPE.IMG);
    expect(messages[0].extra?.imageMessage).toEqual({});
  });

  it("preserves preferred caret offset when moving to an adjacent text block", () => {
    const first = createMessageEditorTextDraft({ content: "123456" });
    const second = createMessageEditorTextDraft({ content: "abc" });
    const messages = [first, second];
    const registry = createMessageEditorRegistry();
    const controller = createMessageEditorController({
      eventBus: new MessageEditorEventBus(),
      registry,
      getMessages: () => messages,
      setMessages() {},
    });

    expect(controller.getAdjacentTextBlock(getMessageEditorBlockId(first), 1, 5)).toEqual({
      blockId: getMessageEditorBlockId(second),
      caret: 3,
    });
    expect(controller.getAdjacentTextBlock(getMessageEditorBlockId(second), -1, 2)).toEqual({
      blockId: getMessageEditorBlockId(first),
      caret: 2,
    });
  });

  it("updates a block through the controller", () => {
    let messages: MessageDraft[] = [
      createMessageEditorTextDraft({ content: "hello" }),
    ];
    const registry = createMessageEditorRegistry();
    const controller = createMessageEditorController({
      eventBus: new MessageEditorEventBus(),
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    controller.updateBlock(getMessageEditorBlockId(messages[0]), message => setMessageEditorUploadedMedia({
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
    } as MessageDraft;
    const imageBlockId = getMessageEditorBlockId(imageBlock);
    let messages: MessageDraft[] = [
      createMessageEditorTextDraft({ content: "before" }),
      imageBlock,
      createMessageEditorTextDraft({ content: "after" }),
    ];
    const registry = createMessageEditorRegistry();
    const controller = createMessageEditorController({
      eventBus: new MessageEditorEventBus(),
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    const focus = controller.removeBlock(imageBlockId);

    expect(messages).toHaveLength(2);
    expect(messages.map(message => message.content)).toEqual(["before", "after"]);
    expect(focus).toEqual({
      blockId: getMessageEditorBlockId(messages[1]),
      caret: "after".length,
    });
  });

  it("appends a trailing empty text block only when needed", () => {
    let messages: MessageDraft[] = [
      createMessageEditorTextDraft({ content: "filled" }),
    ];
    const registry = createMessageEditorRegistry();
    const controller = createMessageEditorController({
      eventBus: new MessageEditorEventBus(),
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    const firstFocus = controller.ensureTrailingTextBlock();
    expect(messages).toHaveLength(2);
    expect(messages[1].content).toBe("");
    expect(firstFocus).toEqual({
      blockId: getMessageEditorBlockId(messages[1]),
      caret: 0,
    });

    const secondFocus = controller.ensureTrailingTextBlock();
    expect(messages).toHaveLength(2);
    expect(secondFocus).toEqual(firstFocus);
  });

  it("transforms a multi-block selection through the controller", () => {
    let messages: MessageDraft[] = [
      createMessageEditorTextDraft({ content: "alpha" }),
      createMessageEditorTextDraft({ content: "beta" }),
    ];
    const registry = createMessageEditorRegistry();
    const controller = createMessageEditorController({
      eventBus: new MessageEditorEventBus(),
      registry,
      getMessages: () => messages,
      setMessages(updater) {
        messages = updater(messages);
      },
    });

    const result = controller.transformSelectionText({
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
