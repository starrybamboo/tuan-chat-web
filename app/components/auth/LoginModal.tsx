import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { checkAuthStatus, loginUser, logoutUser, registerUser } from "@/utils/auth/authapi";
import { AlertMessage } from "./AlertMessage";
import { LoggedInView } from "./LoggedInView";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

const queryClient = new QueryClient();

// 登录弹窗组件
export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isLogin = searchParams.get("mode") !== "register";
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState<"username" | "userId">("username"); // 默认用户名登录

  // 使用 React Query 检查登录状态
  const { data: authStatus } = useQuery({
    queryKey: ["authStatus"],
    queryFn: checkAuthStatus,
  });

  const isLoggedIn = authStatus?.isLoggedIn || false;

  // 修改消息处理函数
  function showTemporaryMessage(message: string, type: "success" | "error") {
    // 先清除可能存在的消息
    setErrorMessage("");
    setSuccessMessage("");

    if (type === "error") {
      setErrorMessage(message);
    }
    else {
      setSuccessMessage(message);
    }

    // 在消息即将消失前添加动画
    setTimeout(() => {
      const messageElement = document.querySelector(
        type === "error" ? ".alert-error" : ".alert-success",
      ) as HTMLDivElement;
      if (messageElement) {
        messageElement.style.animation = "fadeOut 1s ease-out forwards";
      }
    }, 500);

    // 动画结束后清除消息
    setTimeout(() => {
      if (type === "error") {
        setErrorMessage("");
      }
      else {
        setSuccessMessage("");
      }
    }, 1000);
  }

  // 处理成功登录后的关闭
  const handleSuccessAndClose = () => {
    onClose();

    // 兼容：/login?redirect=...（例如 401 自动跳转或邀请链接跳转）
    try {
      const redirect = searchParams.get("redirect");
      if (window.location.pathname === "/login") {
        window.location.assign(redirect || "/chat");
        return;
      }
    }
    catch {
      // ignore
    }

    window.location.reload();
  };

  // 修改登录mutation
  const loginMutation = useMutation({
    mutationFn: (data: { username: string; password: string; loginMethod: "username" | "userId" }) =>
      loginUser({ username: data.username, password: data.password }, data.loginMethod),
    onSuccess: (res) => {
      if (res.data) {
        showTemporaryMessage("登录成功！", "success");
        setTimeout(handleSuccessAndClose, 1000);
      }
      else {
        showTemporaryMessage(`登录失败：${res.errMsg}`, "error");
      }
    },
    onError: (error) => {
      showTemporaryMessage(
        error instanceof Error ? error.message : "登录失败，请重试",
        "error",
      );
    },
  });

  // 修改注册mutation中的成功处理
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (res) => {
      if (res.success && res.data) {
        // 保存注册返回的userId和密码
        const userId = res.data;
        const registeredPassword = password;

        // 清空表单
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setEmail("");

        // 跳转到登录界面
        setSearchParams({ mode: "login" });

        // 显示成功消息
        showTemporaryMessage("注册成功！正在登录您的账号", "success");

        // 自动填充用户名和密码
        setTimeout(() => {
          setUsername(userId); // 使用返回的userId
          setPassword(registeredPassword);
          setLoginMethod("userId"); // 注册后用userId登录

          // 再延迟一会自动登录
          setTimeout(() => {
            loginMutation.mutate({
              username: userId, // 使用userId进行登录
              password: registeredPassword,
              loginMethod: "userId",
            });
          }, 1000);
        }, 500);
      }
    },
    onError: (error) => {
      showTemporaryMessage(
        error instanceof Error ? error.message : "注册失败，请重试",
        "error",
      );
    },
  });

  // 修改表单提交处理函数
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (isLogin) {
      // 登录需要至少提供用户名或用户ID
      if (!username) {
        showTemporaryMessage(`请输入${loginMethod === "username" ? "用户名" : "用户ID"}`, "error");
        return;
      }
      loginMutation.mutate({ username, password, loginMethod });
    }
    else {
      // 添加密码确认验证
      if (password !== confirmPassword) {
        showTemporaryMessage("两次输入的密码不一致", "error");
        return;
      }
      registerMutation.mutate({ username, password, email });
    }
  };

  // 添加退出登录函数
  const handleLogout = () => {
    void logoutUser();
    queryClient.invalidateQueries({ queryKey: ["authStatus"] });
    showTemporaryMessage("已成功退出登录", "success");
    setTimeout(handleSuccessAndClose, 1000);
  };

  return (
    // Modal 容器
    <div className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box relative bg-base-100 dark:bg-base-300">
        {/* 关闭按钮 */}
        <button
          type="button"
          className="btn btn-sm btn-circle absolute right-2 top-2 bg-base-200 hover:bg-base-300 dark:bg-base-200 dark:hover:bg-base-100"
          onClick={onClose}
        >
          ✕
        </button>

        {/* 卡片内容 */}
        <div className="card-body px-0">
          <h2 className="card-title text-2xl font-bold text-center mb-6 justify-center w-full text-base-content">
            {isLoggedIn ? "您已成功登录" : (isLogin ? "登录" : "注册")}
          </h2>

          {isLoggedIn
            ? (
                <LoggedInView handleLogout={handleLogout} />
              )
            : isLogin
              ? (
                  <LoginForm
                    username={username}
                    setUsername={setUsername}
                    password={password}
                    setPassword={setPassword}
                    handleSubmit={handleSubmit}
                    isLoading={loginMutation.isPending}
                    loginMethod={loginMethod}
                    setLoginMethod={setLoginMethod}
                  />
                )
              : (
                  <RegisterForm
                    username={username}
                    setUsername={setUsername}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    handleSubmit={handleSubmit}
                    isLoading={registerMutation.isPending}
                  />
                )}

          {!isLoggedIn && (
            <>
              {/* 分隔线 */}
              <div className="divider" />

              {/* 注册链接 */}
              <p className="text-center mt-4">
                {isLogin ? "还没有账号？" : "已有账号？"}
                <span
                  onClick={() => {
                    setSearchParams({ mode: isLogin ? "register" : "login" });
                    // 清空表单
                    setUsername("");
                    setPassword("");
                    setConfirmPassword("");
                    setEmail("");
                    // 重置登录方式为默认的用户名登录
                    setLoginMethod("username");
                    // 清空错误信息
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="link link-primary cursor-pointer ml-1"
                >
                  {isLogin ? "立即注册" : "立即登录"}
                </span>
              </p>
            </>
          )}
        </div>

      </div>

      <AlertMessage
        errorMessage={errorMessage}
        successMessage={successMessage}
      />

      {/* 背景遮罩 */}
      <div className="modal-backdrop bg-black/50 dark:bg-black/70" onClick={onClose}></div>
    </div>
  );
}
