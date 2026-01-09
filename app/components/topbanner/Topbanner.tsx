import { ArchiveBoxIcon, ChatsIcon, GearSixIcon, IdentificationCardIcon, SignOutIcon, TreasureChestIcon, UserIcon } from "@phosphor-icons/react";
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
import { useGetUserInfoQuery } from "../../../api/hooks/UserHooks";
import LoginButton from "../auth/LoginButton";
import ThemeSwitch from "../themeSwitch";

export default function Topbar() {
  const switchRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient(); // 使用 hook 获取 QueryClient 实例
  const [isBugQqOpen, setIsBugQqOpen] = useState(false);
  const [isIconShifted, setIsIconShifted] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

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

  // 点击外部关闭用户菜单（Popover）
  useEffect(() => {
    if (!isUserDropdownOpen)
      return;

    const handleClickOutside = (event: Event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isUserDropdownOpen]);

  const isLoggedIn = authStatus?.isLoggedIn || false;
  const userId = isLoggedIn ? (authStatus?.uid ?? 0) : 0;

  const userInfoQuery = useGetUserInfoQuery(userId);
  const username = userInfoQuery.data?.data?.username;

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

  const navItems = [
    { to: "/chat", label: "聊天", icon: ChatsIcon },
    { to: "/role", label: "角色", icon: IdentificationCardIcon },
    { to: "/module", label: "模组", icon: TreasureChestIcon },
    { to: "/doc-test", label: "文档测试", icon: ArchiveBoxIcon },
  ];

  return (
    <div className="w-full">
      <div
        className={`px-2 bg-base-200 flex justify-between mx-auto w-full transition-all duration-300 ease-out ${
          isIconShifted ? "py-2" : "py-1"
        }`}
      >
        {/* 左侧导航区域 */}
        <div className="navbar-start gap-4">
          <div className="flex">
            <Link
              to="/chat"
              onClick={(event) => {
                // 仅在桌面（min-width: 1024px，对应 Tailwind 的 lg）允许切换展开/收起
                if (typeof window !== "undefined" && window.matchMedia) {
                  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
                  if (!isDesktop) {
                    // 移动端不阻止默认行为，保持正常导航
                    return;
                  }
                }

                event.preventDefault();
                setIsIconShifted(prev => !prev);
              }}
              aria-expanded={isIconShifted}
              className="flex items-center"
            >
              <img
                src="http://47.119.147.6/tuan/favicon.ico"
                alt="Logo"
                className="h-6 w-6 ml-2 mr-4 transition-transform duration-300 ease-out"
              />
            </Link>
          </div>

          <div
            className={`hidden lg:flex items-center gap-3 overflow-hidden transition-all duration-300 ease-out ${
              isIconShifted ? "opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-2"
            }`}
          >
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.to} className="tooltip tooltip-bottom" data-tip={item.label}>
                    <Link
                      to={item.to}
                      className="btn btn-ghost btn-sm gap-2 hover:bg-base-200"
                      aria-label={item.label}
                    >
                      <Icon className="size-6 opacity-80" />
                      <span className="text-sm whitespace-nowrap">{item.label}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
            {!isIconShifted && <div className="mx-1 border-1 border-l h-5 opacity-40" />}
          </div>
        </div>

        {/* 右侧用户区域 */}
        {!isLoading && (
          <div className="navbar-end gap-1 md:gap-2">
            <div
              className={`flex items-center gap-2 transition-all duration-300 ease-out ${
                isIconShifted ? "opacity-0 translate-x-2 pointer-events-none" : "opacity-100 translate-x-0"
              }`}
            >
              <div className="flex items-center gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.to} className="tooltip tooltip-bottom" data-tip={item.label}>
                      <Link
                        to={item.to}
                        className="btn btn-ghost btn-square btn-sm hover:bg-base-200"
                        aria-label={item.label}
                      >
                        <Icon className="size-6 opacity-80" />
                      </Link>
                    </div>
                  );
                })}
              </div>
              <div className="mx-2 border-1 border-l h-5 opacity-40" />
            </div>
            <div className="flex items-center gap-1">
              {/* <span className="hidden sm:inline text-xs opacity-70 select-none">Bug反馈</span> */}
              <div className="tooltip tooltip-bottom" data-tip="Discord：Bug反馈">
                <a
                  href="https://discord.gg/JbfkEqR6Wp"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Discord Bug反馈"
                  className="btn btn-ghost btn-square btn-sm hover:bg-base-200 transition-colors duration-200"
                >
                  <DiscordIcon className="size-6 opacity-80" />
                </a>
              </div>
              <div className="tooltip tooltip-bottom" data-tip="QQ：扫码反馈 Bug">
                <button
                  type="button"
                  aria-label="QQ Bug反馈"
                  className="btn btn-ghost btn-square btn-sm hover:bg-base-200 transition-colors duration-200"
                  onClick={() => setIsBugQqOpen(true)}
                >
                  <QQIcon className="size-6 opacity-80" />
                </button>
              </div>
            </div>
            {isLoggedIn
              ? (
                  <div
                    ref={userDropdownRef}
                    className={`dropdown dropdown-end ${isUserDropdownOpen ? "dropdown-open" : ""}`}
                  >
                    <button
                      tabIndex={0}
                      type="button"
                      className="btn btn-ghost btn-circle btn-sm hover:bg-base-200"
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    >
                      <UserAvatarComponent
                        userId={userId || 1}
                        width={6}
                        isRounded={true}
                        withName={false}
                        stopPopWindow={true}
                        clickEnterProfilePage={false}
                      />
                    </button>
                    <div tabIndex={0} className="dropdown-content z-[50] card card-compact w-64 p-0 shadow-lg bg-base-100 rounded-lg mt-2">
                      {/* Header */}
                      <div className="card-body p-4 border-b border-base-300">
                        <div className="flex items-center gap-3">
                          <UserAvatarComponent
                            userId={userId || 1}
                            width={10}
                            isRounded={true}
                            withName={false}
                            stopPopWindow={true}
                            clickEnterProfilePage={false}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {username || `用户 ${userId}`}
                            </div>
                            <p className="text-xs opacity-60 truncate">
                              ID:
                              {userId}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-2 space-y-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm w-full justify-start gap-2 font-normal"
                          onClick={() => handleUserNavigation(`/profile/${userId}`)}
                        >
                          <UserIcon className="size-4" />
                          个人中心
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm w-full justify-start gap-2 font-normal"
                          onClick={() => handleUserNavigation("/settings")}
                        >
                          <GearSixIcon className="size-4" />
                          设置
                        </button>
                        <div
                          className="btn btn-ghost btn-sm w-full justify-between gap-2 font-normal"
                          onClick={e => handleClick(e)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="flex items-center gap-2">
                            <div className="scale-75" ref={switchRef}>
                              <ThemeSwitch />
                            </div>
                            主题切换
                          </div>
                        </div>
                        {isElectronEnv() && (
                          <WebgalStarter className="w-full">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm w-full justify-start gap-2 font-normal"
                            >
                              <WebgalIcon className="size-4" />
                              启动 WebGAL
                            </button>
                          </WebgalStarter>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="p-2 border-t border-base-300">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm w-full gap-2"
                          onClick={handleLogout}
                        >
                          <SignOutIcon className="size-4" />
                          退出登录
                        </button>
                      </div>
                    </div>
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
