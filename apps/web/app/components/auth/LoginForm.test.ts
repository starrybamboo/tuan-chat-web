import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "./LoginForm";

vi.mock("motion/react", () => ({
  motion: {
    div: "div",
  },
}));

function renderLoginForm() {
  return renderToStaticMarkup(createElement(LoginForm, {
    username: "demo-user",
    setUsername: vi.fn(),
    password: "secret",
    setPassword: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    turnstile: createElement("div", { "data-testid": "turnstile" }),
  }));
}

describe("LoginForm", () => {
  it("renders username login fields and visible password toggle", () => {
    const html = renderLoginForm();

    expect(html).toContain("用户名 / 用户 ID");
    expect(html).not.toContain("用户 ID 登录");
    expect(html).toContain('aria-label="显示密码"');
    expect(html).toContain('for="login-username"');
    expect(html).toContain('id="login-username"');
    expect(html).toContain('for="login-password"');
    expect(html).toContain('id="login-password"');
    expect(html).toContain('name="login_username"');
    expect(html).toContain('name="login_password_username"');
    expect(html).toContain('autoComplete="section-login-username username"');
    expect(html).toContain('autoComplete="section-login-username current-password"');
    expect(html).toContain('data-testid="turnstile"');
  });
});
