interface LoginFormProps {
  username?: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  loginMethod: "username" | "userId"; // 登录方式：用户名或用户ID
  setLoginMethod: (method: "username" | "userId") => void;
}

export function LoginForm({
  username = "",
  setUsername,
  password,
  setPassword,
  handleSubmit,
  isLoading,
  loginMethod,
  setLoginMethod,
}: LoginFormProps) {
  const accountInputName = loginMethod === "username" ? "login_username" : "login_user_id";
  const accountAutocomplete = loginMethod === "username"
    ? "section-login-username username"
    : "section-login-userid username";
  const passwordInputName = loginMethod === "username" ? "login_password_username" : "login_password_userid";
  const passwordAutocomplete = loginMethod === "username"
    ? "section-login-username current-password"
    : "section-login-userid current-password";

  return (
    <form key={`login-${loginMethod}`} onSubmit={handleSubmit} autoComplete="on">
      {/* 登录方式切换 */}
      <div className="form-control w-full mb-4">
        <label className="label">
          <span className="label-text">登录方式</span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn btn-sm flex-1 ${
              loginMethod === "username"
                ? "btn-primary"
                : "btn-outline"
            }`}
            onClick={() => {
              setLoginMethod("username");
              setUsername(""); // 切换时清空输入
            }}
          >
            用户名登录
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-1 ${
              loginMethod === "userId"
                ? "btn-primary"
                : "btn-outline"
            }`}
            onClick={() => {
              setLoginMethod("userId");
              setUsername(""); // 切换时清空输入
            }}
          >
            用户ID登录
          </button>
        </div>
      </div>

      {/* 输入字段 */}
      <div className="form-control w-full mt-4">
        <label className="floating-label">
          <span className="label-text">
            {loginMethod === "username" ? "用户名" : "用户ID"}
          </span>
          <input
            type="text"
            name={accountInputName}
            autoComplete={accountAutocomplete}
            placeholder={
              loginMethod === "username"
                ? "请输入用户名"
                : "请输入用户ID"
            }
            className="input input-bordered w-full bg-base-200 dark:bg-base-300 text-base-content placeholder:text-base-content/60"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </label>
      </div>

      <div className="form-control w-full mt-2">
        <label className="floating-label">
          <span className="label-text">密码</span>
          <input
            type="password"
            name={passwordInputName}
            autoComplete={passwordAutocomplete}
            placeholder="请输入密码"
            className="input input-bordered w-full bg-base-200 dark:bg-base-300 text-base-content placeholder:text-base-content/60"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="form-control mt-6">
        <button
          type="submit"
          className="btn btn-primary hover:brightness-110 transition-all"
          disabled={isLoading}
        >
          {isLoading
            ? (
                <>
                  <span className="loading loading-spinner"></span>
                  登录中...
                </>
              )
            : (
                "登录"
              )}
        </button>
      </div>
    </form>
  );
}
