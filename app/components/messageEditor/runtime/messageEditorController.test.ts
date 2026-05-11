import type { MessageDraft } from "@/types/messageDraft";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
  getMessageEditorInlineMarks,
  setMessageEditorUploadedMedia,
} from "../model/messageEditorTransforms";
import { createMessageEditorController } from "./messageEditorController";
import { MessageEditorEventBus } from "./messageEditorEventBus";
import { createMessageEditorRegistry } from "./messageEditorRegistry";
import { createMessageEditorSelection } from "./messageEditorSelection";

describe("messageEditorController", () => {
  it("applies and removes the same inline mark across multiple text blocks", () => {
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

    const selection = createMessageEditorSelection(messages, registry, {
      blockId: messages[0].extra?.messageEditor?.blockId as string,
      offset: 1,
    }, {
      blockId: messages[1].extra?.messageEditor?.blockId as string,
      offset: 2,
    });

    expect(selection).not.toBeNull();

    controller.applyInlineMark(selection!, "bold");
    expect(getMessageEditorInlineMarks(messages[0])[0]).toMatchObject({
      type: "bold",
      start: 1,
      end: 5,
    });
    expect(getMessageEditorInlineMarks(messages[1])[0]).toMatchObject({
      type: "bold",
      start: 0,
      end: 2,
    });

    controller.applyInlineMark(selection!, "bold");
    expect(getMessageEditorInlineMarks(messages[0])).toEqual([]);
    expect(getMessageEditorInlineMarks(messages[1])).toEqual([]);
  });

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
    let messages: MessageDraft[] = [
      createMessageEditorTextDraft({ content: "before" }),
      {
        messageType: MESSAGE_TYPE.IMG,
        content: "",
        extra: {
          imageMessage: {},
          messageEditor: {
            blockId: "image-block",
            blockType: "paragraph",
            inlineMarks: [],
          },
        },
      } as MessageDraft,
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

    const focus = controller.removeBlock("image-block");

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
});
