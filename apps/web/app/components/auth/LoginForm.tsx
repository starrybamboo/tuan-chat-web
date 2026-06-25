import type { ReactNode } from "react";

import { ArrowRightIcon, IdentificationCardIcon, UserIcon } from "@phosphor-icons/react";
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
  loginMethod: "username" | "userId";
  setLoginMethod: (method: "username" | "userId") => void;
  turnstile?: ReactNode;
}

const LOGIN_METHOD_OPTIONS = [
  {
    value: "username" as const,
    label: "用户名登录",
    icon: UserIcon,
  },
  {
    value: "userId" as const,
    label: "用户 ID 登录",
    icon: IdentificationCardIcon,
  },
] as const;

export function LoginForm({
  username = "",
  setUsername,
  password,
  setPassword,
  handleSubmit,
  isLoading,
  loginMethod,
  setLoginMethod,
  turnstile,
}: LoginFormProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const accountInputName = loginMethod === "username" ? "login_username" : "login_user_id";
  const accountAutocomplete = loginMethod === "username"
    ? "section-login-username username"
    : "section-login-userid username";
  const passwordInputName = loginMethod === "username" ? "login_password_username" : "login_password_userid";
  const passwordAutocomplete = loginMethod === "username"
    ? "section-login-username current-password"
    : "section-login-userid current-password";

  useEffect(() => {
    setIsPasswordVisible(false);
  }, [loginMethod]);

  const inputClassName = `
    input input-bordered w-full bg-base-200 text-base-content
    placeholder:text-base-content/55 transition-colors
    focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
    dark:bg-base-300
  `;

  return (
    <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.02 }}
      >
        <div className="grid grid-cols-2 gap-2 rounded-box border border-base-300 bg-base-200/80 p-1 dark:border-base-200 dark:bg-base-300/80">
          {LOGIN_METHOD_OPTIONS.map((option) => {
            const selected = loginMethod === option.value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                className={`
                  inline-flex h-10 items-center justify-center gap-2 rounded-md px-3
                  text-sm font-medium transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20
                  ${
                    selected
                      ? "border border-primary/25 bg-base-100 text-primary shadow-sm"
                      : "border border-transparent bg-transparent text-base-content/70 hover:border-base-300 hover:bg-base-100/70 hover:text-base-content"
                  }
                `}
                onClick={() => {
                  setLoginMethod(option.value);
                  setUsername("");
                }}
              >
                <Icon className="size-4 shrink-0" weight="bold" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08 }}
      >
        <label className="text-xs font-medium uppercase tracking-[0.08em] text-base-content/55">
          {loginMethod === "username" ? "用户名" : "用户 ID"}
        </label>
        <input
          type="text"
          name={accountInputName}
          autoComplete={accountAutocomplete}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={loginMethod === "username" ? "请输入用户名" : "请输入用户 ID"}
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
        <label className="text-xs font-medium uppercase tracking-[0.08em] text-base-content/55">
          密码
        </label>
        <div className="relative">
          <input
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
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20
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
                  <ArrowRightIcon className="size-4" weight="bold" />
                  登录
                </>
              )}
        </button>
      </motion.div>
    </form>
  );
}
