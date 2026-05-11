import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import { createMessageEditorTextDraft, getMessageEditorBlockId } from "../model/messageEditorTransforms";
import { createMessageEditorRegistry } from "./messageEditorRegistry";
import {
  createMessageEditorSelection,
  createMessageEditorTextRunSelection,
  getAdjacentMessageEditorTextBlockPoint,
  getMessageEditorSelectionText,
  moveMessageEditorTextPointByCharacter,
} from "./messageEditorSelection";

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

  it("rejects selections that pass through atomic blocks", () => {
    const first = createMessageEditorTextDraft({ content: "alpha" });
    const imageBlock = {
      messageType: MESSAGE_TYPE.IMG,
      content: "",
      extra: {
        imageMessage: {
          fileId: 1,
          mediaType: "image/png",
          fileName: "cover.png",
          size: 128,
          width: 64,
          height: 64,
          background: false,
        },
      },
    };
    const third = createMessageEditorTextDraft({ content: "omega" });
    const registry = createMessageEditorRegistry();

    const selection = createMessageEditorSelection([first, imageBlock, third], registry, {
      blockId: getMessageEditorBlockId(first),
      offset: 1,
    }, {
      blockId: getMessageEditorBlockId(third),
      offset: 1,
    });

    expect(selection).toBeNull();
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
});
