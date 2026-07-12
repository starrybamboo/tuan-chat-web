import type { ReactNode } from "react";

import { ArrowRightIcon } from "@phosphor-icons/react";

import { Button } from "@/components/common/Button";
import { FormField, TextInput } from "@/components/common/FormField";

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
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField id={emailInputId} label="邮箱" required>
        {controlProps => (
          <TextInput
            {...controlProps}
            type="email"
            name="forgot_password_email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="请输入已绑定邮箱"
            surface="muted"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        )}
      </FormField>

      <div className="space-y-3 pt-2">
        {turnstile}
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          icon={<ArrowRightIcon className="size-4" weight="regular" />}
          className="w-full gap-2 shadow-sm hover:brightness-110"
          disabled={isLoading}
        >
          {isLoading ? "提交中..." : "确认"}
        </Button>
      </div>
    </form>
  );
}
