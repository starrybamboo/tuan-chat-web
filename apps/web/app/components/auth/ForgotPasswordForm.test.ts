import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ForgotPasswordForm } from "./ForgotPasswordForm";

function renderForgotPasswordForm() {
  return renderToStaticMarkup(createElement(ForgotPasswordForm, {
    email: "test@example.com",
    setEmail: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    turnstile: createElement("div", { "data-testid": "turnstile" }),
  }));
}

describe("ForgotPasswordForm", () => {
  it("associates the email label with the email input", () => {
    const html = renderForgotPasswordForm();

    expect(html).toContain("邮箱");
    expect(html).toContain('for="forgot-password-email"');
    expect(html).toContain('id="forgot-password-email"');
    expect(html).toContain('type="email"');
    expect(html).toContain('data-testid="turnstile"');
  });
});
