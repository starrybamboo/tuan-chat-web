import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import WebgalStarter from "@/components/chat/shared/webgal/webgalStarter";
import { PopWindow } from "@/components/common/popWindow";
import UserAvatarComponent from "@/components/common/userAvatar";
import UpdatesPopWindow from "@/components/topbanner/updatesWindow";
import { DiscordIcon, QQIcon, WebgalIcon } from "@/icons";
import { checkAuthStatus, logoutUser } from "@/utils/auth/authapi";
import { isElectronEnv } from "@/utils/isElectronEnv";
import LoginButton from "../auth/LoginButton";
import ThemeSwitch from "../themeSwitch";

export default function Topbar() {
  const switchRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient(); // 使用 hook 获取 QueryClient 实例
  const [isBugQqOpen, setIsBugQqOpen] = useState(false);

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
  const userId = isLoggedIn ? (authStatus?.uid ?? 0) : 0;

  // 处理用户菜单导航并关闭下拉菜单
  const handleUserNavigation = (path: string) => {
    navigate(path);
    setIsUserDropdownOpen(false);
    // 强制移除焦点
    (document.activeElement as HTMLElement)?.blur();
  };

  // 处理退出登录并关闭下拉菜单
  const handleLogout = () => {
    void logoutUser();
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
              <li><Link to="/doc-test" onClick={() => setIsDropdownOpen(false)}>文档测试</Link></li>
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
            <Link to="/doc-test" className="font-normal text-base hover:underline cursor-default">文档测试</Link>
          </div>
        </div>

        {/* 右侧用户区域 */}
        {!isLoading && (
          <div className="navbar-end gap-1 md:gap-2">
            <div className="flex items-center gap-1">
              <span className="hidden sm:inline text-xs opacity-70 select-none">Bug反馈</span>
              <div className="tooltip tooltip-bottom" data-tip="Discord：Bug反馈">
                <a
                  href="https://discord.gg/JbfkEqR6Wp"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Discord Bug反馈"
                  className="btn btn-ghost btn-square hover:bg-base-200 transition-colors duration-200"
                >
                  <DiscordIcon className="size-5 opacity-80" />
                </a>
              </div>
              <div className="tooltip tooltip-bottom" data-tip="QQ：扫码反馈 Bug">
                <button
                  type="button"
                  aria-label="QQ Bug反馈"
                  className="btn btn-ghost btn-square hover:bg-base-200 transition-colors duration-200"
                  onClick={() => setIsBugQqOpen(true)}
                >
                  <QQIcon className="size-5 opacity-80" />
                </button>
              </div>
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
                  <LoginButton autoOpen />
                )}
          </div>
        )}
      </div>
      <UpdatesPopWindow></UpdatesPopWindow>

      <PopWindow isOpen={isBugQqOpen} onClose={() => setIsBugQqOpen(false)}>
        <div className="p-6 w-[92vw] max-w-md flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-lg font-bold">Bug反馈（QQ）</div>
            <div className="text-sm opacity-70">
              扫码加群反馈 Bug（也可以用 Discord 反馈）
            </div>
          </div>

          <div className="w-full flex justify-center">
            <img
              src="/bug-feedback/qq-qrcode.webp"
              alt="QQ Bug反馈二维码"
              className="w-64 h-64 object-contain"
              loading="lazy"
            />
          </div>

          <div className="text-sm">
            <span className="badge badge-error badge-sm mr-2">Bug反馈</span>
            进群后请尽量附上：复现步骤、截图/录屏、设备与浏览器信息。
          </div>
        </div>
      </PopWindow>
    </div>
  );
}
