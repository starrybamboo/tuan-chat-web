import type { ReactNode } from "react";

import { ArrowRightIcon } from "@phosphor-icons/react";

import { Button } from "@/components/common/Button";
import { formControlShellClassName, TextInput } from "@/components/common/FormField";

type RegisterFormProps = {
  username?: string;
  setUsername: (value: string) => void;
  email?: string;
  setEmail: (value: string) => void;
  inviteCode: string;
  setInviteCode: (value: string) => void;
  verificationCode: string;
  setVerificationCode: (value: string) => void;
  sendVerificationCode: () => void;
  isSendingVerificationCode: boolean;
  isVerificationCodeCoolingDown: boolean;
  verificationCodeCooldownSeconds: number;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  turnstile?: ReactNode;
}

const PURE_NUMERIC_USERNAME_PATTERN = /^\d+$/;
const MAX_USERNAME_LENGTH = 20;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 20;
const MAX_INVITE_CODE_LENGTH = 32;

type FieldValidationMeta = {
  message: string;
  tone: "muted" | "error" | "success";
};

export function isPureNumericUsername(username: string) {
  return PURE_NUMERIC_USERNAME_PATTERN.test(username.trim());
}

export function resolveRegisterUsernameError(username: string) {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    return "用户名不能为空";
  }
  if (trimmedUsername.length > MAX_USERNAME_LENGTH) {
    return "用户名长度不能超过20个字符";
  }
  if (isPureNumericUsername(trimmedUsername)) {
    return "用户名不能为纯数字";
  }
  return "";
}

export function resolveRegisterPasswordError(password: string) {
  if (!password) {
    return "密码不能为空";
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return "密码长度必须在6-20个字符之间";
  }
  return "";
}

export function resolveRegisterInviteCodeError(inviteCode: string) {
  if (inviteCode.trim().length > MAX_INVITE_CODE_LENGTH) {
    return "邀请码长度不能超过32个字符";
  }
  return "";
}

function buildCounterText(value: string, maxLength: number) {
  return `${value.trim().length}/${maxLength}`;
}

function buildUsernameMeta(username: string): FieldValidationMeta {
  if (!username.trim()) {
    return {
      message: buildCounterText(username, MAX_USERNAME_LENGTH),
      tone: "muted",
    };
  }

  const error = resolveRegisterUsernameError(username);
  if (username.trim().length > MAX_USERNAME_LENGTH) {
    return {
      message: buildCounterText(username, MAX_USERNAME_LENGTH),
      tone: "error",
    };
  }

  return {
    message: error ? "非纯数字" : buildCounterText(username, MAX_USERNAME_LENGTH),
    tone: error ? "error" : "success",
  };
}

function buildPasswordMeta(password: string): FieldValidationMeta {
  if (!password) {
    return {
      message: `${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH}`,
      tone: "muted",
    };
  }

  const error = resolveRegisterPasswordError(password);
  const targetLength = password.length < MIN_PASSWORD_LENGTH ? MIN_PASSWORD_LENGTH : MAX_PASSWORD_LENGTH;
  return {
    message: `${password.length}/${targetLength}`,
    tone: error ? "error" : "success",
  };
}

function buildConfirmPasswordMeta(password: string, confirmPassword: string): FieldValidationMeta {
  if (!confirmPassword) {
    return {
      message: "确认",
      tone: "muted",
    };
  }

  const matches = password === confirmPassword;
  return {
    message: matches ? "一致" : "不一致",
    tone: matches ? "success" : "error",
  };
}

function buildInviteCodeMeta(inviteCode: string): FieldValidationMeta {
  if (!inviteCode.trim()) {
    return {
      message: "可选",
      tone: "muted",
    };
  }

  const error = resolveRegisterInviteCodeError(inviteCode);
  return {
    message: buildCounterText(inviteCode, MAX_INVITE_CODE_LENGTH),
    tone: error ? "error" : "success",
  };
}

function validationMetaClassName(tone: FieldValidationMeta["tone"]) {
  if (tone === "error") {
    return "text-error";
  }
  if (tone === "success") {
    return "text-success";
  }
  return "text-base-content/45";
}

