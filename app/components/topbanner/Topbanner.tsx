import UserAvatarComponent from "@/components/common/userAvatar";
import UpdatesPopWindow from "@/components/topbanner/updatesWindow";
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
    <div className="w-full">
      <div className="navbar bg-base-300">
        {/* 左侧导航区域 */}
        <div className="navbar-start gap-4">
          {/* 移动端下拉菜单按钮 */}
          <div className="dropdown lg:hidden">
            <div tabIndex={0} role="button" className="btn btn-square btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block h-5 w-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </div>
            <ul tabIndex={0} className="dropdown-content z-[50] menu p-2 shadow bg-base-200 rounded-box w-52 mt-3 text-base-content">
              <li><a onClick={() => navigate("/feed")}>推荐</a></li>
              <li><a onClick={() => navigate("/community/1")}>社区</a></li>
              <li><a onClick={() => navigate("/chat")}>游玩</a></li>
              <li><a onClick={() => navigate("/role")}>角色</a></li>
              <li><a onClick={() => navigate("/module")}>模组</a></li>
              <li><a onClick={() => navigate("/create")}>创作</a></li>
              <li><a onClick={() => navigate("/collection")}>收藏</a></li>
            </ul>
          </div>

          <img
            src="http://47.119.147.6/tuan/favicon.ico"
            alt="Logo"
            className="h-8 w-8 mr-4 ml-2"
            onClick={() => navigate("/")}
          />

          {/* 导航链接 - 在移动端隐藏 */}
          <div className="hidden lg:flex gap-7">
            <a onClick={() => navigate("/feed")} className="font-normal text-base hover:underline cursor-default ">推荐</a>
            <a onClick={() => navigate("/community/1")} className="font-normal text-base hover:underline cursor-default">社区</a>
            <a onClick={() => navigate("/chat")} className="font-normal text-base hover:underline cursor-default">游玩</a>
            <a onClick={() => navigate("/role")} className="font-normal text-base hover:underline cursor-default">角色</a>
            <a onClick={() => navigate("/module")} className="font-normal text-base hover:underline cursor-default">模组</a>
            <a onClick={() => navigate("/create")} className="font-normal text-base hover:underline cursor-default">创作</a>
            <a onClick={() => navigate("/collection")} className="font-normal text-base hover:underline cursor-default">收藏</a>
          </div>
        </div>

        {/* 右侧用户区域 */}
        <div className="navbar-end gap-2">
          <a onClick={() => navigate("/privatechat")} className="cursor-pointer active:animate-bounce size-8">
            <svg className="fill-current" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
              <path d="M853.333333 896H170.666667c-72.533333 0-128-55.466667-128-128V256c0-72.533333 55.466667-128 128-128h682.666666c72.533333 0 128 55.466667 128 128v512c0 72.533333-55.466667 128-128 128zM170.666667 213.333333c-25.6 0-42.666667 17.066667-42.666667 42.666667v512c0 25.6 17.066667 42.666667 42.666667 42.666667h682.666666c25.6 0 42.666667-17.066667 42.666667-42.666667V256c0-25.6-17.066667-42.666667-42.666667-42.666667H170.666667z"></path>
              <path d="M512 597.333333c-8.533333 0-17.066667-4.266667-25.6-8.533333l-426.666667-298.666667c-17.066667-12.8-21.333333-38.4-8.533333-59.733333 12.8-17.066667 38.4-21.333333 59.733333-8.533333l401.066667 281.6 401.066667-281.6c21.333333-12.8 46.933333-8.533333 59.733333 8.533333 12.8 21.333333 8.533333 46.933333-8.533333 59.733333l-426.666667 298.666667c-8.533333 4.266667-17.066667 8.533333-25.6 8.533333z"></path>
            </svg>
          </a>
          <ThemeSwitch />
          {isLoggedIn
            ? (
                <div className="dropdown dropdown-end">
                  <div tabIndex={0} role="button" className="btn btn-ghost flex items-center gap-2">
                    <UserAvatarComponent
                      userId={userId || 1}
                      width={8}
                      isRounded={true}
                      withName={true}
                      stopPopWindow={true}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                  <ul tabIndex={0} className="dropdown-content z-[50] menu p-2 shadow bg-base-100 rounded-box w-52">
                    <li>
                      <a onClick={() => navigate(`/profile/${userId}`)}>个人中心</a>
                    </li>
                    <li>
                      <a onClick={() => navigate("/settings")}>设置</a>
                    </li>
                    <li>
                      <a
                        onClick={() => {
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
      <UpdatesPopWindow></UpdatesPopWindow>
    </div>
  );
}
