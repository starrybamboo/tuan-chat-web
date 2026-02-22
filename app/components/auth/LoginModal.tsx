import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import {
  requestForgotPasswordByEmail,
  sendEmailVerificationCode,
  verifyEmailVerificationCode,
} from "@/utils/auth/accountSecurityApi";
import { checkAuthStatus, loginUser, logoutUser, registerUser } from "@/utils/auth/authapi";
import { normalizeAuthRedirectPath } from "@/utils/auth/redirect";
import { AlertMessage } from "./AlertMessage";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { LoggedInView } from "./LoggedInView";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { useVerificationCodeCooldown } from "./useVerificationCodeCooldown";

const queryClient = new QueryClient();

type AuthMode = "login" | "register" | "forgot";

function resolveAuthMode(modeValue: string | null): AuthMode {
  if (modeValue === "register" || modeValue === "forgot") {
    return modeValue;
  }
  return "login";
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

// 登录弹窗组件
export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = resolveAuthMode(searchParams.get("mode"));
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [registerVerificationCode, setRegisterVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState<"username" | "userId">("username"); // 默认用户名登录

  const registerCodeCooldown = useVerificationCodeCooldown(60);

  const { data: authStatus } = useQuery({
    queryKey: ["authStatus"],
    queryFn: checkAuthStatus,
  });

  const isLoggedIn = authStatus?.isLoggedIn || false;
  const isLoginMode = mode === "login";
  const isRegisterMode = mode === "register";
  const isForgotMode = mode === "forgot";

  const redirectParam = searchParams.get("redirect");

  function applyMode(nextMode: AuthMode) {
    const nextSearchParams = new URLSearchParams();
    nextSearchParams.set("mode", nextMode);
    if (redirectParam) {
      nextSearchParams.set("redirect", redirectParam);
    }
    setSearchParams(nextSearchParams);
  }

  function resetFormState() {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setEmail("");
    setForgotEmail("");
    setRegisterVerificationCode("");
    setLoginMethod("username");
  }

  function switchMode(nextMode: AuthMode) {
    applyMode(nextMode);
    resetFormState();
    setErrorMessage("");
    setSuccessMessage("");
  }

  function showTemporaryMessage(message: string, type: "success" | "error") {
    setErrorMessage("");
    setSuccessMessage("");

    if (type === "error") {
      setErrorMessage(message);
    }
    else {
      setSuccessMessage(message);
    }

    setTimeout(() => {
      const messageElement = document.querySelector(
        type === "error" ? ".alert-error" : ".alert-success",
      ) as HTMLDivElement;
      if (messageElement) {
        messageElement.style.animation = "fadeOut 1s ease-out forwards";
      }
    }, 500);

    setTimeout(() => {
      if (type === "error") {
        setErrorMessage("");
      }
      else {
        setSuccessMessage("");
      }
    }, 1000);
  }

  const handleSuccessAndClose = () => {
    onClose();

    try {
      const redirect = normalizeAuthRedirectPath(searchParams.get("redirect"));
      if (window.location.pathname === "/login") {
        window.location.assign(redirect);
        return;
      }
    }
    catch {
      // ignore
    }

    window.location.reload();
  };

  const loginMutation = useMutation({
    mutationFn: (data: { username: string; password: string; loginMethod: "username" | "userId" }) =>
      loginUser({ username: data.username, password: data.password }, data.loginMethod),
    onSuccess: (res) => {
      if (res.data) {
        showTemporaryMessage("登录成功！", "success");
        setTimeout(handleSuccessAndClose, 1000);
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
  });

  const sendRegisterCodeMutation = useMutation({
    mutationFn: (targetEmail: string) =>
      sendEmailVerificationCode({ email: targetEmail, purpose: "REGISTER" }),
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
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; email: string; verificationCode: string }) => {
      await verifyEmailVerificationCode({
        email: data.email,
        code: data.verificationCode,
        purpose: "REGISTER",
      });
      return registerUser({ username: data.username, password: data.password, email: data.email });
    },
    onSuccess: (res, variables) => {
      if (res.success && res.data) {
        const userId = res.data;
        const registeredPassword = variables.password;

        resetFormState();
        applyMode("login");

        showTemporaryMessage("注册成功！正在登录您的账号", "success");

        setTimeout(() => {
          setUsername(userId);
          setPassword(registeredPassword);
          setLoginMethod("userId");

          setTimeout(() => {
            loginMutation.mutate({
              username: userId,
              password: registeredPassword,
              loginMethod: "userId",
            });
          }, 1000);
        }, 500);
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
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (targetEmail: string) => requestForgotPasswordByEmail(targetEmail),
    onSuccess: () => {
      showTemporaryMessage("账号信息已发送到邮箱，请注意查收", "success");
      setTimeout(() => {
        switchMode("login");
      }, 1000);
    },
    onError: (error) => {
      showTemporaryMessage(resolveForgotPasswordErrorMessage(error), "error");
    },
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!username.trim()) {
      showTemporaryMessage(`请输入${loginMethod === "username" ? "用户名" : "用户ID"}`, "error");
      return;
    }
    loginMutation.mutate({ username: username.trim(), password, loginMethod });
  };

  const handleSendRegisterVerificationCode = () => {
    if (!email.trim()) {
      showTemporaryMessage("请先输入邮箱地址", "error");
      return;
    }
    if (registerCodeCooldown.isCoolingDown || sendRegisterCodeMutation.isPending) {
      return;
    }
    sendRegisterCodeMutation.mutate(email.trim());
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      showTemporaryMessage("两次输入的密码不一致", "error");
      return;
    }

    if (!registerVerificationCode.trim()) {
      showTemporaryMessage("请输入邮箱验证码", "error");
      return;
    }

    registerMutation.mutate({
      username: username.trim(),
      password,
      email: email.trim(),
      verificationCode: registerVerificationCode.trim(),
    });
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!forgotEmail.trim()) {
      showTemporaryMessage("请输入邮箱地址", "error");
      return;
    }

    forgotPasswordMutation.mutate(forgotEmail.trim());
  };

  const handleLogout = () => {
    void logoutUser();
    queryClient.invalidateQueries({ queryKey: ["authStatus"] });
    showTemporaryMessage("已成功退出登录", "success");
    setTimeout(handleSuccessAndClose, 1000);
  };

  return (
    <div className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box relative bg-base-100 dark:bg-base-300">
        <button
          type="button"
          className="btn btn-sm btn-circle absolute right-2 top-2 bg-base-200 hover:bg-base-300 dark:bg-base-200 dark:hover:bg-base-100"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="card-body px-0">
          <h2 className="card-title text-2xl font-bold text-center mb-6 justify-center w-full text-base-content">
            {isLoggedIn
              ? "您已成功登录"
              : isRegisterMode
                ? "注册"
                : isForgotMode
                  ? "忘记密码"
                  : "登录"}
          </h2>

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
                    loginMethod={loginMethod}
                    setLoginMethod={setLoginMethod}
                  />
                )
              : isRegisterMode
                ? (
                    <RegisterForm
                      username={username}
                      setUsername={setUsername}
                      email={email}
                      setEmail={setEmail}
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
                    />
                  )
                : (
                    <ForgotPasswordForm
                      email={forgotEmail}
                      setEmail={setForgotEmail}
                      handleSubmit={handleForgotSubmit}
                      isLoading={forgotPasswordMutation.isPending}
                    />
                  )}

          {!isLoggedIn && (
            <>
              <div className="divider" />

              {isLoginMode && (
                <>
                  <p className="text-center mt-2">
                    还没有账号？
                    <span
                      onClick={() => switchMode("register")}
                      className="link link-primary cursor-pointer ml-1"
                    >
                      立即注册
                    </span>
                  </p>
                  <p className="text-center mt-2">
                    忘记密码？
                    <span
                      onClick={() => switchMode("forgot")}
                      className="link link-primary cursor-pointer ml-1"
                    >
                      找回密码
                    </span>
                  </p>
                </>
              )}

              {isRegisterMode && (
                <p className="text-center mt-2">
                  已有账号？
                  <span
                    onClick={() => switchMode("login")}
                    className="link link-primary cursor-pointer ml-1"
                  >
                    立即登录
                  </span>
                </p>
              )}

              {isForgotMode && (
                <p className="text-center mt-2">
                  想起密码了？
                  <span
                    onClick={() => switchMode("login")}
                    className="link link-primary cursor-pointer ml-1"
                  >
                    返回登录
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <AlertMessage
        errorMessage={errorMessage}
        successMessage={successMessage}
      />

      <div className="modal-backdrop bg-black/50 dark:bg-black/70" onClick={onClose}></div>
    </div>
  );
}
