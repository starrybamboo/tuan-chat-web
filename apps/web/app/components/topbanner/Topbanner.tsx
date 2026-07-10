import type { ComponentType, SVGProps } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import { BugBeetleIcon, CheckCircleIcon, GearSixIcon, IdentificationCardIcon, PaintBrushBroadIcon, SignOutIcon, UserIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { buildAccountInviteRegisterUrl } from "@tuanchat/domain/account-invite";
import { motion, useAnimationControls } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import WebgalStarter from "@/components/chat/shared/webgal/webgalStarter";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { interactiveButtonMotionProps } from "@/components/common/motion/interactiveButtonMotion";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import UserAvatarComponent from "@/components/common/userAvatar";
import NotificationBell from "@/components/notification/notificationBell";
import { BilibiliIcon, QQIcon, RoomChatIcon, WebgalIcon } from "@/icons";
import { checkAuthStatus, logoutUser } from "@/utils/auth/authapi";
import { exportDiagnosticConsoleFile } from "@/utils/diagnosticConsole";
import { isElectronEnv } from "@/utils/isElectronEnv";
import { isDevOrTestEnvironment } from "@/utils/runtimeEnvironment";

import { useGetMyUserInfoQuery } from "../../../api/hooks/UserHooks";
import ThemeSwitch from "../themeSwitch";

const LazyLoginButton = lazy(() => import("../auth/LoginButton"));
const MotionLink = motion.create(Link);
const topNavMotionVariants = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.06, y: -1.5 },
  tap: { scale: 0.95, y: 0 },
} as const;
const topNavMotionTransition = { type: "spring", stiffness: 560, damping: 30, mass: 0.5 } as const;

function TopNavMotionLink({
  to,
  label,
  Icon,
  activePathPrefix = to,
  compact = false,
}: {
  to: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  activePathPrefix?: string;
  compact?: boolean;
}) {
  const location = useLocation();
  const controls = useAnimationControls();
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const isActive = location.pathname === activePathPrefix || location.pathname.startsWith(`${activePathPrefix}/`);

  const syncHoverState = useCallback(() => {
    void controls.start(linkRef.current?.matches(":hover") ? "hover" : "rest");
  }, [controls]);

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(syncHoverState);
    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname, syncHoverState]);

  return (
    <MotionLink
      ref={linkRef}
      to={to}
      className={compact
        ? `
          btn btn-ghost btn-square btn-sm
          hover:bg-base-200
          ${isActive ? "bg-base-300 text-info shadow-sm" : ""}
        `
        : `
          btn btn-ghost btn-sm gap-1 px-2
          hover:bg-base-200
          ${isActive ? "bg-base-300 text-info shadow-sm" : ""}
        `}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      initial="rest"
      animate={controls}
      whileHover="hover"
      whileTap="tap"
      variants={topNavMotionVariants}
      transition={topNavMotionTransition}
      onHoverStart={() => controls.start("hover")}
      onHoverEnd={() => controls.start("rest")}
    >
      <Icon className="size-6 opacity-80" />
      {compact ? null : <span className="text-sm whitespace-nowrap">{label}</span>}
    </MotionLink>
  );
}

