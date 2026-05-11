import type { MessageDraft } from "@/types/messageDraft";

import { createMessageEditorTextDraft, getMessageEditorInlineMarks } from "../model/messageEditorTransforms";
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
});
