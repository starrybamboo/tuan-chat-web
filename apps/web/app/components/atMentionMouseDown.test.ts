import { describe, expect, it, vi } from "vitest";

import { handleAtMentionInputMouseDown } from "@/components/atMentionMouseDown";

describe("handleAtMentionInputMouseDown", () => {
  it("关闭 @ 面板但不拦截输入区鼠标默认行为", () => {
    const closeDialog = vi.fn();

    const handled = handleAtMentionInputMouseDown({
      closeDialog,
      showDialog: true,
    });

    expect(handled).toBe(false);
    expect(closeDialog).toHaveBeenCalledTimes(1);
  });

  it("@ 面板未打开时不处理输入区鼠标事件", () => {
    const closeDialog = vi.fn();

    const handled = handleAtMentionInputMouseDown({
      closeDialog,
      showDialog: false,
    });

    expect(handled).toBe(false);
    expect(closeDialog).not.toHaveBeenCalled();
  });
});
