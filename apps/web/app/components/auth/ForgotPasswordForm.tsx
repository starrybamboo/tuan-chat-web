import type { ReactNode } from "react";

import { ArrowRightIcon } from "@phosphor-icons/react";

type ForgotPasswordFormProps = {
  email: string;
  setEmail: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  turnstile?: ReactNode;
}

export function ForgotPasswordForm({
  email,
  setEmail,
  handleSubmit,
  isLoading,
  turnstile,
}: ForgotPasswordFormProps) {
  const emailInputId = "forgot-password-email";
  const inputClassName = `
    input input-bordered w-full bg-base-200 text-base-content
    placeholder:text-base-content/55 transition-colors
    focus:border-info focus:outline-none focus:ring-2 focus:ring-info/20
    dark:bg-base-300
  `;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-[0.08em] text-base-content/55" htmlFor={emailInputId}>
          邮箱
        </label>
        <input
          id={emailInputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="请输入已绑定邮箱"
          className={inputClassName}
          value={email}
          onChange={e => setEmail(e.target.value)}
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
                  提交中...
                </>
              )
            : (
                <>
                  <ArrowRightIcon className="size-4" weight="regular" />
                  确认
                </>
              )}
        </button>
      </div>
    </form>
  );
}
