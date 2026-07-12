import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DialogFrame } from "@/components/common/DialogFrame";
import { textLinkClassName } from "@/components/common/DesignLanguage";
import {
  requestForgotPasswordByEmail,
  sendEmailVerificationCode,
  verifyEmailVerificationCode,
} from "@/utils/auth/accountSecurityApi";
import { checkAuthStatus, getAuthStatusQueryKey, loginUser, logoutUser, registerUser } from "@/utils/auth/authapi";
import { appendPathQuery } from "@/utils/pathQuery";

import { AlertMessage } from "./AlertMessage";
import { runAuthSuccessFlow } from "./authSuccessFlow";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { LoggedInView } from "./LoggedInView";
import { LoginForm } from "./LoginForm";
import {
  RegisterForm,
  resolveRegisterInviteCodeError,
  resolveRegisterPasswordError,
  resolveRegisterUsernameError,
} from "./RegisterForm";
import { resolveRegisterInviteCodeFromLocation, withRegisterInviteCode } from "./registerInviteCode";
import { hasTurnstileSiteKey, TurnstileWidget } from "./turnstile";
import { useVerificationCodeCooldown } from "./useVerificationCodeCooldown";

type AuthMode = "login" | "register" | "forgot";
type LoginMethod = "username" | "userId";

type LoginModalProps = {
  isOpen: boolean;
  mobileCallbackEnabled?: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
}

type LoginAuthContentProps = Omit<LoginModalProps, "isOpen"> & {
  isActive: boolean;
};

type LoginPageAuthPanelProps = Omit<LoginAuthContentProps, "isActive">;

function buildMobileAuthCallbackUrl(token: string, uid?: number) {
  const callbackUrl = new URL("tuanchat://auth/callback");
  callbackUrl.searchParams.set("token", token);

  if (typeof uid === "number" && uid > 0) {
    callbackUrl.searchParams.set("userId", String(uid));
  }

  return callbackUrl.toString();
}

function resolveAuthMode(modeValue: string | null): AuthMode {
  if (modeValue === "register" || modeValue === "forgot") {
    return modeValue;
  }
  return "login";
}

const PURE_NUMERIC_LOGIN_IDENTIFIER_PATTERN = /^\d+$/;

export function resolveLoginMethod(identifier: string): LoginMethod {
  return PURE_NUMERIC_LOGIN_IDENTIFIER_PATTERN.test(identifier.trim()) ? "userId" : "username";
}

function resolveForgotPasswordErrorMessage(error: unknown): string {
  const fallback = "找回密码失败，请重试";
  const message = error instanceof Error ? error.message : fallback;
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes("用户不存在")
    || normalized.includes("未绑定")
    || normalized.includes("邮箱不存在")
    || normalized.includes("not found")
  ) {
    return "请检查邮箱是否填写正确";
  }

  return message || fallback;
}

function useTurnstileChallenge() {
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);

  const reset = useCallback(() => {
    setToken("");
    setResetKey(previous => previous + 1);
  }, []);

  return {
    reset,
    resetKey,
    setToken,
    token,
  };
}

