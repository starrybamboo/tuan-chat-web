import UserAvatarComponent from "@/components/common/userAvatar";
import { checkAuthStatus } from "@/utils/auth/authapi";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import LoginButton from "../auth/LoginButton";
import ThemeSwitch from "../themeSwitch";

const queryClient = new QueryClient();

export default function Topbar() {
  const navigate = useNavigate();
  const { data: authStatus, isLoading } = useQuery({
    queryKey: ["authStatus"],
    queryFn: checkAuthStatus,
  });

  const isLoggedIn = authStatus?.isLoggedIn || false;
  const userId = (isLoggedIn && authStatus?.token) ? Number(authStatus.token) : 0;

  if (isLoading) {
    return <div className="w-full h-16 flex items-center justify-center" />;
  }

  return (
    <div className="w-full h-14 flex items-center justify-between px-4 bg-base-300 shrink-0">
      {/* 左侧 */}
      <div className="flex items-center space-x-6">
        <img
          src="http://47.119.147.6/tuan/favicon.ico"
          alt="Logo"
          className="h-8 w-8 mr-4"
          onClick={() => navigate("/")}
        />

        <a onClick={() => navigate("/feed")} className="text-base-content hover:text-primary transition-colors">
          推荐
        </a>
        <a onClick={() => navigate("/community")} className="text-base-content hover:text-primary transition-colors">
          社区
        </a>
        <a onClick={() => navigate("/chat")} className="text-base-content hover:text-primary transition-colors">
          游玩
        </a>
        <a onClick={() => navigate("/role")} className="text-base-content hover:text-primary transition-colors">
          角色
        </a>
        <a
          onClick={() => navigate("/module")}
          className="text-base-content hover:text-primary transition-colors"
        >
          模组
        </a>
        <a onClick={() => navigate("/create")} className="text-base-content hover:text-primary transition-colors">
          创作
        </a>
        <a onClick={() => navigate("/collection")} className="text-base-content hover:text-primary transition-colors">
          收藏
        </a>
      </div>

      {/* 右侧 */}
      <div className="flex items-center space-x-6">
        <ThemeSwitch />
        {isLoggedIn
          ? (
              <div className="dropdown dropdown-end">
                <div className="flex items-center content-center gap-2">
                  <div onClick={() => navigate("/profile")} className="flex items-center content-center gap-2">
                    <UserAvatarComponent
                      userId={userId || 1}
                      width={8}
                      isRounded={true}
                      withName={true}
                      stopPopWindow={true}
                    />
                  </div>
                  <div tabIndex={0} role="button" className="cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                  <li><a onClick={() => navigate("/profile")}>个人中心</a></li>
                  <li><a onClick={() => navigate("/settings")}>设置</a></li>
                  <li>
                    <a onClick={() => {
                      localStorage.removeItem("token");
                      queryClient.invalidateQueries({ queryKey: ["authStatus"] });
                      window.location.reload();
                    }}
                    >
                      退出登录
                    </a>
                  </li>
                </ul>
              </div>
            )
          : (
              <LoginButton />
            )}
      </div>
    </div>
  );
}
