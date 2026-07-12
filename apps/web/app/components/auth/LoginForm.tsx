import type { ReactNode } from "react";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/common/Button";
import { FormField, TextInput } from "@/components/common/FormField";
import { IconButton } from "@/components/common/IconButton";
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

function loginSectionMotionProps(delay: number) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay },
  };
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

  return (
    <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4" aria-busy={isLoading}>
      <motion.div
        {...loginSectionMotionProps(0.08)}
      >
        <FormField id={accountInputId} label="用户名 / 用户 ID">
          {controlProps => (
            <TextInput
              {...controlProps}
              type="text"
              name={accountInputName}
              autoComplete={accountAutocomplete}
              autoCapitalize="none"
              spellCheck={false}
              placeholder="请输入用户名或用户 ID"
              surface="muted"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          )}
        </FormField>
      </motion.div>

      <motion.div
        {...loginSectionMotionProps(0.14)}
      >
        <FormField id={passwordInputId} label="密码" required>
          {controlProps => (
            <div className="relative">
              <TextInput
                {...controlProps}
                type={isPasswordVisible ? "text" : "password"}
                name={passwordInputName}
                autoComplete={passwordAutocomplete}
                placeholder="请输入密码"
                surface="muted"
                className="pr-12"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <IconButton
                label={isPasswordVisible ? "隐藏密码" : "显示密码"}
                aria-pressed={isPasswordVisible}
                size="sm"
                shape="square"
                className="
                  absolute right-1 top-1/2 -translate-y-1/2 text-base-content/60
                  hover:bg-base-200 hover:text-base-content
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/20
                "
                onClick={() => setIsPasswordVisible(visible => !visible)}
                icon={isPasswordVisible
                  ? <LockKeyholeOpen className="size-4" />
                  : <LockKeyhole className="size-4" />}
              />
            </div>
          )}
        </FormField>
      </motion.div>

      <motion.div
        className="space-y-3 pt-2"
        {...loginSectionMotionProps(0.2)}
      >
        {turnstile}
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          icon={<ArrowRightIcon className="size-4" weight="regular" />}
          className="w-full gap-2 shadow-sm hover:brightness-110"
          disabled={isLoading}
        >
          {isLoading ? "登录中..." : "登录"}
        </Button>
      </motion.div>
    </form>
  );
}
