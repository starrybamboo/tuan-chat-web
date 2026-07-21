import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import { createMessageEditorBlockDraft, createMessageEditorTextDraft, getMessageEditorBlockId } from "../../model/messageEditorTransforms";
import { createMessageEditorRegistry } from "../../runtime/messageEditorRegistry";
import {
  createMessageEditorSelectionRenderLookup,
  createMessageEditorDocumentSelection,
  createMessageEditorSelection,
  createMessageEditorTextRunSelection,
  getAdjacentMessageEditorDocumentBlockPoint,
  getAdjacentMessageEditorTextBlockPoint,
  getAdjacentMessageEditorVerticalTextBlockPoint,
  getMessageEditorSelectionText,
  moveMessageEditorDocumentPointByCharacter,
  moveMessageEditorTextPointByCharacter,
} from "../../runtime/messageEditorSelection";

describe("messageEditorSelection", () => {
  it("creates a normalized multi-block selection across continuous text blocks", () => {
    const first = createMessageEditorTextDraft({ content: "alpha" });
    const second = createMessageEditorTextDraft({ content: "beta" });
    const registry = createMessageEditorRegistry();

    const selection = createMessageEditorSelection([first, second], registry, {
      blockId: getMessageEditorBlockId(first),
      offset: 2,
    }, {
      blockId: getMessageEditorBlockId(second),
      offset: 2,
    });

    expect(selection).not.toBeNull();
    expect(selection?.multiBlock).toBe(true);
    expect(selection?.segments).toEqual([
      {
        blockId: getMessageEditorBlockId(first),
        start: 2,
        end: 5,
      },
      {
        blockId: getMessageEditorBlockId(second),
        start: 0,
        end: 2,
      },
    ]);
    expect(selection ? getMessageEditorSelectionText([first, second], selection) : "").toBe("pha\nbe");
  });

  it("preserves empty text blocks as blank lines in multi-block selection text", () => {
    const first = createMessageEditorTextDraft({ content: "alpha" });
    const empty = createMessageEditorTextDraft({ content: "" });
    const third = createMessageEditorTextDraft({ content: "omega" });
    const registry = createMessageEditorRegistry();

    const selection = createMessageEditorSelection([first, empty, third], registry, {
      blockId: getMessageEditorBlockId(first),
      offset: 2,
    }, {
      blockId: getMessageEditorBlockId(third),
      offset: 2,
    });

    expect(selection).not.toBeNull();
    expect(selection?.segments).toEqual([
      {
        blockId: getMessageEditorBlockId(first),
        start: 2,
        end: 5,
      },
      {
        blockId: getMessageEditorBlockId(empty),
        start: 0,
        end: 0,
      },
      {
        blockId: getMessageEditorBlockId(third),
        start: 0,
        end: 2,
      },
    ]);
    expect(selection ? getMessageEditorSelectionText([first, empty, third], selection) : "").toBe("pha\n\nom");
  });

  it("builds one render lookup for segments and selected line breaks", () => {
    const first = createMessageEditorTextDraft({ content: "alpha" });
    const empty = createMessageEditorTextDraft({ content: "" });
    const third = createMessageEditorTextDraft({ content: "omega" });
    const messages = [first, empty, third];
    const selection = createMessageEditorSelection(messages, createMessageEditorRegistry(), {
      blockId: getMessageEditorBlockId(first),
      offset: 2,
    }, {
      blockId: getMessageEditorBlockId(third),
      offset: 2,
    });

    const lookup = createMessageEditorSelectionRenderLookup(selection);

    expect(lookup.get(getMessageEditorBlockId(first))).toEqual({
      blockId: getMessageEditorBlockId(first),
      end: 5,
      showLineBreakAfter: true,
      start: 2,
    });
    expect(lookup.get(getMessageEditorBlockId(empty))).toEqual({
      blockId: getMessageEditorBlockId(empty),
      end: 0,
      showLineBreakAfter: true,
      start: 0,
    });
    expect(lookup.get(getMessageEditorBlockId(third))?.showLineBreakAfter).toBe(false);
  });

  it("includes atomic blocks as whole-object segments in document selections", () => {
    const first = createMessageEditorTextDraft({ content: "alpha" });
    const imageBlock = createMessageEditorBlockDraft("image");
    const third = createMessageEditorTextDraft({ content: "omega" });
    const registry = createMessageEditorRegistry();

    const selection = createMessageEditorSelection([first, imageBlock, third], registry, {
      blockId: getMessageEditorBlockId(first),
      offset: 1,
    }, {
      blockId: getMessageEditorBlockId(third),
      offset: 1,
    });

    expect(selection).not.toBeNull();
    expect(selection?.blockIds).toEqual([
      getMessageEditorBlockId(first),
      getMessageEditorBlockId(imageBlock),
      getMessageEditorBlockId(third),
    ]);
    expect(selection?.segments).toEqual([
      {
        blockId: getMessageEditorBlockId(first),
        start: 1,
        end: 5,
      },
      {
        blockId: getMessageEditorBlockId(imageBlock),
        start: 0,
        end: 1,
      },
      {
        blockId: getMessageEditorBlockId(third),
        start: 0,
        end: 1,
      },
    ]);
    expect(selection ? getMessageEditorSelectionText([first, imageBlock, third], selection) : "").toBe("lpha\n\no");
  });

  it("selects the current contiguous text run without crossing atomic blocks", () => {
    const first = createMessageEditorTextDraft({ content: "one" });
    const second = createMessageEditorTextDraft({ content: "two" });
    const imageBlock = {
      messageType: MESSAGE_TYPE.IMG,
      content: "",
      extra: {
        imageMessage: {},
      },
    };
    const third = createMessageEditorTextDraft({ content: "three" });
    const registry = createMessageEditorRegistry();

    const selection = createMessageEditorTextRunSelection([first, second, imageBlock, third], registry, getMessageEditorBlockId(second));

    expect(selection?.blockIds).toEqual([
      getMessageEditorBlockId(first),
      getMessageEditorBlockId(second),
    ]);
    expect(selection ? getMessageEditorSelectionText([first, second, imageBlock, third], selection) : "").toBe("one\ntwo");
  });

  it("selects the whole document for editor-level select all", () => {
    const first = createMessageEditorTextDraft({ content: "" });
    const second = createMessageEditorTextDraft({ content: "one" });
    const imageBlock = createMessageEditorBlockDraft("image");
    const last = createMessageEditorTextDraft({ content: "two" });
    const messages = [first, second, imageBlock, last];
    const registry = createMessageEditorRegistry();

    const selection = createMessageEditorDocumentSelection(messages, registry);

    expect(selection?.blockIds).toEqual(messages.map(message => getMessageEditorBlockId(message)));
    expect(selection?.segments).toEqual([
      {
        blockId: getMessageEditorBlockId(first),
        start: 0,
        end: 0,
      },
      {
        blockId: getMessageEditorBlockId(second),
        start: 0,
        end: 3,
      },
      {
        blockId: getMessageEditorBlockId(imageBlock),
        start: 0,
        end: 1,
      },
      {
        blockId: getMessageEditorBlockId(last),
        start: 0,
        end: 3,
      },
    ]);
    expect(selection ? getMessageEditorSelectionText(messages, selection) : "").toBe("\none\n\ntwo");
  });

  it("moves document selection points through atomic blocks", () => {
    const first = createMessageEditorTextDraft({ content: "ab" });
    const imageBlock = createMessageEditorBlockDraft("image");
    const third = createMessageEditorTextDraft({ content: "cd" });
    const messages = [first, imageBlock, third];
    const registry = createMessageEditorRegistry();

    const imageFocus = moveMessageEditorDocumentPointByCharacter(messages, registry, {
      blockId: getMessageEditorBlockId(first),
      offset: 2,
    }, 1);

    expect(imageFocus).toEqual({
      blockId: getMessageEditorBlockId(imageBlock),
      offset: 1,
    });

    const selection = imageFocus
      ? createMessageEditorSelection(messages, registry, {
          blockId: getMessageEditorBlockId(first),
          offset: 2,
        }, imageFocus)
      : null;
    expect(selection?.segments).toEqual([
      {
        blockId: getMessageEditorBlockId(imageBlock),
        start: 0,
        end: 1,
      },
    ]);

    expect(moveMessageEditorDocumentPointByCharacter(messages, registry, {
      blockId: getMessageEditorBlockId(imageBlock),
      offset: 1,
    }, 1)).toEqual({
      blockId: getMessageEditorBlockId(third),
      offset: 1,
    });
    expect(moveMessageEditorDocumentPointByCharacter(messages, registry, {
      blockId: getMessageEditorBlockId(third),
      offset: 0,
    }, -1)).toEqual({
      blockId: getMessageEditorBlockId(imageBlock),
      offset: 0,
    });
  });

  it("moves adjacent document block points through atomic blocks", () => {
    const first = createMessageEditorTextDraft({ content: "ab" });
    const imageBlock = createMessageEditorBlockDraft("image");
    const third = createMessageEditorTextDraft({ content: "cd" });
    const messages = [first, imageBlock, third];
    const registry = createMessageEditorRegistry();

    expect(getAdjacentMessageEditorDocumentBlockPoint(messages, registry, {
      blockId: getMessageEditorBlockId(first),
      offset: 2,
    }, 1, 99)).toEqual({
      blockId: getMessageEditorBlockId(imageBlock),
      offset: 1,
    });
    expect(getAdjacentMessageEditorDocumentBlockPoint(messages, registry, {
      blockId: getMessageEditorBlockId(imageBlock),
      offset: 1,
    }, 1, Number.MAX_SAFE_INTEGER)).toEqual({
      blockId: getMessageEditorBlockId(third),
      offset: "cd".length,
    });
    expect(getAdjacentMessageEditorDocumentBlockPoint(messages, registry, {
      blockId: getMessageEditorBlockId(third),
      offset: 0,
    }, -1, 99)).toEqual({
      blockId: getMessageEditorBlockId(imageBlock),
      offset: 0,
    });
  });

  it("moves text points only inside a contiguous text run", () => {
    const first = createMessageEditorTextDraft({ content: "ab" });
    const second = createMessageEditorTextDraft({ content: "cd" });
    const imageBlock = {
      messageType: MESSAGE_TYPE.IMG,
      content: "",
      extra: {
        imageMessage: {},
      },
    };
    const third = createMessageEditorTextDraft({ content: "ef" });
    const messages = [first, second, imageBlock, third];
    const registry = createMessageEditorRegistry();

    expect(getAdjacentMessageEditorTextBlockPoint(messages, registry, {
      blockId: getMessageEditorBlockId(first),
      offset: 2,
    }, 1, 9)).toEqual({
      blockId: getMessageEditorBlockId(second),
      offset: 2,
    });
    expect(getAdjacentMessageEditorTextBlockPoint(messages, registry, {
      blockId: getMessageEditorBlockId(second),
      offset: 2,
    }, 1)).toBeNull();
    expect(moveMessageEditorTextPointByCharacter(messages, registry, {
      blockId: getMessageEditorBlockId(second),
      offset: 0,
    }, -1)).toEqual({
      blockId: getMessageEditorBlockId(first),
      offset: 1,
    });
  });

  it("moves vertically across paragraph boundaries to the target message end", () => {
    const first = createMessageEditorTextDraft({ content: "previous" });
    const second = createMessageEditorTextDraft({ content: "next" });
    const messages = [first, second];
    const registry = createMessageEditorRegistry();

    expect(getAdjacentMessageEditorVerticalTextBlockPoint(messages, registry, {
      blockId: getMessageEditorBlockId(second),
      offset: 0,
    }, -1)).toEqual({
      blockId: getMessageEditorBlockId(first),
      offset: "previous".length,
    });
    expect(getAdjacentMessageEditorVerticalTextBlockPoint(messages, registry, {
      blockId: getMessageEditorBlockId(first),
      offset: "previous".length,
    }, 1)).toEqual({
      blockId: getMessageEditorBlockId(second),
      offset: "next".length,
    });
  });
});
