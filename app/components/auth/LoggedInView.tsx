interface LoggedInViewProps {
  handleLogout: () => void;
}

export function LoggedInView({ handleLogout }: LoggedInViewProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-row items-center justify-center gap-4">
        <a href="/" className="btn btn-primary">
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
    </div>
  );
}