function LoginAuthContent({ isActive, mobileCallbackEnabled = false, onClose, onAuthenticated }: LoginAuthContentProps) {
  const location = useLocation();
  const router = useRouter();
  const searchParams = useMemo(() => new URLSearchParams(location.searchStr), [location.searchStr]);
  const mode = resolveAuthMode(searchParams.get("mode"));
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [registerInviteCode, setRegisterInviteCode] = useState("");
  const [registerVerificationCode, setRegisterVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const timeoutIdsRef = useRef<number[]>([]);
  const loginTurnstile = useTurnstileChallenge();
  const registerTurnstile = useTurnstileChallenge();
  const forgotTurnstile = useTurnstileChallenge();

  const registerCodeCooldown = useVerificationCodeCooldown(60);

  const { data: authStatus } = useQuery({
    queryKey: getAuthStatusQueryKey(),
    queryFn: checkAuthStatus,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isLoggedIn = authStatus?.isLoggedIn || false;
  const isLoginMode = mode === "login";
  const isRegisterMode = mode === "register";
  const isForgotMode = mode === "forgot";

  const redirectParam = searchParams.get("redirect");
  const inviteCodeFromLocation = useMemo(() => resolveRegisterInviteCodeFromLocation({
    pathname: location.pathname,
    searchStr: location.searchStr,
  }), [location.pathname, location.searchStr]);

  const replaceSearchParams = useCallback((nextSearchParams: URLSearchParams) => {
    router.history.replace(appendPathQuery(location.pathname, nextSearchParams, location.hash));
  }, [location.hash, location.pathname, router]);

  const clearPendingTimeouts = useCallback(() => {
    for (const timeoutId of timeoutIdsRef.current) {
      window.clearTimeout(timeoutId);
    }
    timeoutIdsRef.current = [];
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter(id => id !== timeoutId);
      callback();
    }, delayMs);

    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

  const resetFeedbackState = useCallback(() => {
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  const handleClose = useCallback(() => {
    clearPendingTimeouts();
    resetFeedbackState();
    onClose();
  }, [clearPendingTimeouts, onClose, resetFeedbackState]);

  useEffect(() => {
    if (isActive) {
      return;
    }

    clearPendingTimeouts();
    resetFeedbackState();
  }, [clearPendingTimeouts, isActive, resetFeedbackState]);

  useEffect(() => clearPendingTimeouts, [clearPendingTimeouts]);

  useEffect(() => {
    if (isRegisterMode) {
      setRegisterInviteCode(inviteCodeFromLocation);
    }
  }, [inviteCodeFromLocation, isRegisterMode]);

  function applyMode(nextMode: AuthMode) {
    const nextSearchParams = new URLSearchParams();
    nextSearchParams.set("mode", nextMode);
    if (redirectParam) {
      nextSearchParams.set("redirect", redirectParam);
    }
    replaceSearchParams(nextSearchParams);
  }

  function resetFormState() {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setEmail("");
    setForgotEmail("");
    setRegisterInviteCode("");
    setRegisterVerificationCode("");
    loginTurnstile.reset();
    registerTurnstile.reset();
    forgotTurnstile.reset();
  }

  function switchMode(nextMode: AuthMode) {
    clearPendingTimeouts();
    applyMode(nextMode);
    resetFormState();
    resetFeedbackState();
  }

  function showTemporaryMessage(message: string, type: "success" | "error") {
    clearPendingTimeouts();
    resetFeedbackState();

    if (type === "error") {
      setErrorMessage(message);
    }
    else {
      setSuccessMessage(message);
    }

    scheduleTimeout(() => {
      if (type === "error") {
        setErrorMessage("");
      }
      else {
        setSuccessMessage("");
      }
    }, 1500);
  }

  const handleAuthenticated = useCallback((token?: string, uid?: number) => {
    runAuthSuccessFlow({
      invalidateRouter: () => router.invalidate(),
      mobileCallbackUrl: mobileCallbackEnabled && token ? buildMobileAuthCallbackUrl(token, uid) : null,
      onClose: handleClose,
      onSuccess: onAuthenticated,
    });
  }, [handleClose, mobileCallbackEnabled, onAuthenticated, router]);

  const handleLogoutComplete = useCallback(() => {
    handleClose();
    void router.invalidate();
  }, [handleClose, router]);

  const loginMutation = useMutation({
    mutationFn: (data: { username: string; password: string; loginMethod: LoginMethod; turnstileToken?: string }) =>
      loginUser({ username: data.username, password: data.password, turnstileToken: data.turnstileToken }, data.loginMethod),
    onSuccess: (res) => {
      if (res.data) {
        // 独立登录页（传 onAuthenticated）：登录成功后直接跳转；弹窗入口：显示成功反馈后关闭。
        if (onAuthenticated || mobileCallbackEnabled) {
          handleAuthenticated(res.data, authStatus?.uid);
        }
        else {
          showTemporaryMessage("登录成功！", "success");
          scheduleTimeout(() => handleAuthenticated(res.data, authStatus?.uid), 1000);
        }
      }
      else {
        showTemporaryMessage(res.errMsg || "登录失败，请重试", "error");
      }
    },
    onError: (error) => {
      showTemporaryMessage(
        error instanceof Error ? error.message : "登录失败，请重试",
        "error",
      );
    },
    onSettled: () => {
      if (hasTurnstileSiteKey()) {
        loginTurnstile.reset();
      }
    },
  });

  const sendRegisterCodeMutation = useMutation({
    mutationFn: (params: { email: string; turnstileToken?: string }) =>
      sendEmailVerificationCode({ email: params.email, purpose: "REGISTER", turnstileToken: params.turnstileToken }),
    onSuccess: () => {
      registerCodeCooldown.startCooldown();
      showTemporaryMessage("验证码已发送，请查收邮箱", "success");
    },
    onError: (error) => {
      showTemporaryMessage(
        error instanceof Error ? error.message : "验证码发送失败，请重试",
        "error",
      );
    },
    onSettled: () => {
      if (hasTurnstileSiteKey()) {
        registerTurnstile.reset();
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; email: string; inviteCode: string; verificationCode: string; turnstileToken?: string }) => {
      await verifyEmailVerificationCode({
        email: data.email,
        code: data.verificationCode,
        purpose: "REGISTER",
      });
      return registerUser(withRegisterInviteCode({
        username: data.username,
        password: data.password,
        email: data.email,
        turnstileToken: data.turnstileToken,
      }, data.inviteCode));
    },
    onSuccess: (res, variables) => {
      if (res.success && res.data) {
        const registeredPassword = variables.password;

        resetFormState();
        setUsername(variables.username);
        setPassword(registeredPassword);

        if (onAuthenticated || mobileCallbackEnabled) {
          handleAuthenticated(res.data, authStatus?.uid);
        }
        else {
          showTemporaryMessage("注册成功！", "success");
          scheduleTimeout(() => handleAuthenticated(res.data, authStatus?.uid), 1000);
        }
      }
      else {
        showTemporaryMessage(res.errMsg || "注册失败，请重试", "error");
      }
    },
    onError: (error) => {
      showTemporaryMessage(
        error instanceof Error ? error.message : "注册失败，请重试",
        "error",
      );
    },
    onSettled: () => {
      if (hasTurnstileSiteKey()) {
        registerTurnstile.reset();
      }
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (params: { email: string; turnstileToken?: string }) => requestForgotPasswordByEmail(params.email, params.turnstileToken),
    onSuccess: () => {
      showTemporaryMessage("账号信息与重置指引已发送到邮箱，请注意查收", "success");
      scheduleTimeout(() => {
        switchMode("login");
      }, 1000);
    },
    onError: (error) => {
      showTemporaryMessage(resolveForgotPasswordErrorMessage(error), "error");
    },
    onSettled: () => {
      if (hasTurnstileSiteKey()) {
        forgotTurnstile.reset();
      }
    },
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!username.trim()) {
      showTemporaryMessage("请输入用户名", "error");
      return;
    }
    const turnstileToken = hasTurnstileSiteKey() ? loginTurnstile.token.trim() : "";
    if (hasTurnstileSiteKey() && !turnstileToken) {
      showTemporaryMessage("请先完成安全验证", "error");
      return;
    }
    const trimmedUsername = username.trim();
    loginMutation.mutate({
      username: trimmedUsername,
      password,
      loginMethod: resolveLoginMethod(trimmedUsername),
      turnstileToken: turnstileToken || undefined,
    });
  };

  const handleSendRegisterVerificationCode = () => {
    if (!email.trim()) {
      showTemporaryMessage("请先输入邮箱地址", "error");
      return;
    }
    if (registerCodeCooldown.isCoolingDown || sendRegisterCodeMutation.isPending) {
      return;
    }
    const turnstileToken = hasTurnstileSiteKey() ? registerTurnstile.token.trim() : "";
    if (hasTurnstileSiteKey() && !turnstileToken) {
      showTemporaryMessage("请先完成安全验证", "error");
      return;
    }
    sendRegisterCodeMutation.mutate({ email: email.trim(), turnstileToken: turnstileToken || undefined });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const usernameError = resolveRegisterUsernameError(username);
    if (usernameError) {
      showTemporaryMessage(usernameError, "error");
      return;
    }

    const passwordError = resolveRegisterPasswordError(password);
    if (passwordError) {
      showTemporaryMessage(passwordError, "error");
      return;
    }

    if (password !== confirmPassword) {
      showTemporaryMessage("两次输入的密码不一致", "error");
      return;
    }

    if (!email.trim()) {
      showTemporaryMessage("请输入邮箱地址", "error");
      return;
    }

    if (!registerVerificationCode.trim()) {
      showTemporaryMessage("请输入邮箱验证码", "error");
      return;
    }

    const inviteCodeError = resolveRegisterInviteCodeError(registerInviteCode);
    if (inviteCodeError) {
      showTemporaryMessage(inviteCodeError, "error");
      return;
    }

    const turnstileToken = hasTurnstileSiteKey() ? registerTurnstile.token.trim() : "";
    if (hasTurnstileSiteKey() && !turnstileToken) {
      showTemporaryMessage("请先完成安全验证", "error");
      return;
    }

    registerMutation.mutate({
      username: username.trim(),
      password,
      email: email.trim(),
      inviteCode: registerInviteCode,
      verificationCode: registerVerificationCode.trim(),
      turnstileToken: turnstileToken || undefined,
    });
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!forgotEmail.trim()) {
      showTemporaryMessage("请输入邮箱地址", "error");
      return;
    }

    const turnstileToken = hasTurnstileSiteKey() ? forgotTurnstile.token.trim() : "";
    if (hasTurnstileSiteKey() && !turnstileToken) {
      showTemporaryMessage("请先完成安全验证", "error");
      return;
    }
    forgotPasswordMutation.mutate({ email: forgotEmail.trim(), turnstileToken: turnstileToken || undefined });
  };

  const handleLogout = () => {
    void logoutUser();
    showTemporaryMessage("已成功退出登录", "success");
    scheduleTimeout(handleLogoutComplete, 1000);
  };

  return (
    <>
      <div className="space-y-6 px-6 py-6 sm:px-8">
        {isLoggedIn
          ? (
              <LoggedInView handleLogout={handleLogout} />
            )
          : isLoginMode
            ? (
                <LoginForm
                  username={username}
                  setUsername={setUsername}
                  password={password}
                  setPassword={setPassword}
                  handleSubmit={handleLoginSubmit}
                  isLoading={loginMutation.isPending}
                  turnstile={hasTurnstileSiteKey()
                    ? (
                        <TurnstileWidget
                          action="login"
                          token={loginTurnstile.token}
                          onTokenChange={loginTurnstile.setToken}
                          resetKey={loginTurnstile.resetKey}
                        />
                      )
                    : null}
                />
              )
            : isRegisterMode
              ? (
                  <RegisterForm
                    username={username}
                    setUsername={setUsername}
                    email={email}
                    setEmail={setEmail}
                    inviteCode={registerInviteCode}
                    setInviteCode={setRegisterInviteCode}
                    verificationCode={registerVerificationCode}
                    setVerificationCode={setRegisterVerificationCode}
                    sendVerificationCode={handleSendRegisterVerificationCode}
                    isSendingVerificationCode={sendRegisterCodeMutation.isPending}
                    isVerificationCodeCoolingDown={registerCodeCooldown.isCoolingDown}
                    verificationCodeCooldownSeconds={registerCodeCooldown.remainingSeconds}
                    password={password}
                    setPassword={setPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    handleSubmit={handleRegisterSubmit}
                    isLoading={registerMutation.isPending}
                    turnstile={hasTurnstileSiteKey()
                      ? (
                          <TurnstileWidget
                            action="register"
                            token={registerTurnstile.token}
                            onTokenChange={registerTurnstile.setToken}
                            resetKey={registerTurnstile.resetKey}
                          />
                        )
                      : null}
                  />
                )
              : (
                  <ForgotPasswordForm
                    email={forgotEmail}
                    setEmail={setForgotEmail}
                    handleSubmit={handleForgotSubmit}
                    isLoading={forgotPasswordMutation.isPending}
                    turnstile={hasTurnstileSiteKey()
                      ? (
                          <TurnstileWidget
                            action="forgot_password"
                            token={forgotTurnstile.token}
                            onTokenChange={forgotTurnstile.setToken}
                            resetKey={forgotTurnstile.resetKey}
                          />
                        )
                      : null}
                  />
                )}

        {!isLoggedIn && (
          <div className="border-t border-base-content/10 pt-4">
            {isLoginMode && (
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-base-content/65">
                <p>
                  还没有账号？
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className={textLinkClassName("ml-1 font-medium")}
                  >
                    立即注册
                  </button>
                </p>
                <p>
                  忘记密码？
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className={textLinkClassName("ml-1 font-medium")}
                  >
                    找回密码
                  </button>
                </p>
              </div>
            )}

            {isRegisterMode && (
              <p className="text-center text-sm text-base-content/65">
                已有账号？
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={textLinkClassName("ml-1 font-medium")}
                >
                  立即登录
                </button>
              </p>
            )}

            {isForgotMode && (
              <p className="text-center text-sm text-base-content/65">
                想起密码了？
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={textLinkClassName("ml-1 font-medium")}
                >
                  返回登录
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      <AlertMessage
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    </>
  );
}

export function LoginPageAuthPanel({ mobileCallbackEnabled = false, onClose, onAuthenticated }: LoginPageAuthPanelProps) {
  return (
    <div
      className="
        relative w-full max-w-[34rem] overflow-hidden rounded-md border
        border-base-content/10 bg-base-100/95 shadow-xl dark:bg-base-300/95
      "
    >
      <LoginAuthContent
        isActive
        mobileCallbackEnabled={mobileCallbackEnabled}
        onAuthenticated={onAuthenticated}
        onClose={onClose}
      />
    </div>
  );
}

// 登录弹窗组件：保留给全局弹窗入口使用，独立登录页不走这个壳。
export default function LoginModal({ isOpen, mobileCallbackEnabled = false, onClose, onAuthenticated }: LoginModalProps) {
  return (
    <DialogFrame
      open={isOpen}
      mode="native"
      onClose={onClose}
      ariaLabel="登录团剧共创账号"
      panelClassName="max-h-[calc(100dvh-2rem)] w-full max-w-[34rem] overflow-y-auto border-base-content/10 bg-base-100/95 p-0 shadow-2xl dark:bg-base-300/95"
    >
      <LoginAuthContent
        isActive={isOpen}
        mobileCallbackEnabled={mobileCallbackEnabled}
        onAuthenticated={onAuthenticated}
        onClose={onClose}
      />
    </DialogFrame>
  );
}
