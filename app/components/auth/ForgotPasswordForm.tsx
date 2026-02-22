interface ForgotPasswordFormProps {
  email: string;
  setEmail: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function ForgotPasswordForm({
  email,
  setEmail,
  handleSubmit,
  isLoading,
}: ForgotPasswordFormProps) {
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-control w-full mt-2">
        <label className="floating-label">
          <span className="label-text">邮箱</span>
          <input
            type="email"
            placeholder="请输入已绑定邮箱"
            className="input input-bordered w-full bg-base-200 dark:bg-base-300 text-base-content placeholder:text-base-content/60"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </label>
      </div>

      <p className="text-xs opacity-70 mt-3">
        点击确认后，系统会把该邮箱绑定账号的 ID、用户名、密码发送到邮箱中。
      </p>

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
                  提交中...
                </>
              )
            : (
                "确认"
              )}
        </button>
      </div>
    </form>
  );
}
