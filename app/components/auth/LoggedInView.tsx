import { Link } from "@tanstack/react-router";

interface LoggedInViewProps {
  handleLogout: () => void;
}

export function LoggedInView({ handleLogout }: LoggedInViewProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-row items-center justify-center gap-4">
        <Link to="/" className="btn btn-primary">
          前往主页
        </Link>
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
