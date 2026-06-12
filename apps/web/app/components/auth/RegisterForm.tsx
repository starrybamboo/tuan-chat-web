import type { ReactNode } from "react";

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
  const fieldLabelClass = "mb-1 block text-xs font-medium text-base-content/70";

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      <div className="form-control w-full mt-2">
        <label className={fieldLabelClass} htmlFor={usernameInputId}>
          用户名
        </label>
        <input
          id={usernameInputId}
          name="registerUsername"
          type="text"
          autoComplete="off"
          placeholder="请输入用户名"
          className="
            input input-bordered w-full bg-base-200
            dark:bg-base-300
            text-base-content
            placeholder:text-base-content/60
          "
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
      </div>

      <div className="form-control w-full mt-2">
        <label className={fieldLabelClass} htmlFor={emailInputId}>
          邮箱
        </label>
        <input
          id={emailInputId}
          name="registerEmail"
          type="email"
          autoComplete="email"
          placeholder="请输入邮箱地址"
          className="
            input input-bordered w-full bg-base-200
            dark:bg-base-300
            text-base-content
            placeholder:text-base-content/60
          "
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="form-control w-full mt-2">
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
          className="
            input input-bordered w-full bg-base-200
            dark:bg-base-300
            text-base-content
            placeholder:text-base-content/60
          "
          value={inviteCode}
          onChange={e => setInviteCode(e.target.value)}
          maxLength={32}
        />
      </div>

      <div className="form-control w-full mt-2">
        <label className={fieldLabelClass} htmlFor={verificationCodeInputId}>
          邮箱验证码
        </label>
        <div className="flex gap-2">
          <input
            id={verificationCodeInputId}
            name="registerEmailVerificationCode"
            type="text"
            autoComplete="one-time-code"
            placeholder="请输入验证码"
            className="
              input input-bordered flex-1 bg-base-200
              dark:bg-base-300
              text-base-content
              placeholder:text-base-content/60
            "
            value={verificationCode}
            onChange={e => setVerificationCode(e.target.value)}
            required
          />
          <button
            type="button"
            className="btn btn-outline whitespace-nowrap"
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

      <div className="form-control w-full mt-2">
        <label className={fieldLabelClass} htmlFor={passwordInputId}>
          密码
        </label>
        <input
          id={passwordInputId}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="请输入密码"
          className="
            input input-bordered w-full bg-base-200
            dark:bg-base-300
            text-base-content
            placeholder:text-base-content/60
          "
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="form-control w-full mt-2">
        <label className={fieldLabelClass} htmlFor={confirmPasswordInputId}>
          确认密码
        </label>
        <input
          id={confirmPasswordInputId}
          name="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          placeholder="请再次输入密码"
          className="
            input input-bordered w-full bg-base-200
            dark:bg-base-300
            text-base-content
            placeholder:text-base-content/60
          "
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      <div className="form-control mt-6">
        {turnstile}
        <button
          type="submit"
          className="
            btn btn-primary
            hover:brightness-110
            transition-all
          "
          disabled={isLoading}
        >
          {isLoading
            ? (
                <>
                  <span className="loading loading-spinner"></span>
                  注册中...
                </>
              )
            : (
                "注册"
              )}
        </button>
      </div>
    </form>
  );
}
