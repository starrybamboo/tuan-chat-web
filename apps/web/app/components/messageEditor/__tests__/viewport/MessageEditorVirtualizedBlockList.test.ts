import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MESSAGE_EDITOR_VIRTUALIZATION_INITIAL_BLOCK_COUNT } from "../../virtualize/messageEditorVirtualizationPolicy";
import {
  getMessageEditorVirtualBlockKey,
  MessageEditorVirtualizedBlockList,
} from "../../virtualize/MessageEditorVirtualizedBlockList";

function createBlocks(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    blockId: `block-${index}`,
    estimatedHeight: 56,
  }));
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

describe("MessageEditorVirtualizedBlockList", () => {
  it("keeps a stale virtual index from crashing the render callbacks", () => {
    expect(getMessageEditorVirtualBlockKey(12, undefined)).toBe("missing-block-12");
  });

  it("server-renders only the bootstrap window for large documents", () => {
    const blockCount = 200;
    const html = renderToStaticMarkup(createElement(MessageEditorVirtualizedBlockList, {
      blocks: createBlocks(blockCount),
      className: "test-list",
      registerBlockSlotRef: () => {},
      registerScrollRoot: () => {},
      renderBlock: block => createElement("span", null, block.blockId),
    }));

    expect(html).toContain('data-me-virtualization-enabled="true"');
    expect(html).toContain(`data-me-mounted-block-count="${MESSAGE_EDITOR_VIRTUALIZATION_INITIAL_BLOCK_COUNT}"`);
    expect(countMatches(html, /data-me-virtualization-mounted="true"/g)).toBe(MESSAGE_EDITOR_VIRTUALIZATION_INITIAL_BLOCK_COUNT);
    expect(html).not.toContain("block-199");
  });

  it("uses the same Virtuoso path for small documents", () => {
    const blockCount = 5;
    const html = renderToStaticMarkup(createElement(MessageEditorVirtualizedBlockList, {
      blocks: createBlocks(blockCount),
      className: "test-list",
      registerBlockSlotRef: () => {},
      registerScrollRoot: () => {},
      renderBlock: block => createElement("span", null, block.blockId),
    }));

    expect(html).toContain('data-me-virtualization-enabled="true"');
    expect(countMatches(html, /data-me-virtualization-mounted="true"/g)).toBe(blockCount);
  });
});
