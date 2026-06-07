import { describe, expect, it } from "vitest";

import { getChatFrameMessageItemClassName } from "./chatFrameMessageItem";

describe("getChatFrameMessageItemClassName", () => {
  it("选中消息可跳转 WebGAL 时 hover 不覆盖选中态", () => {
    const className = getChatFrameMessageItemClassName({
      canJumpToWebGAL: true,
      isDragging: false,
      isSelected: true,
      messageSendStateClass: "message-sent",
      shouldPlayWebgalModeEntryAnimation: false,
      showDragHandle: false,
    });

    expect(className).toContain("bg-info-content/40");
    expect(className).toContain("hover:bg-info-content/40");
    expect(className).not.toContain("hover:bg-base-200/50");
  });

  it("未选中消息仍保留 WebGAL 跳转 hover 提示", () => {
    const className = getChatFrameMessageItemClassName({
      canJumpToWebGAL: true,
      isDragging: false,
      isSelected: false,
      messageSendStateClass: "message-sent",
      shouldPlayWebgalModeEntryAnimation: false,
      showDragHandle: false,
    });

    expect(className).toContain("cursor-pointer");
    expect(className).toContain("hover:bg-base-200/50");
  });
});
