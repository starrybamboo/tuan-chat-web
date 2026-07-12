import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { appToast } from "@/components/common/appToast/appToast";
import { Button } from "@/components/common/Button";
import { DialogFrame } from "@/components/common/DialogFrame";
import { FieldGroup, FieldLabel, TextInput } from "@/components/common/FormField";
import { StateView } from "@/components/common/StateView";
import { InlineAlert } from "@/components/common/StatusPrimitives";
import { Tabs } from "@/components/common/Tabs";
import {
  bindEmailByVerification,
  changeEmailByVerification,
  changePasswordByEmailVerification,
  sendEmailVerificationCode,
} from "@/utils/auth/accountSecurityApi";

import { useGetMyUserInfoQuery } from "../../../../../api/hooks/UserHooks";
import { useVerificationCodeCooldown } from "../../../auth/useVerificationCodeCooldown";

export type SecurityTab = "password" | "email";

type AccountSecurityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTab: SecurityTab;
}

function isEmailLike(value: string): boolean {
  const trimmed = value.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    return false;
  }
  const domain = trimmed.slice(atIndex + 1);
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

/** 发送验证码结果的无障碍宣告（视觉隐藏，供屏幕阅读器播报）。 */
function renderSendCodeStatus(isPending: boolean, isCoolingDown: boolean, email: string) {
  const target = email.trim() || "邮箱";
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {isPending
        ? "正在发送验证码"
        : isCoolingDown
          ? `验证码已发送到 ${target}`
          : ""}
    </span>
  );
}

