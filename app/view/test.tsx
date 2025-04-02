import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

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

// 登录页面组件
export default function LoginView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isLogin = searchParams.get("mode") !== "register"; // 如果mode不是register，就是登录状态
  // 用于页面导航的hook
  const navigate = useNavigate();
  // 表单状态管理
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 使用React Query的useMutation处理登录请求
  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      // 登录成功后将token存储到localStorage
      localStorage.setItem("token", data.token);
      // 导航到聊天页面
      navigate("/chat");
    },
    onError: (error) => {
      // 显示错误信息
      setErrorMessage(error instanceof Error ? error.message : "登录失败，请重试");
    },
  });

  // 添加注册mutation
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      if (data.success) {
        // 注册成功后自动登录
        loginMutation.mutate({ username, password });
      }
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "注册失败，请重试");
    },
  });

  // 修改表单提交处理函数
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (isLogin) {
      loginMutation.mutate({ username, password });
    }
    else {
      // 添加密码确认验证
      if (password !== confirmPassword) {
        setErrorMessage("两次输入的密码不一致");
        return;
      }
      registerMutation.mutate({ username, password });
    }
  };

  return (
    // 页面主容器
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      {/* 登录卡片 */}
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          {/* 标题 */}
          <h2 className="card-title text-2xl font-bold text-center mb-6">{isLogin ? "登录" : "注册"}</h2>

          {/* 错误信息显示，在mutation的onerror时触发 */}
          {errorMessage && (
            <div className="alert alert-error mb-4">
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 登录表单 */}
          <form onSubmit={handleSubmit}>
            {/* 用户名输入框 */}
            <div className="form-control w-full mt-2">
              <label className="floating-label">
                <span className="label-text">用户名</span>
                <input
                  type="text"
                  placeholder="请输入用户名"
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
              {/* 忘记密码链接 */}
              {isLogin && (
                <label className="label mt-2">
                  <a href="#" className="label-text-alt link link-hover">忘记密码？</a>
                </label>
              )}
            </div>

            {/* 添加确认密码输入框 */}
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

          {/* 分隔线 */}
          <div className="divider">或</div>

          {/* 第三方登录选项 */}
          <div className="flex flex-col gap-2">
            {/* GitHub登录按钮 */}
            <button type="button" className="btn btn-outline">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
              使用 GitHub 登录
            </button>
            {/* Google登录按钮 */}
            <button type="button" className="btn btn-outline">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              使用 Google 登录
            </button>
          </div>

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
        </div>
      </div>
    </div>
  );
}
