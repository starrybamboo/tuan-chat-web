import type { ReactNode } from "react";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { LockKeyhole, LockKeyholeOpen } from "@/icons";

type LoginFormProps = {
  username?: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  turnstile?: ReactNode;
}

export function LoginForm({
  username = "",
  setUsername,
  password,
  setPassword,
  handleSubmit,
  isLoading,
  turnstile,
}: LoginFormProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const accountInputId = "login-username";
  const accountInputName = "login_username";
  const accountAutocomplete = "section-login-username username";
  const passwordInputId = "login-password";
  const passwordInputName = "login_password_username";
  const passwordAutocomplete = "section-login-username current-password";

  useEffect(() => {
    setIsPasswordVisible(false);
  }, []);

  const inputClassName = `
    input input-bordered w-full bg-base-200 text-base-content
    placeholder:text-base-content/55 transition-colors
    focus:border-info focus:outline-none focus:ring-2 focus:ring-info/20
    dark:bg-base-300
  `;

  return (
    <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08 }}
      >
        <label className="text-xs font-medium uppercase tracking-[0.08em] text-base-content/55" htmlFor={accountInputId}>
          用户名 / 用户 ID
        </label>
        <input
          id={accountInputId}
          type="text"
          name={accountInputName}
          autoComplete={accountAutocomplete}
          autoCapitalize="none"
          spellCheck={false}
          placeholder="请输入用户名或用户 ID"
          className={inputClassName}
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
      </motion.div>

      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.14 }}
      >
        <label className="text-xs font-medium uppercase tracking-[0.08em] text-base-content/55" htmlFor={passwordInputId}>
          密码
        </label>
        <div className="relative">
          <input
            id={passwordInputId}
            type={isPasswordVisible ? "text" : "password"}
            name={passwordInputName}
            autoComplete={passwordAutocomplete}
            placeholder="请输入密码"
            className={`${inputClassName} pr-12`}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            aria-label={isPasswordVisible ? "隐藏密码" : "显示密码"}
            aria-pressed={isPasswordVisible}
            className="
              btn btn-ghost btn-sm btn-square absolute right-1 top-1/2
              -translate-y-1/2 text-base-content/60
              hover:bg-base-200 hover:text-base-content
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/20
            "
            onClick={() => setIsPasswordVisible(visible => !visible)}
          >
            {isPasswordVisible
              ? <LockKeyholeOpen className="size-4" />
              : <LockKeyhole className="size-4" />}
          </button>
        </div>
      </motion.div>

      <motion.div
        className="space-y-3 pt-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
      >
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
                  登录中...
                </>
              )
            : (
                <>
                  <ArrowRightIcon className="size-4" weight="regular" />
                  登录
                </>
              )}
        </button>
      </motion.div>
    </form>
  );
}
