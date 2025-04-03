import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";

// 定义登录凭证的接口类型
interface LoginCredentials {
  username: string;
  password: string;
}

// 添加注册用户的接口类型
interface RegisterCredentials extends LoginCredentials {
  confirmPassword?: string;
}

// 修改注册请求的响应类型
interface RegisterResponse {
  success: boolean;
  errCode?: number;
  errMsg?: string;
  data?: string;
}
const queryClient = new QueryClient();

// 处理登录请求的异步函数
async function loginUser(credentials: LoginCredentials) {
  // 发送登录请求到后端API
  const res = await fetch("http://39.103.58.31:8081/capi/user/public/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 10001",
    },
    body: JSON.stringify({
      userId: credentials.username,
      password: credentials.password,
    }),
  });

  // 如果请求不成功，抛出错误
  if (!res.ok)
    throw new Error("登录失败");

  // 返回解析后的响应数据
  return await res.json();
}

// 注册请求的异步函数
async function registerUser(credentials: RegisterCredentials) {
  const res = await fetch("http://39.103.58.31:8081/capi/user/public/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 10001",
    },
    body: JSON.stringify({
      username: credentials.username, // 修改为与接口匹配的参数名
      password: credentials.password,
    }),
  });

  const data: RegisterResponse = await res.json();

  if (!data.success) {
    throw new Error(data.errMsg || "注册失败");
  }

  return data;
}

// 添加检查登录状态的函数
async function checkAuthStatus() {
  const token = localStorage.getItem("token");
  if (!token) {
    return { isLoggedIn: false };
  }
  return { isLoggedIn: true, token };
}

// 登录页面组件
export default function LoginView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isLogin = searchParams.get("mode") !== "register";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 使用 React Query 检查登录状态
  const { data: authStatus } = useQuery({
    queryKey: ["authStatus"],
    queryFn: checkAuthStatus,
  });

  const isLoggedIn = authStatus?.isLoggedIn || false;

  // 在组件顶部添加样式
  const fadeOutAnimation = `
    @keyframes fadeOut {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }
  `;

  // 修改消息处理函数
  const showTemporaryMessage = (message: string, type: "success" | "error") => {
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
  };

  // 修改登录mutation的错误处理
  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      showTemporaryMessage("登录成功！", "success");

      // 延迟一秒后刷新页面，确保用户能看到成功消息
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      showTemporaryMessage(
        error instanceof Error ? error.message : "登录失败，请重试",
        "error",
      );
    },
  });

  // 修改注册mutation
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      if (data.success && data.data) { // 确保有返回的userId
        // 保存注册返回的userId和密码
        const userId = data.data;
        const registeredPassword = password;

        // 清空表单
        setUsername("");
        setPassword("");
        setConfirmPassword("");

        // 跳转到登录界面
        setSearchParams({ mode: "login" });

        // 显示成功消息
        showTemporaryMessage("注册成功！正在登录您的账号", "success");

        // 自动填充用户名和密码
        setTimeout(() => {
          setUsername(userId); // 使用返回的userId
          setPassword(registeredPassword);

          // 再延迟一会自动登录
          setTimeout(() => {
            loginMutation.mutate({
              username: userId, // 使用userId进行登录
              password: registeredPassword,
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

  // 修改表单提交处理函数中的密码不一致错误
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (isLogin) {
      loginMutation.mutate({ username, password });
    }
    else {
      // 添加密码确认验证
      if (password !== confirmPassword) {
        showTemporaryMessage("两次输入的密码不一致", "error");
        return;
      }
      registerMutation.mutate({ username, password });
    }
  };

  // 添加退出登录函数
  const handleLogout = () => {
    localStorage.removeItem("token");
    queryClient.invalidateQueries({ queryKey: ["authStatus"] });
    showTemporaryMessage("已成功退出登录", "success");
    // 添加延时以确保消息显示后再刷新页面
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    // 页面主容器
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      {/* 登录卡片 */}
      <style>{fadeOutAnimation}</style>
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          {/* 标题 */}
          <h2 className="card-title text-2xl font-bold text-center mb-6">{isLogin ? "登录" : "注册"}</h2>

          {/* 错误信息显示 */}
          {errorMessage && (
            <div className="alert alert-error mb-4">
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 成功信息显示 */}
          {successMessage && (
            <div className="alert alert-success mb-4">
              <span>{successMessage}</span>
            </div>
          )}

          { isLoggedIn
            ? (
                <div className="flex flex-col items-center">
                  <div className="alert alert-success mb-4">
                    <span>您已成功登录！</span>
                  </div>
                  <a
                    href="/"
                    className="btn btn-primary mb-4"
                  >
                    前往主页
                  </a>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-outline btn-error"
                  >
                    退出登录
                  </button>
                </div>
              )
            : (
                <form onSubmit={handleSubmit}>
                  {/* 用户名输入框 */}
                  <div className="form-control w-full mt-2">
                    <label className="floating-label">
                      <span className="label-text">用户ID</span>
                      <input
                        type="text"
                        placeholder="请输入用户ID"
                        className="input input-bordered w-full"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  {/* 密码输入框 */}
                  <div className="form-control w-full mt-2">
                    <label className="floating-label">
                      <span className="label-text">密码</span>
                      <input
                        type="password"
                        placeholder="请输入密码"
                        className="input input-bordered w-full"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  {/* 注册模式添加确认密码输入框 */}
                  {!isLogin && (
                    <div className="form-control w-full mt-2">
                      <label className="floating-label">
                        <span className="label-text">确认密码</span>
                        <input
                          type="password"
                          placeholder="请再次输入密码"
                          className="input input-bordered w-full"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          required
                        />
                      </label>
                    </div>
                  )}

                  {/* 登录/注册按钮 */}
                  <div className="form-control mt-6">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loginMutation.isPending || registerMutation.isPending}
                    >
                      {loginMutation.isPending || registerMutation.isPending
                        ? (
                            <>
                              <span className="loading loading-spinner"></span>
                              {isLogin ? "登录中..." : "注册中..."}
                            </>
                          )
                        : (
                            isLogin ? "登录" : "注册"
                          )}
                    </button>
                  </div>
                </form>
              )}

          {/* 只在未登录状态显示分隔线和注册链接 */}
          {!isLoggedIn && (
            <>
              {/* 分隔线 */}
              <div className="divider" />

              {/* 注册链接 */}
              <p className="text-center mt-4">
                {isLogin ? "还没有账号？" : "已有账号？"}
                <span
                  onClick={() => setSearchParams({ mode: isLogin ? "register" : "login" })}
                  className="link link-primary cursor-pointer ml-1"
                >
                  {isLogin ? "立即注册" : "立即登录"}
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
