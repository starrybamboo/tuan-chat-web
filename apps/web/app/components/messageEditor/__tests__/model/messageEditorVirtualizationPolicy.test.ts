import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import { createMessageEditorTextDraft } from "../../model/messageEditorTransforms";
import {
  estimateMessageEditorBlockHeight,
  MESSAGE_EDITOR_VIRTUALIZATION_FALLBACK_HEIGHT_PX,
  normalizeMessageEditorVirtualBlockHeight,
  resolveMessageEditorVirtualAnchorBlockId,
} from "../../model/messageEditorVirtualizationPolicy";

describe("messageEditorVirtualizationPolicy", () => {
  it("normalizes invalid estimates to a stable default height", () => {
    expect(normalizeMessageEditorVirtualBlockHeight(Number.NaN)).toBe(MESSAGE_EDITOR_VIRTUALIZATION_FALLBACK_HEIGHT_PX);
    expect(normalizeMessageEditorVirtualBlockHeight(0)).toBe(MESSAGE_EDITOR_VIRTUALIZATION_FALLBACK_HEIGHT_PX);
    expect(normalizeMessageEditorVirtualBlockHeight(81.6)).toBe(82);
  });

  it("keeps a stable block anchor and falls back to the nearest surviving neighbor", () => {
    const previousBlockIds = ["first", "anchor", "next", "last"];
    expect(resolveMessageEditorVirtualAnchorBlockId({
      anchorBlockId: "anchor",
      nextBlockIndexById: new Map([["anchor", 2]]),
      previousBlockIds,
    })).toBe("anchor");
    expect(resolveMessageEditorVirtualAnchorBlockId({
      anchorBlockId: "anchor",
      nextBlockIndexById: new Map([["first", 0], ["next", 1], ["last", 2]]),
      previousBlockIds,
    })).toBe("next");
    expect(resolveMessageEditorVirtualAnchorBlockId({
      anchorBlockId: "anchor",
      nextBlockIndexById: new Map([["first", 0]]),
      previousBlockIds,
    })).toBe("first");
    expect(resolveMessageEditorVirtualAnchorBlockId({
      anchorBlockId: "anchor",
      nextBlockIndexById: new Map(),
      previousBlockIds,
    })).toBeNull();
  });

  it("does not invent a fallback for an unknown previous anchor", () => {
    expect(resolveMessageEditorVirtualAnchorBlockId({
      anchorBlockId: "missing",
      nextBlockIndexById: new Map([["first", 0]]),
      previousBlockIds: ["first"],
    })).toBeNull();
  });

  it("prioritizes editor media, intrinsic media, and text estimates", () => {
    const editorMedia = estimateMessageEditorBlockHeight({
      isTextBlock: false,
      message: {
        content: "",
        messageType: MESSAGE_TYPE.IMG,
        extra: { imageMessage: { editorHeight: 240, height: 900, width: 1600 } },
      },
    });
    const intrinsicMedia = estimateMessageEditorBlockHeight({
      isTextBlock: false,
      message: {
        content: "",
        messageType: MESSAGE_TYPE.IMG,
        extra: { imageMessage: { height: 900, width: 1600 } },
      },
    });
    const text = estimateMessageEditorBlockHeight({
      isTextBlock: true,
      message: createMessageEditorTextDraft({ content: "a".repeat(200) }),
    });

    expect(editorMedia).toBe(256);
    expect(intrinsicMedia).toBe(421);
    expect(text).toBeGreaterThan(MESSAGE_EDITOR_VIRTUALIZATION_FALLBACK_HEIGHT_PX);
  });

});