export function RegisterForm({
  username = "",
  setUsername,
  email = "",
  setEmail,
  inviteCode,
  setInviteCode,
  verificationCode,
  setVerificationCode,
  sendVerificationCode,
  isSendingVerificationCode,
  isVerificationCodeCoolingDown,
  verificationCodeCooldownSeconds,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  handleSubmit,
  isLoading,
  turnstile,
}: RegisterFormProps) {
  const usernameInputId = "register-username";
  const emailInputId = "register-email";
  const inviteCodeInputId = "register-invite-code";
  const verificationCodeInputId = "register-verification-code";
  const passwordInputId = "register-password";
  const confirmPasswordInputId = "register-confirm-password";
  const usernameErrorId = "register-username-error";
  const passwordErrorId = "register-password-error";
  const inviteCodeErrorId = "register-invite-code-error";
  const usernameError = username.trim() ? resolveRegisterUsernameError(username) : "";
  const passwordError = password ? resolveRegisterPasswordError(password) : "";
  const inviteCodeError = resolveRegisterInviteCodeError(inviteCode);
  const confirmPasswordError = confirmPassword && password !== confirmPassword ? "两次输入的密码不一致" : "";
  const usernameMeta = buildUsernameMeta(username);
  const passwordMeta = buildPasswordMeta(password);
  const confirmPasswordMeta = buildConfirmPasswordMeta(password, confirmPassword);
  const inviteCodeMeta = buildInviteCodeMeta(inviteCode);
  const hasInlineBlockingError = Boolean(usernameError || passwordError || confirmPasswordError || inviteCodeError);
  const fieldLabelClass = "text-xs font-medium uppercase tracking-[0.08em] text-base-content/55";
  const inputShellClassName = (hasError = false) => formControlShellClassName({
    surface: "muted",
    invalid: hasError,
  });
  const inputClassName = "flex-1 pr-20";
  const metaClassName = `
    pointer-events-none absolute right-3 top-1/2 max-w-[7.5rem] -translate-y-1/2
    truncate text-right text-xs font-semibold tabular-nums
  `;

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4" aria-busy={isLoading}>
      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={usernameInputId}>
          用户名
        </label>
        <div className={inputShellClassName(Boolean(usernameError))}>
          <TextInput
            appearance="bare"
            id={usernameInputId}
            name="registerUsername"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="请输入用户名"
            className={inputClassName}
            value={username}
            onChange={e => setUsername(e.target.value)}
            aria-describedby={usernameError ? usernameErrorId : undefined}
            aria-invalid={usernameError ? true : undefined}
            required
          />
          <span className={`${metaClassName} ${validationMetaClassName(usernameMeta.tone)}`}>
            {usernameMeta.message}
          </span>
        </div>
        {usernameError && <span id={usernameErrorId} className="sr-only">{usernameError}</span>}
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={emailInputId}>
          邮箱
        </label>
        <div className={inputShellClassName()}>
          <TextInput
            appearance="bare"
            id={emailInputId}
            name="registerEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="请输入邮箱地址"
            className="flex-1"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={inviteCodeInputId}>
          邀请码（选填）
        </label>
        <div className={inputShellClassName(Boolean(inviteCodeError))}>
          <TextInput
            appearance="bare"
            id={inviteCodeInputId}
            name="accountInviteCode"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="请输入邀请码"
            className={inputClassName}
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            aria-describedby={inviteCodeError ? inviteCodeErrorId : undefined}
            aria-invalid={inviteCodeError ? true : undefined}
            maxLength={40}
          />
          <span className={`${metaClassName} ${validationMetaClassName(inviteCodeMeta.tone)}`}>
            {inviteCodeMeta.message}
          </span>
        </div>
        {inviteCodeError && <span id={inviteCodeErrorId} className="sr-only">{inviteCodeError}</span>}
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={verificationCodeInputId}>
          邮箱验证码
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className={`${inputShellClassName()} sm:flex-1`}>
            <TextInput
              appearance="bare"
              id={verificationCodeInputId}
              name="registerEmailVerificationCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="请输入验证码"
              className="flex-1"
              value={verificationCode}
              onChange={e => setVerificationCode(e.target.value)}
              required
            />
          </div>
          <Button
            type="button"
            aria-busy={isSendingVerificationCode}
            variant="outline"
            loading={isSendingVerificationCode}
            className="w-full whitespace-nowrap sm:w-auto"
            onClick={sendVerificationCode}
            disabled={
              isSendingVerificationCode
              || isVerificationCodeCoolingDown
              || !email.trim()
            }
          >
            {isSendingVerificationCode
              ? "发送中..."
              : isVerificationCodeCoolingDown
                ? `${verificationCodeCooldownSeconds}s`
                : "发送验证码"}
          </Button>
          <span role="status" aria-live="polite" className="sr-only">
            {isSendingVerificationCode
              ? "正在发送验证码"
              : isVerificationCodeCoolingDown
                ? `验证码已发送到 ${email.trim() || "邮箱"}`
                : ""}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={passwordInputId}>
          密码
        </label>
        <div className={inputShellClassName(Boolean(passwordError))}>
          <TextInput
            appearance="bare"
            id={passwordInputId}
            name="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="请输入密码"
            className={inputClassName}
            value={password}
            onChange={e => setPassword(e.target.value)}
            aria-describedby={passwordError ? passwordErrorId : undefined}
            aria-invalid={passwordError ? true : undefined}
            required
          />
          <span className={`${metaClassName} ${validationMetaClassName(passwordMeta.tone)}`}>
            {passwordMeta.message}
          </span>
        </div>
        {passwordError && <span id={passwordErrorId} className="sr-only">{passwordError}</span>}
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={confirmPasswordInputId}>
          确认密码
        </label>
        <div className={inputShellClassName(Boolean(confirmPasswordError))}>
          <TextInput
            appearance="bare"
            id={confirmPasswordInputId}
            name="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            placeholder="请再次输入密码"
            className={inputClassName}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            aria-invalid={confirmPasswordError ? true : undefined}
            required
          />
          <span className={`${metaClassName} ${validationMetaClassName(confirmPasswordMeta.tone)}`}>
            {confirmPasswordMeta.message}
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {turnstile}
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          icon={<ArrowRightIcon className="size-4" weight="regular" />}
          className="w-full gap-2 shadow-sm hover:brightness-110"
          disabled={isLoading || hasInlineBlockingError}
        >
          {isLoading ? "注册中..." : "注册"}
        </Button>
      </div>
    </form>
  );
}
