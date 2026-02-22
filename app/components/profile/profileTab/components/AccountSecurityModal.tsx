import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  bindEmailByVerification,
  changeEmailByVerification,
  changePasswordByEmailVerification,
  sendEmailVerificationCode,
} from "@/utils/auth/accountSecurityApi";
import { useGetMyUserInfoQuery } from "../../../../../api/hooks/UserHooks";
import { useVerificationCodeCooldown } from "../../../auth/useVerificationCodeCooldown";

export type SecurityTab = "password" | "email";

interface AccountSecurityModalProps {
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
      setActiveTab(initialTab);
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
      toast.success("验证码已发送，请查收邮箱");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "验证码发送失败，请重试"));
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
      toast.success("密码修改成功");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "密码修改失败，请重试"));
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
      toast.success("验证码已发送，请查收邮箱");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "验证码发送失败，请重试"));
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
      toast.success("邮箱绑定成功");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "邮箱绑定失败，请重试"));
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
      toast.success("旧邮箱验证码已发送");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "验证码发送失败，请重试"));
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
      toast.success("新邮箱验证码已发送");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "验证码发送失败，请重试"));
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
      toast.success("邮箱换绑成功");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "邮箱换绑失败，请重试"));
    },
  });

  const handleChangePassword = () => {
    if (!hasBoundEmail) {
      toast.error("请先绑定邮箱后再修改密码");
      return;
    }
    if (!passwordCode.trim()) {
      toast.error("请输入邮箱验证码");
      return;
    }
    if (!newPassword) {
      toast.error("请输入新密码");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    changePasswordMutation.mutate();
  };

  const handleBindEmail = () => {
    if (!isEmailLike(bindEmail)) {
      toast.error("请输入正确的邮箱地址");
      return;
    }
    if (!bindCode.trim()) {
      toast.error("请输入邮箱验证码");
      return;
    }
    bindEmailMutation.mutate();
  };

  const handleChangeEmail = () => {
    if (!hasBoundEmail) {
      toast.error("当前账号尚未绑定邮箱");
      return;
    }
    if (!oldEmailCode.trim()) {
      toast.error("请输入旧邮箱验证码");
      return;
    }
    if (!isEmailLike(newEmail)) {
      toast.error("请输入正确的新邮箱地址");
      return;
    }
    if (newEmail.trim() === currentEmail) {
      toast.error("新邮箱不能与旧邮箱相同");
      return;
    }
    if (!newEmailCode.trim()) {
      toast.error("请输入新邮箱验证码");
      return;
    }
    changeEmailMutation.mutate();
  };

  const isAnySubmitting
    = changePasswordMutation.isPending
      || bindEmailMutation.isPending
      || changeEmailMutation.isPending;

  return (
    <div className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box relative bg-base-100 dark:bg-base-300 max-w-xl">
        <button
          type="button"
          className="btn btn-sm btn-circle absolute right-2 top-2 bg-base-200 hover:bg-base-300 dark:bg-base-200 dark:hover:bg-base-100"
          onClick={onClose}
        >
          ✕
        </button>

        <h3 className="text-xl font-semibold mb-4">账号安全</h3>

        <div className="tabs tabs-boxed mb-4">
          <button
            type="button"
            className={`tab ${activeTab === "password" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("password")}
          >
            修改密码
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "email" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("email")}
          >
            绑定/换绑邮箱
          </button>
        </div>

        {myInfoQuery.isLoading
          ? (
              <div className="flex items-center justify-center py-12">
                <span className="loading loading-spinner"></span>
              </div>
            )
          : (
              <div className="space-y-4">
                {activeTab === "password" && (
                  <>
                    {!hasBoundEmail
                      ? (
                          <div className="alert alert-warning">
                            <span>当前账号尚未绑定邮箱，请先完成邮箱绑定。</span>
                          </div>
                        )
                      : (
                          <>
                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">已绑定邮箱</span>
                              </label>
                              <input
                                type="text"
                                className="input input-bordered bg-base-200"
                                value={currentEmail}
                                disabled
                              />
                            </div>

                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">邮箱验证码</span>
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  className="input input-bordered flex-1"
                                  placeholder="请输入验证码"
                                  value={passwordCode}
                                  onChange={e => setPasswordCode(e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline whitespace-nowrap"
                                  onClick={() => sendPasswordCodeMutation.mutate()}
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
                                </button>
                              </div>
                            </div>

                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">新密码</span>
                              </label>
                              <input
                                type="password"
                                className="input input-bordered"
                                placeholder="请输入新密码"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                              />
                            </div>

                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">确认新密码</span>
                              </label>
                              <input
                                type="password"
                                className="input input-bordered"
                                placeholder="请再次输入新密码"
                                value={confirmNewPassword}
                                onChange={e => setConfirmNewPassword(e.target.value)}
                              />
                            </div>

                            <button
                              type="button"
                              className="btn btn-primary w-full mt-2"
                              onClick={handleChangePassword}
                              disabled={isAnySubmitting}
                            >
                              {changePasswordMutation.isPending ? "提交中..." : "确认修改密码"}
                            </button>
                          </>
                        )}
                  </>
                )}

                {activeTab === "email" && (
                  <>
                    {!hasBoundEmail
                      ? (
                          <>
                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">邮箱</span>
                              </label>
                              <input
                                type="email"
                                className="input input-bordered"
                                placeholder="请输入要绑定的邮箱"
                                value={bindEmail}
                                onChange={e => setBindEmail(e.target.value)}
                              />
                            </div>

                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">邮箱验证码</span>
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  className="input input-bordered flex-1"
                                  placeholder="请输入验证码"
                                  value={bindCode}
                                  onChange={e => setBindCode(e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline whitespace-nowrap"
                                  onClick={() => {
                                    if (!isEmailLike(bindEmail)) {
                                      toast.error("请输入正确的邮箱地址");
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
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn-primary w-full mt-2"
                              onClick={handleBindEmail}
                              disabled={isAnySubmitting}
                            >
                              {bindEmailMutation.isPending ? "提交中..." : "确认绑定邮箱"}
                            </button>
                          </>
                        )
                      : (
                          <>
                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">旧邮箱</span>
                              </label>
                              <input
                                type="text"
                                className="input input-bordered bg-base-200"
                                value={currentEmail}
                                disabled
                              />
                            </div>

                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">旧邮箱验证码</span>
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  className="input input-bordered flex-1"
                                  placeholder="请输入旧邮箱验证码"
                                  value={oldEmailCode}
                                  onChange={e => setOldEmailCode(e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline whitespace-nowrap"
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
                                </button>
                              </div>
                            </div>

                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">新邮箱</span>
                              </label>
                              <input
                                type="email"
                                className="input input-bordered"
                                placeholder="请输入新邮箱地址"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                              />
                            </div>

                            <div className="form-control">
                              <label className="label">
                                <span className="label-text">新邮箱验证码</span>
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  className="input input-bordered flex-1"
                                  placeholder="请输入新邮箱验证码"
                                  value={newEmailCode}
                                  onChange={e => setNewEmailCode(e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline whitespace-nowrap"
                                  onClick={() => {
                                    if (!isEmailLike(newEmail)) {
                                      toast.error("请输入正确的新邮箱地址");
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
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn-primary w-full mt-2"
                              onClick={handleChangeEmail}
                              disabled={isAnySubmitting}
                            >
                              {changeEmailMutation.isPending ? "提交中..." : "确认换绑邮箱"}
                            </button>
                          </>
                        )}
                  </>
                )}
              </div>
            )}
      </div>

      <div className="modal-backdrop bg-black/50 dark:bg-black/70" onClick={onClose}></div>
    </div>
  );
}