export default function Topbar() {
  const queryClient = useQueryClient(); // 使用 hook 获取 QueryClient 实例
  const [isBugQqOpen, setIsBugQqOpen] = useState(false);
  const [bugReportExportStatus, setBugReportExportStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: authStatus, isLoading } = useQuery({
    queryKey: ["authStatus"],
    queryFn: checkAuthStatus,
  });
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const runModeEnabled = useRoomPreferenceStore(state => state.runModeEnabled);
  const canUseAiImage = isDevOrTestEnvironment({
    isDev: import.meta.env.DEV,
    mode: import.meta.env.MODE,
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    hostname: typeof window === "undefined" ? undefined : window.location.hostname,
  });
  const canUseFeedback = import.meta.env.DEV || import.meta.env.MODE === "test";

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

  const userInfoQuery = useGetMyUserInfoQuery({ enabled: isLoggedIn, staleTime: 0 });
  const privateUserInfo = userInfoQuery.data?.data;
  const isCurrentPrivateUser = privateUserInfo?.userId === userId;
  const username = isCurrentPrivateUser ? privateUserInfo?.username : undefined;
  const inviteCode = isCurrentPrivateUser ? (privateUserInfo?.inviteCode ?? "") : "";
  const inviteRegisterLink = buildAccountInviteRegisterUrl(
    inviteCode,
    typeof window === "undefined" ? undefined : window.location.origin,
  );

  // 处理用户菜单导航并关闭下拉菜单
  const handleUserNavigation = (path: string) => {
    navigate({ to: path });
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
    navigate({ to: "/login" });
  };

  const handleCopyInviteLink = useCallback(async () => {
    if (!inviteRegisterLink) {
      appToast.error("邀请码还没有生成，请稍后重试。");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      appToast.error("当前环境不支持复制到剪贴板。");
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteRegisterLink);
      appToast.success("邀请链接已复制");
    }
    catch {
      appToast.error("复制失败，请稍后重试。");
    }
  }, [inviteRegisterLink]);

  const exportBugReportLog = useCallback(() => {
    const result = exportDiagnosticConsoleFile();
    if (!result.ok) {
      return {
        ok: false,
        message: `控制台日志下载失败：${result.error}`,
      };
    }

    return {
      ok: true,
      message: `已自动下载控制台日志：${result.fileName}`,
    };
  }, []);

  const handleOpenBugReport = useCallback(() => {
    const status = exportBugReportLog();
    setBugReportExportStatus(status);
    if (!status.ok) {
      appToast.error(status.message);
    }
    setIsBugQqOpen(true);
  }, [exportBugReportLog]);

  const navItems = [
    { to: "/chat/discover/material", label: "聊天", icon: RoomChatIcon, activePathPrefix: "/chat" },
    { to: "/role", label: "角色", icon: IdentificationCardIcon },
    ...(canUseAiImage ? [{ to: "/ai-image", label: "AI生图", icon: PaintBrushBroadIcon }] : []),
    ...(canUseFeedback ? [{ to: "/feedback", label: "反馈", icon: CheckCircleIcon }] : []),
  ];

  return (
    <div className="w-full">
      <div className="
        relative z-50 px-2 bg-base-200 flex justify-between mx-auto w-full
        overflow-visible py-1
      ">
        {/* 左侧导航区域 */}
        <div className="navbar-start gap-4">
          <div className="
            hidden
            md:flex
          ">
            <MotionLink
              to="/chat/discover/material"
              className="flex items-center"
              {...interactiveButtonMotionProps}
            >
              <img
                src="/tuanchat-logo.png"
                alt="团剧共创 Logo"
                className="
                  h-6 w-6 mx-3 object-contain transition-transform duration-300 ease-out
                "
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/favicon.ico";
                }}
              />
            </MotionLink>
          </div>

          <div className="
            hidden
            lg:flex
            items-center gap-2
          ">
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TopNavMotionLink
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    Icon={Icon}
                    activePathPrefix={item.activePathPrefix}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧用户区域 */}
        {!isLoading && (
          <div className="
            navbar-end gap-1
            md:gap-2
          ">
            <div className="
              flex items-center gap-2
              lg:hidden
            ">
              <div className="flex items-center gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TopNavMotionLink
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      Icon={Icon}
                      activePathPrefix={item.activePathPrefix}
                      compact
                    />
                  );
                })}
              </div>
              <div className="mx-2 border h-5 opacity-40" />
            </div>
            <div className="flex items-center gap-1">
              <div className="tooltip tooltip-bottom" data-tip="下载日志并打开 QQ 群反馈">
                <motion.button
                  type="button"
                  aria-label="Bug反馈：下载日志并打开 QQ 群"
                  className="btn btn-error btn-sm gap-1 px-2 shadow-sm"
                  onClick={handleOpenBugReport}
                  {...interactiveButtonMotionProps}
                >
                  <BugBeetleIcon className="size-5" weight="regular" />
                  <span className="
                    hidden
                    sm:inline
                    text-sm whitespace-nowrap
                  ">Bug反馈</span>
                </motion.button>
              </div>
              <div className="tooltip tooltip-bottom" data-tip="QQ：扫码反馈 Bug">
                <motion.button
                  type="button"
                  aria-label="QQ Bug反馈"
                  className="
                    btn btn-ghost btn-square btn-sm
                    hover:bg-base-200
                    transition-colors duration-200
                  "
                  onClick={() => setIsBugQqOpen(true)}
                  {...interactiveButtonMotionProps}
                >
                  <QQIcon className="size-6 opacity-80" />
                </motion.button>
              </div>
              <div className="tooltip tooltip-bottom" data-tip="访问作者的个人空间">
                <motion.a
                  href="https://space.bilibili.com/108753930"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="打开降星驰的 Bilibili 个人空间"
                  className="
                    btn btn-ghost btn-square btn-sm
                    hover:bg-base-200
                    transition-colors duration-200
                  "
                  {...interactiveButtonMotionProps}
                >
                  <BilibiliIcon className="size-6 opacity-80" />
                </motion.a>
              </div>
            </div>
            {isLoggedIn ? <NotificationBell /> : null}
            {isLoggedIn
              ? (
                  <div
                    ref={userDropdownRef}
                    className={`
                      dropdown dropdown-end
                      ${isUserDropdownOpen ? `dropdown-open` : ""}
                    `}
                  >
                    <motion.button
                      tabIndex={0}
                      type="button"
                      className="
                        btn btn-ghost btn-circle btn-sm
                        hover:bg-base-200
                      "
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      {...interactiveButtonMotionProps}
                    >
                      <UserAvatarComponent
                        userId={userId || 1}
                        width={6}
                        isRounded={true}
                        withName={false}
                        stopToastWindow={true}
                        clickEnterProfilePage={false}
                      />
                    </motion.button>
                    <div tabIndex={0} className="
                      dropdown-content z-50 card card-compact w-64 p-0 shadow-lg
                      bg-base-100 rounded-lg mt-2
                    ">
                      {/* Header */}
                      <div className="card-body p-4 border-b border-base-300">
                        <div className="flex items-center gap-3">
                          <UserAvatarComponent
                            userId={userId || 1}
                            width={10}
                            isRounded={true}
                            withName={false}
                            stopToastWindow={true}
                            clickEnterProfilePage={false}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate" title={username || `用户 ${userId}`}>
                              {username || `用户 ${userId}`}
                            </div>
                            <p className="text-xs opacity-60 truncate" title={`ID: ${userId}`}>
                              ID:
                              {userId}
                            </p>
                          </div>
                        </div>
                      </div>

                      {inviteCode
                        ? (
                            <div className="px-2 pt-2">
                              <div className="
                                rounded-md border border-base-300 bg-base-200/60
                                p-3
                              ">
                                <div className="
                                  flex items-center justify-between gap-2
                                ">
                                  <div className="
                                    flex items-center gap-2 text-xs
                                    text-base-content/60
                                  ">
                                    <IdentificationCardIcon className="size-4" />
                                    <span>邀请码</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="
                                      btn btn-ghost btn-xs h-7 min-h-7 px-2
                                    "
                                    onClick={handleCopyInviteLink}
                                    aria-label={`复制邀请链接（${username || `用户 ${userId}`} · ID ${userId}）`}
                                  >
                                    复制链接
                                  </button>
                                </div>
                                <div className="
                                  mt-1 font-mono text-lg font-semibold
                                  tracking-widest text-base-content
                                ">
                                  {inviteCode}
                                </div>
                              </div>
                            </div>
                          )
                        : null}

                      {/* Body */}
                      <div className="p-2 space-y-1">
                        <button
                          type="button"
                          className="
                            btn btn-ghost btn-sm w-full justify-start gap-2
                            font-normal
                          "
                          onClick={() => handleUserNavigation(`/profile/${userId}`)}
                        >
                          <UserIcon className="size-4" />
                          个人中心
                        </button>
                        <button
                          type="button"
                          className="
                            btn btn-ghost btn-sm w-full justify-start gap-2
                            font-normal
                          "
                          onClick={() => handleUserNavigation("/settings")}
                        >
                          <GearSixIcon className="size-4" />
                          设置
                        </button>
                        <div
                          className="
                            btn btn-ghost btn-sm w-full justify-between gap-2
                            font-normal
                          "
                        >
                          <div className="flex items-center gap-2">
                            <div className="scale-75">
                              <ThemeSwitch />
                            </div>
                            主题切换
                          </div>
                        </div>
                        {isElectronEnv() && webgalLinkMode && !runModeEnabled && (
                          <WebgalStarter className="w-full">
                            <button
                              type="button"
                              className="
                                btn btn-ghost btn-sm w-full justify-start gap-2
                                font-normal
                              "
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
                          title="退出当前账号"
                        >
                          <SignOutIcon className="size-4" />
                          退出登录
                        </button>
                      </div>
                    </div>
                  </div>
                )
              : (
                  <Suspense fallback={<button type="button" className="
                    btn btn-primary
                  " disabled>登录/注册</button>}>
                    <LazyLoginButton autoOpen />
                  </Suspense>
                )}
          </div>
        )}
      </div>

      <ToastWindow isOpen={isBugQqOpen} onClose={() => setIsBugQqOpen(false)}>
        <div className="p-6 w-[92vw] max-w-md flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-lg font-bold">Bug反馈（QQ）</div>
          </div>

          <div className="w-full flex justify-center">
            <img
              src="/bug-feedback/qq-qrcode.webp"
              alt="QQ Bug反馈二维码"
              className="w-64 h-64 object-contain"
              loading="lazy"
            />
          </div>

          <div className="
            rounded-md border border-error/30 bg-error/10 p-3 text-sm leading-6
          ">
            <span className="badge badge-error badge-sm mr-2">Bug反馈</span>
            {bugReportExportStatus?.message ?? "已尝试自动下载控制台日志。"}
            <br />
            请加群提交日志反馈 bug，并尽量说明具体场景和复现步骤；提供截图或录屏能够加快解决 bug 的速度。
          </div>
        </div>
      </ToastWindow>
    </div>
  );
}
