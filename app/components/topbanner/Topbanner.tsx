import UserAvatarComponent from "@/components/common/userAvatar";
import UpdatesPopWindow from "@/components/topbanner/updatesWindow";
import { checkAuthStatus } from "@/utils/auth/authapi";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import LoginButton from "../auth/LoginButton";
import ThemeSwitch from "../themeSwitch";

const queryClient = new QueryClient();

export default function Topbar() {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: authStatus, isLoading } = useQuery({
    queryKey: ["authStatus"],
    queryFn: checkAuthStatus,
  });

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const isLoggedIn = authStatus?.isLoggedIn || false;
  const userId = (isLoggedIn && authStatus?.token) ? Number(authStatus.token) : 0;

  // 处理导航并关闭下拉菜单
  const handleNavigation = (path: string) => {
    navigate(path);
    setIsDropdownOpen(false);
    // 强制移除焦点
    setTimeout(() => {
      (document.activeElement as HTMLElement)?.blur();
    }, 100);
  };

  // 处理用户菜单导航并关闭下拉菜单
  const handleUserNavigation = (path: string) => {
    navigate(path);
    setIsUserDropdownOpen(false);
    // 强制移除焦点
    (document.activeElement as HTMLElement)?.blur();
  };

  // 处理退出登录并关闭下拉菜单
  const handleLogout = () => {
    localStorage.removeItem("token");
    queryClient.invalidateQueries({ queryKey: ["authStatus"] });
    setIsUserDropdownOpen(false);
    // 强制移除焦点
    (document.activeElement as HTMLElement)?.blur();
    window.location.reload();
  };

  return (
    <div className="w-full">
      <div className="p-1 bg-base-300">
        {/* 左侧导航区域 */}
        <div className="navbar-start gap-4">
          {/* 移动端下拉菜单按钮 */}
          <div ref={dropdownRef} className={`dropdown lg:hidden ${isDropdownOpen ? "dropdown-open" : ""}`}>
            <div
              role="button"
              className="btn btn-square btn-ghost focus:outline-none active:bg-transparent hover:bg-base-200"
              style={{
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onBlur={() => setIsDropdownOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block h-5 w-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </div>
            <ul className="dropdown-content z-[50] menu p-2 shadow bg-base-200 rounded-box w-52 mt-3 text-base-content">
              <li><a onClick={() => handleNavigation("/feed")}>推荐</a></li>
              <li><a onClick={() => handleNavigation("/community/1")}>社区</a></li>
              <li><a onClick={() => handleNavigation("/chat")}>游玩</a></li>
              <li><a onClick={() => handleNavigation("/role")}>角色</a></li>
              <li><a onClick={() => handleNavigation("/module")}>模组</a></li>
              <li><a onClick={() => handleNavigation("/create")}>创作</a></li>
              <li><a onClick={() => handleNavigation("/collection")}>收藏</a></li>
            </ul>
          </div>

          {/* 移动端私聊按钮 - 显示在汉堡菜单右边 */}
          <a onClick={() => navigate("/privatechat")} className="cursor-pointer active:animate-bounce lg:hidden">
            <svg className="fill-current size-5" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
              <path d="M853.333333 896H170.666667c-72.533333 0-128-55.466667-128-128V256c0-72.533333 55.466667-128 128-128h682.666666c72.533333 0 128 55.466667 128 128v512c0 72.533333-55.466667 128-128 128zM170.666667 213.333333c-25.6 0-42.666667 17.066667-42.666667 42.666667v512c0 25.6 17.066667 42.666667 42.666667 42.666667h682.666666c25.6 0 42.666667-17.066667 42.666667-42.666667V256c0-25.6-17.066667-42.666667-42.666667-42.666667H170.666667z"></path>
              <path d="M512 597.333333c-8.533333 0-17.066667-4.266667-25.6-8.533333l-426.666667-298.666667c-17.066667-12.8-21.333333-38.4-8.533333-59.733333 12.8-17.066667 38.4-21.333333 59.733333-8.533333l401.066667 281.6 401.066667-281.6c21.333333-12.8 46.933333-8.533333 59.733333 8.533333 12.8 21.333333 8.533333 46.933333-8.533333 59.733333l-426.666667 298.666667c-8.533333 4.266667-17.066667 8.533333-25.6 8.533333z"></path>
            </svg>
          </a>

          <div className="hidden lg:flex">
            <img
              src="http://47.119.147.6/tuan/favicon.ico"
              alt="Logo"
              className="h-8 w-8 mr-4 ml-2"
              onClick={() => navigate("/")}
            />
          </div>

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
        {!isLoading && (
          <div className="navbar-end gap-1 md:gap-2">
            <a onClick={() => navigate("/privatechat")} className="cursor-pointer active:animate-bounce hidden lg:block">
              <svg className="fill-current size-6 md:size-8" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <path d="M853.333333 896H170.666667c-72.533333 0-128-55.466667-128-128V256c0-72.533333 55.466667-128 128-128h682.666666c72.533333 0 128 55.466667 128 128v512c0 72.533333-55.466667 128-128 128zM170.666667 213.333333c-25.6 0-42.666667 17.066667-42.666667 42.666667v512c0 25.6 17.066667 42.666667 42.666667 42.666667h682.666666c25.6 0 42.666667-17.066667 42.666667-42.666667V256c0-25.6-17.066667-42.666667-42.666667-42.666667H170.666667z"></path>
                <path d="M512 597.333333c-8.533333 0-17.066667-4.266667-25.6-8.533333l-426.666667-298.666667c-17.066667-12.8-21.333333-38.4-8.533333-59.733333 12.8-17.066667 38.4-21.333333 59.733333-8.533333l401.066667 281.6 401.066667-281.6c21.333333-12.8 46.933333-8.533333 59.733333 8.533333 12.8 21.333333 8.533333 46.933333-8.533333 59.733333l-426.666667 298.666667c-8.533333 4.266667-17.066667 8.533333-25.6 8.533333z"></path>
              </svg>
            </a>
            <div className="scale-75 md:scale-100">
              <ThemeSwitch />
            </div>
            {isLoggedIn
              ? (
                  <div className="dropdown dropdown-end">
                    <div
                      tabIndex={0}
                      role="button"
                      className="btn btn-ghost flex items-center gap-2"
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    >
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
                        <a onClick={() => handleUserNavigation(`/profile/${userId}`)}>个人中心</a>
                      </li>
                      <li>
                        <a onClick={() => handleUserNavigation("/settings")}>设置</a>
                      </li>
                      <li>
                        <a onClick={handleLogout}>
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
        )}
      </div>
      <UpdatesPopWindow></UpdatesPopWindow>
    </div>
  );
}
