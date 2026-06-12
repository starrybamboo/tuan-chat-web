import { describe, expect, it } from "vitest";

import {
  resolveChatFrameMessageIndexFromVirtuosoIndex,
  resolveChatFrameVirtuosoIndexFromMessageIndex,
} from "./useChatFrameIndexing";

describe("useChatFrameIndexing", () => {
  it("保持 Virtuoso 与当前消息列表使用同一套 0 基索引", () => {
    expect(resolveChatFrameMessageIndexFromVirtuosoIndex(4)).toBe(4);
    expect(resolveChatFrameVirtuosoIndexFromMessageIndex(4)).toBe(4);
  });
});
