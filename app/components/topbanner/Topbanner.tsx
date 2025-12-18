import WebgalStarter from "@/components/chat/shared/webgal/webgalStarter";
import UserAvatarComponent from "@/components/common/userAvatar";
import UpdatesPopWindow from "@/components/topbanner/updatesWindow";
import { ConnectionIcon, WebgalIcon } from "@/icons";
import { checkAuthStatus } from "@/utils/auth/authapi";
import { isElectronEnv } from "@/utils/isElectronEnv";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import LoginButton from "../auth/LoginButton";
import ThemeSwitch from "../themeSwitch";

function ActivitiesButton() {
  return (
    <div className="tooltip tooltip-bottom" data-tip="动态">
      <Link
        to="/activities"
        aria-label="动态"
        className="btn btn-ghost btn-square hover:bg-base-200 transition-colors duration-200"
      >
        <ConnectionIcon />
      </Link>
    </div>
  );
}

export default function Topbar() {
  const switchRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient(); // 使用 hook 获取 QueryClient 实例

  // 点击处理：如果点击发生在 switchRef 内部，则不重复触发；否则查找内部 input 并触发它
  const handleClick = (e?: React.MouseEvent) => {
    // 如果事件存在并且点击目标位于 ThemeSwitch 内部，就不做任何事（避免双触发）
    if (e && switchRef.current && switchRef.current.contains(e.target as Node)) {
      return;
    }

    const input = switchRef.current?.querySelector<HTMLInputElement>("input[type=\"checkbox\"]");
    if (input) {
      input.click();
    }
  };

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
      <div className="p-1 bg-base-300 flex justify-between">
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
              <li><Link to="/chat" onClick={() => setIsDropdownOpen(false)}>聊天</Link></li>
              <li><Link to="/role" onClick={() => setIsDropdownOpen(false)}>角色</Link></li>
              <li><Link to="/module" onClick={() => setIsDropdownOpen(false)}>模组</Link></li>
            </ul>
          </div>

          <div className="hidden lg:flex">
            <Link to="/chat">
              <img
                src="http://47.119.147.6/tuan/favicon.ico"
                alt="Logo"
                className="h-8 w-8 mr-4 ml-2"
              />
            </Link>
          </div>

          {/* 导航链接 - 在移动端隐藏 */}
          <div className="hidden lg:flex gap-7">
            <Link to="/chat" className="font-normal text-base hover:underline cursor-default">聊天</Link>
            <Link to="/role" className="font-normal text-base hover:underline cursor-default">角色</Link>
            <Link to="/module" className="font-normal text-base hover:underline cursor-default">模组</Link>
          </div>
        </div>

        {/* 右侧用户区域 */}
        {!isLoading && (
          <div className="navbar-end gap-1 md:gap-2">
            <ActivitiesButton />
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
                      <li
                        className="flex justify-between cursor-pointer"
                        onClick={e => handleClick(e)}
                        role="button"
                        aria-label="切换主题"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="select-none pr-10">主题切换</span>
                          <div className="scale-70" ref={switchRef}>
                            <ThemeSwitch />
                          </div>
                        </div>
                      </li>
                      {
                        isElectronEnv() && (
                          <li
                            className="flex justify-between cursor-pointer"
                            onClick={handleClick}
                            role="button"
                            aria-label="切换主题"
                          >
                            <WebgalStarter className="flex justify-between gap-2 w-full">
                              <span className="select-none">启动WebGAL</span>
                              <WebgalIcon className="size-5"></WebgalIcon>
                            </WebgalStarter>
                          </li>
                        )
                      }
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
