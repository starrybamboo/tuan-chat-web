import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  getMessageEditorInlineMarks,
  moveMessageEditorMessageToIndex,
  remapMessageEditorInlineMarksForTextChange,
  setMessageEditorInlineMarks,
  splitMessageEditorMessage,
} from "./messageEditorTransforms";

describe("messageEditorTransforms", () => {
  it("remaps inline marks after text insertion", () => {
    const draft = setMessageEditorInlineMarks(createMessageEditorTextDraft({
      content: "hello world",
    }), [{
      markId: "bold-1",
      type: "bold",
      start: 6,
      end: 11,
    }]);

    const nextMarks = remapMessageEditorInlineMarksForTextChange(
      getMessageEditorInlineMarks(draft),
      "hello world",
      "hello brave world",
    );

    expect(nextMarks).toEqual([{
      markId: "bold-1",
      type: "bold",
      start: 12,
      end: 17,
    }]);
  });

  it("splits a text block and keeps inline marks on both sides", () => {
    const source = setMessageEditorInlineMarks(createMessageEditorTextDraft({
      content: "alpha beta",
      messageType: MESSAGE_TYPE.TEXT,
    }), [
      {
        markId: "left",
        type: "bold",
        start: 0,
        end: 5,
      },
      {
        markId: "right",
        type: "italic",
        start: 6,
        end: 10,
      },
    ]);

    const result = splitMessageEditorMessage([source], {
      blockId: source.extra?.messageEditor?.blockId as string,
      selectionStart: 5,
      selectionEnd: 6,
    });

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].content).toBe("alpha");
    expect(getMessageEditorInlineMarks(result.messages[0])).toEqual([{
      markId: "left",
      type: "bold",
      start: 0,
      end: 5,
    }]);
    expect(result.messages[1].content).toBe("beta");
    expect(getMessageEditorInlineMarks(result.messages[1])).toEqual([{
      markId: "right",
      type: "italic",
      start: 0,
      end: 4,
    }]);
  });

  it("creates atomic drafts for slash insertion", () => {
    const image = createMessageEditorBlockDraft("image");
    const choose = createMessageEditorBlockDraft("choose");

    expect(image.messageType).toBe(MESSAGE_TYPE.IMG);
    expect(image.extra?.imageMessage).toEqual({});
    expect(choose.messageType).toBe(MESSAGE_TYPE.WEBGAL_CHOOSE);
    expect(choose.extra?.webgalChoose).toEqual({ options: [] });
  });

  it("moves a block to a target index", () => {
    const first = createMessageEditorTextDraft({ content: "first" });
    const second = createMessageEditorTextDraft({ content: "second" });
    const third = createMessageEditorTextDraft({ content: "third" });

    const nextMessages = moveMessageEditorMessageToIndex([first, second, third], first.extra?.messageEditor?.blockId as string, 2);

    expect(nextMessages.map(message => message.content)).toEqual(["second", "third", "first"]);
  });
});
