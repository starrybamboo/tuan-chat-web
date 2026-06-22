import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "./LoginForm";

vi.mock("motion/react", () => ({
  motion: {
    div: "div",
  },
}));

function renderLoginForm(loginMethod: "username" | "userId" = "username") {
  return renderToStaticMarkup(createElement(LoginForm, {
    username: "demo-user",
    setUsername: vi.fn(),
    password: "secret",
    setPassword: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    loginMethod,
    setLoginMethod: vi.fn(),
    turnstile: createElement("div", { "data-testid": "turnstile" }),
  }));
}

describe("LoginForm", () => {
  it("renders a visible password toggle and segmented login method", () => {
    const html = renderLoginForm();

    expect(html).toContain("用户名登录");
    expect(html).toContain("用户 ID 登录");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="显示密码"');
    expect(html).toContain('name="login_username"');
    expect(html).toContain('autoComplete="section-login-username username"');
    expect(html).toContain('data-testid="turnstile"');
  });

  it("switches names and autocomplete scope for userId login", () => {
    const html = renderLoginForm("userId");

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('name="login_user_id"');
    expect(html).toContain('name="login_password_userid"');
    expect(html).toContain('autoComplete="section-login-userid username"');
    expect(html).toContain('autoComplete="section-login-userid current-password"');
  });
});
