import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  isPureNumericUsername,
  RegisterForm,
  resolveRegisterInviteCodeError,
  resolveRegisterPasswordError,
  resolveRegisterUsernameError,
} from "./RegisterForm";

function renderRegisterForm({
  inviteCode = "",
  password = "secret123",
  username,
}: {
  inviteCode?: string;
  password?: string;
  username: string;
}) {
  return renderToStaticMarkup(createElement(RegisterForm, {
    username,
    setUsername: vi.fn(),
    email: "test@example.com",
    setEmail: vi.fn(),
    inviteCode,
    setInviteCode: vi.fn(),
    verificationCode: "123456",
    setVerificationCode: vi.fn(),
    sendVerificationCode: vi.fn(),
    isSendingVerificationCode: false,
    isVerificationCodeCoolingDown: false,
    verificationCodeCooldownSeconds: 0,
    password,
    setPassword: vi.fn(),
    confirmPassword: password,
    setConfirmPassword: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    turnstile: createElement("div", { "data-testid": "turnstile" }),
  }));
}

describe("RegisterForm", () => {
  it("shows a modern right-side status when username is pure numeric", () => {
    const html = renderRegisterForm({ username: "123456" });

    expect(html).toContain("非纯数字");
    expect(html).toContain("用户名不能为纯数字");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="register-username-error"');
    expect(html).toContain("sr-only");
  });

  it("allows usernames that include non-numeric characters", () => {
    expect(isPureNumericUsername("t123456")).toBe(false);
    expect(isPureNumericUsername("用户123")).toBe(false);
    expect(renderRegisterForm({ username: "t123456" })).not.toContain("用户名不能为纯数字");
    expect(renderRegisterForm({ username: "t123456" })).toContain("7/20");
  });

  it("matches backend username validation boundaries", () => {
    expect(resolveRegisterUsernameError("")).toBe("用户名不能为空");
    expect(resolveRegisterUsernameError("abcdefghijklmnopqrstu")).toBe("用户名长度不能超过20个字符");
    expect(resolveRegisterUsernameError("123456")).toBe("用户名不能为纯数字");
    expect(resolveRegisterUsernameError("灯")).toBe("");
  });

  it("matches backend password length validation boundaries", () => {
    expect(resolveRegisterPasswordError("")).toBe("密码不能为空");
    expect(resolveRegisterPasswordError("12345")).toBe("密码长度必须在6-20个字符之间");
    expect(resolveRegisterPasswordError("123456789012345678901")).toBe("密码长度必须在6-20个字符之间");
    expect(resolveRegisterPasswordError("123456")).toBe("");
  });

  it("renders invite code over-limit as a right-side status and disables submit", () => {
    const html = renderRegisterForm({
      inviteCode: "a".repeat(33),
      username: "alice",
    });

    expect(resolveRegisterInviteCodeError("a".repeat(33))).toBe("邀请码长度不能超过32个字符");
    expect(resolveRegisterInviteCodeError("a".repeat(32))).toBe("");
    expect(html).toContain("33/32");
    expect(html).toContain('aria-describedby="register-invite-code-error"');
    expect(html).toContain("disabled");
  });

  it("renders password and confirmation status inside the input", () => {
    const html = renderRegisterForm({
      password: "123456",
      username: "alice",
    });

    expect(html).toContain("6/20");
    expect(html).toContain("一致");
  });

  it("uses the max password length as the denominator when password is too long", () => {
    const html = renderRegisterForm({
      password: "1".repeat(21),
      username: "alice",
    });

    expect(html).toContain("21/20");
    expect(html).not.toContain("21/6");
  });
});