export function AccountSecurityModal({
  isOpen,
  onClose,
  initialTab,
}: AccountSecurityModalProps) {
  const [activeTab, setActiveTab] = useState<SecurityTab>(initialTab);
  const queryClient = useQueryClient();

  const myInfoQuery = useGetMyUserInfoQuery({
    enabled: isOpen,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const me = myInfoQuery.data?.data;
  const currentEmail = useMemo(() => (me?.email || "").trim(), [me?.email]);
  const hasBoundEmail = currentEmail.length > 0;

  const passwordCooldown = useVerificationCodeCooldown(60);
  const bindCooldown = useVerificationCodeCooldown(60);
  const oldEmailCooldown = useVerificationCodeCooldown(60);
  const newEmailCooldown = useVerificationCodeCooldown(60);

  const [passwordCode, setPasswordCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [bindEmail, setBindEmail] = useState("");
  const [bindCode, setBindCode] = useState("");

  const [oldEmailCode, setOldEmailCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmailCode, setNewEmailCode] = useState("");

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => setActiveTab(initialTab));
    }
  }, [initialTab, isOpen]);

  const sendPasswordCodeMutation = useMutation({
    mutationFn: () =>
      sendEmailVerificationCode({
        email: currentEmail,
        purpose: "CHANGE_PASSWORD",
        authenticated: true,
      }),
    onSuccess: () => {
      passwordCooldown.startCooldown();
      appToast.success("验证码已发送，请查收邮箱");
    },
    onError: (error) => {
      appToast.error(getErrorMessage(error, "验证码发送失败，请重试"));
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      changePasswordByEmailVerification({
        email: currentEmail,
        code: passwordCode.trim(),
        newPassword,
      }),
    onSuccess: () => {
      setPasswordCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      appToast.success("密码修改成功");
    },
    onError: (error) => {
      appToast.error(getErrorMessage(error, "密码修改失败，请重试"));
    },
  });

  const sendBindCodeMutation = useMutation({
    mutationFn: () =>
      sendEmailVerificationCode({
        email: bindEmail.trim(),
        purpose: "BIND_EMAIL",
        authenticated: true,
      }),
    onSuccess: () => {
      bindCooldown.startCooldown();
      appToast.success("验证码已发送，请查收邮箱");
    },
    onError: (error) => {
      appToast.error(getErrorMessage(error, "验证码发送失败，请重试"));
    },
  });

  const bindEmailMutation = useMutation({
    mutationFn: () =>
      bindEmailByVerification({
        email: bindEmail.trim(),
        code: bindCode.trim(),
      }),
    onSuccess: () => {
      setBindCode("");
      queryClient.invalidateQueries({ queryKey: ["getMyUserInfo"] });
      queryClient.invalidateQueries({ queryKey: ["getUserProfileInfo"] });
      appToast.success("邮箱绑定成功");
    },
    onError: (error) => {
      appToast.error(getErrorMessage(error, "邮箱绑定失败，请重试"));
    },
  });

  const sendOldEmailCodeMutation = useMutation({
    mutationFn: () =>
      sendEmailVerificationCode({
        email: currentEmail,
        purpose: "CHANGE_EMAIL_OLD",
        authenticated: true,
      }),
    onSuccess: () => {
      oldEmailCooldown.startCooldown();
      appToast.success("旧邮箱验证码已发送");
    },
    onError: (error) => {
      appToast.error(getErrorMessage(error, "验证码发送失败，请重试"));
    },
  });

  const sendNewEmailCodeMutation = useMutation({
    mutationFn: () =>
      sendEmailVerificationCode({
        email: newEmail.trim(),
        purpose: "CHANGE_EMAIL_NEW",
        authenticated: true,
      }),
    onSuccess: () => {
      newEmailCooldown.startCooldown();
      appToast.success("新邮箱验证码已发送");
    },
    onError: (error) => {
      appToast.error(getErrorMessage(error, "验证码发送失败，请重试"));
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: () =>
      changeEmailByVerification({
        oldEmail: currentEmail,
        oldCode: oldEmailCode.trim(),
        newEmail: newEmail.trim(),
        newCode: newEmailCode.trim(),
      }),
    onSuccess: () => {
      setOldEmailCode("");
      setNewEmail("");
      setNewEmailCode("");
      queryClient.invalidateQueries({ queryKey: ["getMyUserInfo"] });
      queryClient.invalidateQueries({ queryKey: ["getUserProfileInfo"] });
      appToast.success("邮箱换绑成功");
    },
    onError: (error) => {
      appToast.error(getErrorMessage(error, "邮箱换绑失败，请重试"));
    },
  });

  const handleChangePassword = () => {
    if (!hasBoundEmail) {
      appToast.error("请先绑定邮箱后再修改密码");
      return;
    }
    if (!passwordCode.trim()) {
      appToast.error("请输入邮箱验证码");
      return;
    }
    if (!newPassword) {
      appToast.error("请输入新密码");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      appToast.error("两次输入的密码不一致");
      return;
    }
    changePasswordMutation.mutate();
  };

  const handleBindEmail = () => {
    if (!isEmailLike(bindEmail)) {
      appToast.error("请输入正确的邮箱地址");
      return;
    }
    if (!bindCode.trim()) {
      appToast.error("请输入邮箱验证码");
      return;
    }
    bindEmailMutation.mutate();
  };

  const handleChangeEmail = () => {
    if (!hasBoundEmail) {
      appToast.error("当前账号尚未绑定邮箱");
      return;
    }
    if (!oldEmailCode.trim()) {
      appToast.error("请输入旧邮箱验证码");
      return;
    }
    if (!isEmailLike(newEmail)) {
      appToast.error("请输入正确的新邮箱地址");
      return;
    }
    if (newEmail.trim() === currentEmail) {
      appToast.error("新邮箱不能与旧邮箱相同");
      return;
    }
    if (!newEmailCode.trim()) {
      appToast.error("请输入新邮箱验证码");
      return;
    }
    changeEmailMutation.mutate();
  };

  const isAnySubmitting
    = changePasswordMutation.isPending
      || bindEmailMutation.isPending
      || changeEmailMutation.isPending;

  const passwordCurrentEmailInputId = "account-security-password-current-email";
  const passwordCodeInputId = "account-security-password-code";
  const newPasswordInputId = "account-security-new-password";
  const confirmNewPasswordInputId = "account-security-confirm-new-password";
  const bindEmailInputId = "account-security-bind-email";
  const bindCodeInputId = "account-security-bind-code";
  const oldEmailInputId = "account-security-old-email";
  const oldEmailCodeInputId = "account-security-old-email-code";
  const newEmailInputId = "account-security-new-email";
  const newEmailCodeInputId = "account-security-new-email-code";

  return (
    <DialogFrame
      open={isOpen}
      mode="native"
      onClose={onClose}
      ariaLabel="账号安全"
      panelClassName="max-w-2xl bg-base-100 dark:bg-base-300"
    >
        <h3 className="text-xl font-semibold mb-4">账号安全</h3>

        <Tabs
          value={activeTab}
          ariaLabel="账号安全操作"
          className="mb-4"
          options={[
            { value: "password", label: "修改密码" },
            { value: "email", label: "绑定/换绑邮箱" },
          ]}
          onValueChange={setActiveTab}
        />

        {myInfoQuery.isLoading
          ? (
              <StateView loading title="正在加载账号信息" className="py-12" />
            )
          : (
              <div className="space-y-4">
                {activeTab === "password" && (
                  <>
                    {!hasBoundEmail
                      ? (
                          <InlineAlert tone="warning">
                            <span>当前账号尚未绑定邮箱，请先完成邮箱绑定。</span>
                          </InlineAlert>
                        )
                      : (
                          <>
                            <FieldGroup>
                              <FieldLabel htmlFor={passwordCurrentEmailInputId}>已绑定邮箱</FieldLabel>
                              <TextInput
                                id={passwordCurrentEmailInputId}
                                type="text"
                                surface="muted"
                                value={currentEmail}
                                disabled
                              />
                            </FieldGroup>

                            <FieldGroup>
                              <FieldLabel htmlFor={passwordCodeInputId}>邮箱验证码</FieldLabel>
                              <div className="flex gap-2">
                                <TextInput
                                  id={passwordCodeInputId}
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="one-time-code"
                                  className="flex-1"
                                  placeholder="请输入验证码"
                                  value={passwordCode}
                                  onChange={e => setPasswordCode(e.target.value)}
                                  aria-label="修改密码验证码"
                                />
                                <Button
                                  variant="outline"
                                  className="whitespace-nowrap"
                                  onClick={() => sendPasswordCodeMutation.mutate()}
                                  aria-busy={sendPasswordCodeMutation.isPending}
                                  disabled={
                                    sendPasswordCodeMutation.isPending
                                    || passwordCooldown.isCoolingDown
                                  }
                                >
                                  {sendPasswordCodeMutation.isPending
                                    ? "发送中..."
                                    : passwordCooldown.isCoolingDown
                                      ? `${passwordCooldown.remainingSeconds}s`
                                      : "发送验证码"}
                                </Button>
                                {renderSendCodeStatus(sendPasswordCodeMutation.isPending, passwordCooldown.isCoolingDown, currentEmail)}
                              </div>
                            </FieldGroup>

                            <FieldGroup>
                              <FieldLabel htmlFor={newPasswordInputId}>新密码</FieldLabel>
                              <TextInput
                                id={newPasswordInputId}
                                type="password"
                                autoComplete="new-password"
                                placeholder="请输入新密码"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                              />
                            </FieldGroup>

                            <FieldGroup>
                              <FieldLabel htmlFor={confirmNewPasswordInputId}>确认新密码</FieldLabel>
                              <TextInput
                                id={confirmNewPasswordInputId}
                                type="password"
                                autoComplete="new-password"
                                placeholder="请再次输入新密码"
                                value={confirmNewPassword}
                                onChange={e => setConfirmNewPassword(e.target.value)}
                              />
                            </FieldGroup>

                            <Button
                              variant="primary"
                              className="w-full mt-2"
                              onClick={handleChangePassword}
                              disabled={isAnySubmitting}
                            >
                              {changePasswordMutation.isPending ? "提交中..." : "确认修改密码"}
                            </Button>
                          </>
                        )}
                  </>
                )}

                {activeTab === "email" && (
                  <>
                    {!hasBoundEmail
                      ? (
                          <>
                            <FieldGroup>
                              <FieldLabel htmlFor={bindEmailInputId}>邮箱</FieldLabel>
                              <TextInput
                                id={bindEmailInputId}
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                placeholder="请输入要绑定的邮箱"
                                value={bindEmail}
                                onChange={e => setBindEmail(e.target.value)}
                              />
                            </FieldGroup>

                            <FieldGroup>
                              <FieldLabel htmlFor={bindCodeInputId}>邮箱验证码</FieldLabel>
                              <div className="flex gap-2">
                                <TextInput
                                  id={bindCodeInputId}
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="one-time-code"
                                  className="flex-1"
                                  placeholder="请输入验证码"
                                  value={bindCode}
                                  onChange={e => setBindCode(e.target.value)}
                                />
                                <Button
                                  variant="outline"
                                  className="whitespace-nowrap"
                                  onClick={() => {
                                    if (!isEmailLike(bindEmail)) {
                                      appToast.error("请输入正确的邮箱地址");
                                      return;
                                    }
                                    sendBindCodeMutation.mutate();
                                  }}
                                  disabled={
                                    sendBindCodeMutation.isPending
                                    || bindCooldown.isCoolingDown
                                  }
                                >
                                  {sendBindCodeMutation.isPending
                                    ? "发送中..."
                                    : bindCooldown.isCoolingDown
                                      ? `${bindCooldown.remainingSeconds}s`
                                      : "发送验证码"}
                                </Button>
                                {renderSendCodeStatus(sendBindCodeMutation.isPending, bindCooldown.isCoolingDown, bindEmail)}
                              </div>
                            </FieldGroup>

                            <Button
                              variant="primary"
                              className="w-full mt-2"
                              onClick={handleBindEmail}
                              disabled={isAnySubmitting}
                            >
                              {bindEmailMutation.isPending ? "提交中..." : "确认绑定邮箱"}
                            </Button>
                          </>
                        )
                      : (
                          <>
                            <FieldGroup>
                              <FieldLabel htmlFor={oldEmailInputId}>旧邮箱</FieldLabel>
                              <TextInput
                                id={oldEmailInputId}
                                type="text"
                                surface="muted"
                                value={currentEmail}
                                disabled
                              />
                            </FieldGroup>

                            <FieldGroup>
                              <FieldLabel htmlFor={oldEmailCodeInputId}>旧邮箱验证码</FieldLabel>
                              <div className="flex gap-2">
                                <TextInput
                                  id={oldEmailCodeInputId}
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="one-time-code"
                                  className="flex-1"
                                  placeholder="请输入旧邮箱验证码"
                                  value={oldEmailCode}
                                  onChange={e => setOldEmailCode(e.target.value)}
                                />
                                <Button
                                  variant="outline"
                                  className="whitespace-nowrap"
                                  onClick={() => sendOldEmailCodeMutation.mutate()}
                                  disabled={
                                    sendOldEmailCodeMutation.isPending
                                    || oldEmailCooldown.isCoolingDown
                                  }
                                >
                                  {sendOldEmailCodeMutation.isPending
                                    ? "发送中..."
                                    : oldEmailCooldown.isCoolingDown
                                      ? `${oldEmailCooldown.remainingSeconds}s`
                                      : "发送验证码"}
                                </Button>
                                {renderSendCodeStatus(sendOldEmailCodeMutation.isPending, oldEmailCooldown.isCoolingDown, currentEmail)}
                              </div>
                            </FieldGroup>

                            <FieldGroup>
                              <FieldLabel htmlFor={newEmailInputId}>新邮箱</FieldLabel>
                              <TextInput
                                id={newEmailInputId}
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                placeholder="请输入新邮箱地址"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                              />
                            </FieldGroup>

                            <FieldGroup>
                              <FieldLabel htmlFor={newEmailCodeInputId}>新邮箱验证码</FieldLabel>
                              <div className="flex gap-2">
                                <TextInput
                                  id={newEmailCodeInputId}
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="one-time-code"
                                  className="flex-1"
                                  placeholder="请输入新邮箱验证码"
                                  value={newEmailCode}
                                  onChange={e => setNewEmailCode(e.target.value)}
                                />
                                <Button
                                  variant="outline"
                                  className="whitespace-nowrap"
                                  onClick={() => {
                                    if (!isEmailLike(newEmail)) {
                                      appToast.error("请输入正确的新邮箱地址");
                                      return;
                                    }
                                    sendNewEmailCodeMutation.mutate();
                                  }}
                                  disabled={
                                    sendNewEmailCodeMutation.isPending
                                    || newEmailCooldown.isCoolingDown
                                  }
                                >
                                  {sendNewEmailCodeMutation.isPending
                                    ? "发送中..."
                                    : newEmailCooldown.isCoolingDown
                                      ? `${newEmailCooldown.remainingSeconds}s`
                                      : "发送验证码"}
                                </Button>
                                {renderSendCodeStatus(sendNewEmailCodeMutation.isPending, newEmailCooldown.isCoolingDown, newEmail)}
                              </div>
                            </FieldGroup>

                            <Button
                              variant="primary"
                              className="w-full mt-2"
                              onClick={handleChangeEmail}
                              disabled={isAnySubmitting}
                            >
                              {changeEmailMutation.isPending ? "提交中..." : "确认换绑邮箱"}
                            </Button>
                          </>
                        )}
                  </>
                )}
              </div>
            )}
    </DialogFrame>
  );
}
