import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AlertMessage } from "./AlertMessage";

describe("AlertMessage", () => {
  it("renders accessible error and success alerts", () => {
    const html = renderToStaticMarkup(createElement(AlertMessage, {
      errorMessage: "登录失败",
      successMessage: "登录成功",
    }));

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("登录失败");
    expect(html).toContain("登录成功");
  });
});
