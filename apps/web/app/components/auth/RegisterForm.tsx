import type { ReactNode } from "react";

import { ArrowRightIcon } from "@phosphor-icons/react";

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
  const fieldLabelClass = "text-xs font-medium uppercase tracking-[0.08em] text-base-content/55";
  const inputClassName = `
    input input-bordered w-full bg-base-200 text-base-content
    placeholder:text-base-content/55 transition-colors
    focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
    dark:bg-base-300
  `;

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={usernameInputId}>
          用户名
        </label>
        <input
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
          required
        />
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={emailInputId}>
          邮箱
        </label>
        <input
          id={emailInputId}
          name="registerEmail"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="请输入邮箱地址"
          className={inputClassName}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={inviteCodeInputId}>
          邀请码（选填）
        </label>
        <input
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
          maxLength={32}
        />
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={verificationCodeInputId}>
          邮箱验证码
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={verificationCodeInputId}
            name="registerEmailVerificationCode"
            type="text"
            autoComplete="one-time-code"
            placeholder="请输入验证码"
            className={`${inputClassName} sm:flex-1`}
            value={verificationCode}
            onChange={e => setVerificationCode(e.target.value)}
            required
          />
          <button
            type="button"
            className="btn btn-outline w-full whitespace-nowrap sm:w-auto"
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
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={passwordInputId}>
          密码
        </label>
        <input
          id={passwordInputId}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="请输入密码"
          className={inputClassName}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass} htmlFor={confirmPasswordInputId}>
          确认密码
        </label>
        <input
          id={confirmPasswordInputId}
          name="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          placeholder="请再次输入密码"
          className={inputClassName}
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      <div className="space-y-3 pt-2">
        {turnstile}
        <button
          type="submit"
          className="btn btn-primary w-full gap-2 shadow-sm hover:brightness-110"
          disabled={isLoading}
        >
          {isLoading
            ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  注册中...
                </>
              )
            : (
                <>
                  <ArrowRightIcon className="size-4" weight="bold" />
                  注册
                </>
              )}
        </button>
      </div>
    </form>
  );
}
