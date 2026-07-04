import { HouseIcon, SignOutIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

type LoggedInViewProps = {
  handleLogout: () => void;
}

export function LoggedInView({ handleLogout }: LoggedInViewProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-box border border-success/20 bg-success/10 px-4 py-3 text-center">
        <p className="text-sm font-medium text-success">你已经登录</p>
        <p className="mt-1 text-xs leading-5 text-base-content/55">
          可以继续进入主页，或退出当前会话。
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link to="/" className="btn btn-primary w-full gap-2">
          <HouseIcon className="size-4" weight="regular" />
          前往主页
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-outline btn-error w-full gap-2"
        >
          <SignOutIcon className="size-4" weight="regular" />
          退出登录
        </button>
      </div>
    </div>
  );
}
