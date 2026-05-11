import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import { createMessageEditorTextDraft } from "../model/messageEditorTransforms";
import { createMessageEditorRegistry } from "./messageEditorRegistry";
import { createMessageEditorSelection } from "./messageEditorSelection";

describe("messageEditorSelection", () => {
  it("creates a normalized multi-block selection across continuous text blocks", () => {
    const first = createMessageEditorTextDraft({ content: "alpha" });
    const second = createMessageEditorTextDraft({ content: "beta" });
    const registry = createMessageEditorRegistry();

    const selection = createMessageEditorSelection([first, second], registry, {
      blockId: first.extra?.messageEditor?.blockId as string,
      offset: 2,
    }, {
      blockId: second.extra?.messageEditor?.blockId as string,
      offset: 2,
    });

    expect(selection).not.toBeNull();
    expect(selection?.multiBlock).toBe(true);
    expect(selection?.segments).toEqual([
      {
        blockId: first.extra?.messageEditor?.blockId,
        start: 2,
        end: 5,
      },
      {
        blockId: second.extra?.messageEditor?.blockId,
        start: 0,
        end: 2,
      },
    ]);
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
        messageEditor: {
          blockId: "img-1",
        },
      },
    };
    const third = createMessageEditorTextDraft({ content: "omega" });
    const registry = createMessageEditorRegistry();

    const selection = createMessageEditorSelection([first, imageBlock, third], registry, {
      blockId: first.extra?.messageEditor?.blockId as string,
      offset: 1,
    }, {
      blockId: third.extra?.messageEditor?.blockId as string,
      offset: 1,
    });

    expect(selection).toBeNull();
  });
});
