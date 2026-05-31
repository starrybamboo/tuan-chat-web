import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "../../../../api";

import {
  getMaxRenderedMessagePosition,
  shouldAutoAdvanceAppendedMessage,
} from "./realtimeRenderAutoAdvance";

function message(position: number | undefined): ChatMessageResponse {
  return {
    message: {
      messageId: Math.floor((position ?? 0) * 10),
      position,
    },
  } as ChatMessageResponse;
}

describe("realtimeRenderAutoAdvance", () => {
  it("计算已渲染消息中的最大 position", () => {
    expect(getMaxRenderedMessagePosition([
      message(1),
      message(3.5),
      message(undefined),
      message(2),
    ])).toBe(3.5);
  });

  it("仅在开关开启且追加消息超过旧最大 position 时自动推进", () => {
    expect(shouldAutoAdvanceAppendedMessage({
      enabled: true,
      previousMaxPosition: 3,
      message: message(4),
    })).toBe(true);

    expect(shouldAutoAdvanceAppendedMessage({
      enabled: true,
      previousMaxPosition: 3,
      message: message(3),
    })).toBe(false);

    expect(shouldAutoAdvanceAppendedMessage({
      enabled: false,
      previousMaxPosition: 3,
      message: message(4),
    })).toBe(false);
  });
});
