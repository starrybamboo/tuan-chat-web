import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";

import { SupportCenterContent } from "./supportCenter";

describe("SupportCenterContent", () => {
  it("展示问题建议、用户术语、FAQ 和反馈入口", () => {
    const markup = renderToStaticMarkup(createElement(SupportCenterContent, {
      issueId: "space-archived",
      onClose: vi.fn(),
      onFeedback: vi.fn(),
    }));

    expect(markup).toContain("当前空间已归档");
    expect(markup).toContain("联系主持人解除归档");
    expect(markup).toContain("空间归档");
    expect(markup).toContain("为什么空间归档后不能继续发言？");
    expect(markup).toContain("提交 Bug 反馈");
    expect(markup).toContain('aria-label="关闭问题帮助"');
    expect(markup).not.toContain("isSpaceArchived");
  });
});
