import { ChatsIcon, CheckCircleIcon, CopySimpleIcon, DownloadSimpleIcon, GearSixIcon, IdentificationCardIcon, PaintBrushBroadIcon, SignOutIcon, UserIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { motion, useAnimationControls } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import WebgalStarter from "@/components/chat/shared/webgal/webgalStarter";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { interactiveButtonMotionProps } from "@/components/common/motion/interactiveButtonMotion";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import UserAvatarComponent from "@/components/common/userAvatar";
import NotificationBell from "@/components/notification/notificationBell";
import UpdatesToastWindow from "@/components/topbanner/updatesWindow";
import { WebgalIcon } from "@/icons";
import { checkAuthStatus, getAuthStatusQueryKey, logoutUser } from "@/utils/auth/authapi";
import { isElectronEnv } from "@/utils/isElectronEnv";
import { isDevOrTestEnvironment } from "@/utils/runtimeEnvironment";
import { useGetUserInfoQuery } from "../../../api/hooks/UserHooks";
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
  compact = false,
}: {
  to: string;
  label: string;
  Icon: typeof ChatsIcon;
  compact?: boolean;
}) {
  const location = useLocation();
  const controls = useAnimationControls();
  const linkRef = useRef<HTMLAnchorElement | null>(null);

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
        ? "btn btn-ghost btn-square btn-sm hover:bg-base-200"
        : "btn btn-ghost btn-sm gap-1 px-2 hover:bg-base-200"}
      aria-label={label}
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
  const switchRef = useRef<HTMLDivElement | null>(null);
  const [isBugQqOpen, setIsBugQqOpen] = useState(false);
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

  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: authStatus, isLoading } = useQuery({
    queryKey: getAuthStatusQueryKey(),
    queryFn: checkAuthStatus,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
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

  const userInfoQuery = useGetUserInfoQuery(userId);
  const username = userInfoQuery.data?.data?.username;

  // 处理用户菜单导航并关闭下拉菜单
  const handleUserNavigation = (path: string) => {
    router.history.push(path);
    setIsUserDropdownOpen(false);
    // 强制移除焦点
    (document.activeElement as HTMLElement)?.blur();
  };

  // 处理退出登录并关闭下拉菜单
  const handleLogout = () => {
    void logoutUser();
    setIsUserDropdownOpen(false);
    // 强制移除焦点
    (document.activeElement as HTMLElement)?.blur();
    window.location.reload();
  };

  const navItems = [
    { to: "/chat/discover/material", label: "聊天", icon: ChatsIcon },
    { to: "/role", label: "角色", icon: IdentificationCardIcon },
    ...(canUseAiImage ? [{ to: "/ai-image", label: "AI生图", icon: PaintBrushBroadIcon }] : []),
    ...(canUseFeedback ? [{ to: "/feedback", label: "反馈", icon: CheckCircleIcon }] : []),
  ];

  return (
    <div className="w-full">
      <div className="relative z-[10010] px-2 bg-base-200 flex justify-between mx-auto w-full overflow-visible py-1">
        {/* 左侧导航区域 */}
        <div className="navbar-start gap-4">
          <div className="hidden md:flex">
            <MotionLink
              to="/chat/discover/material"
              className="flex items-center"
              {...interactiveButtonMotionProps}
            >
              <img
                src="/favicon.ico"
                alt="Logo"
                className="h-6 w-6 mx-3 transition-transform duration-300 ease-out"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/logo.svg";
                }}
              />
            </MotionLink>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TopNavMotionLink
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    Icon={Icon}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧用户区域 */}
        {!isLoading && (
          <div className="navbar-end gap-1 md:gap-2">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex items-center gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TopNavMotionLink
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      Icon={Icon}
                      compact
                    />
                  );
                })}
              </div>
              <div className="mx-2 border h-5 opacity-40" />
            </div>
            <div className="flex items-center gap-1">
              <div className="tooltip tooltip-bottom" data-tip="Bug反馈">
                <motion.button
                  type="button"
                  aria-label="Bug反馈"
                  className="btn btn-error btn-sm gap-1 px-2 text-error-content shadow-sm"
                  onClick={() => setIsBugQqOpen(true)}
                  {...interactiveButtonMotionProps}
                >
                  <CheckCircleIcon className="size-4" weight="fill" />
                  <span className="text-xs font-semibold">Bug反馈</span>
                </motion.button>
              </div>
            </div>
            {isLoggedIn ? <NotificationBell /> : null}
            {isLoggedIn
              ? (
                  <div
                    ref={userDropdownRef}
                    className={`dropdown dropdown-end ${isUserDropdownOpen ? "dropdown-open" : ""}`}
                  >
                    <motion.button
                      tabIndex={0}
                      type="button"
                      className="btn btn-ghost btn-circle btn-sm hover:bg-base-200"
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
                    <div className="dropdown-content z-[10020] card card-compact w-64 p-0 shadow-lg bg-base-100 rounded-lg mt-2">
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
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm w-full justify-between gap-2 font-normal"
                          onClick={e => handleClick(e)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="scale-75" ref={switchRef}>
                              <ThemeSwitch />
                            </div>
                            主题切换
                          </div>
                        </button>
                        {isElectronEnv() && webgalLinkMode && !runModeEnabled && (
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
                  <Suspense fallback={<button type="button" className="btn btn-primary" disabled>登录/注册</button>}>
                    <LazyLoginButton autoOpen />
                  </Suspense>
                )}
          </div>
        )}
      </div>
      <UpdatesToastWindow></UpdatesToastWindow>

      <ToastWindow isOpen={isBugQqOpen} onClose={() => setIsBugQqOpen(false)}>
        <BugFeedbackContent />
      </ToastWindow>
    </div>
  );
}

function collectDiagnosticInfo() {
  const now = new Date();
  return {
    url: window.location.href,
    timestamp: now.toISOString(),
    localTime: now.toLocaleString("zh-CN"),
    userAgent: navigator.userAgent,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language,
    platform: navigator.platform,
    devicePixelRatio: window.devicePixelRatio,
    online: navigator.onLine,
    mode: import.meta.env.MODE,
  };
}

interface BugFeedbackConsoleEntry {
  level: "log" | "info" | "warn" | "error" | "debug";
  timestamp: string;
  message: string;
  args: string[];
}

interface BugFeedbackReport {
  type: "bug-feedback-report";
  createdAt: string;
  description: string;
  environment: ReturnType<typeof collectDiagnosticInfo>;
  consoleLogs: BugFeedbackConsoleEntry[];
}

const BUG_FEEDBACK_CONSOLE_MAX_ENTRIES = 80;

function formatConsoleArg(arg: unknown): string {
  if (typeof arg === "string")
    return arg;
  if (typeof arg === "number" || typeof arg === "boolean" || typeof arg === "bigint")
    return String(arg);
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ""}`;
  }

  try {
    return JSON.stringify(arg);
  }
  catch {
    return Object.prototype.toString.call(arg);
  }
}

function getBugFeedbackConsoleStore(): BugFeedbackConsoleEntry[] {
  if (typeof window === "undefined")
    return [];

  const globalWindow = window as Window & {
    __tcBugFeedbackConsoleLogs__?: BugFeedbackConsoleEntry[];
    __tcBugFeedbackConsolePatched__?: boolean;
  };

  if (!globalWindow.__tcBugFeedbackConsoleLogs__) {
    globalWindow.__tcBugFeedbackConsoleLogs__ = [];
  }

  if (!globalWindow.__tcBugFeedbackConsolePatched__) {
    globalWindow.__tcBugFeedbackConsolePatched__ = true;
    const consoleRef = globalThis.console;
    const originalConsole = {
      log: consoleRef.log.bind(consoleRef),
      info: consoleRef.info.bind(consoleRef),
      warn: consoleRef.warn.bind(consoleRef),
      error: consoleRef.error.bind(consoleRef),
      debug: consoleRef.debug.bind(consoleRef),
    };

    const pushEntry = (level: BugFeedbackConsoleEntry["level"], args: unknown[]) => {
      const entries = globalWindow.__tcBugFeedbackConsoleLogs__!;
      entries.push({
        level,
        timestamp: new Date().toISOString(),
        message: args.map(formatConsoleArg).join(" "),
        args: args.map(formatConsoleArg),
      });
      if (entries.length > BUG_FEEDBACK_CONSOLE_MAX_ENTRIES) {
        entries.splice(0, entries.length - BUG_FEEDBACK_CONSOLE_MAX_ENTRIES);
      }
    };

    consoleRef.log = (...args: unknown[]) => {
      pushEntry("log", args);
      originalConsole.log(...args);
    };
    consoleRef.info = (...args: unknown[]) => {
      pushEntry("info", args);
      originalConsole.info(...args);
    };
    consoleRef.warn = (...args: unknown[]) => {
      pushEntry("warn", args);
      originalConsole.warn(...args);
    };
    consoleRef.error = (...args: unknown[]) => {
      pushEntry("error", args);
      originalConsole.error(...args);
    };
    consoleRef.debug = (...args: unknown[]) => {
      pushEntry("debug", args);
      originalConsole.debug(...args);
    };
  }

  return globalWindow.__tcBugFeedbackConsoleLogs__;
}

getBugFeedbackConsoleStore();

function buildBugFeedbackReport(description: string): BugFeedbackReport {
  return {
    type: "bug-feedback-report",
    createdAt: new Date().toISOString(),
    description: description || "(未填写)",
    environment: collectDiagnosticInfo(),
    consoleLogs: [...getBugFeedbackConsoleStore()],
  };
}

function generateSceneFileContent(description: string) {
  return JSON.stringify(buildBugFeedbackReport(description), null, 2);
}

function BugFeedbackContent() {
  const [description, setDescription] = useState("");
  const [copied, setCopied] = useState(false);

  const sceneContent = useMemo(
    () => generateSceneFileContent(description),
    [description],
  );

  const handleDownload = useCallback(() => {
    const content = generateSceneFileContent(description);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `bug-report-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [description]);

  const handleCopy = useCallback(async () => {
    const content = generateSceneFileContent(description);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    catch {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [description]);

  return (
    <div className="p-6 w-[92vw] max-w-md flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="text-lg font-bold">Bug反馈（QQ）</div>
        <div className="text-sm opacity-70">
          请点击下方按钮反馈 Bug
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

      <div className="border-t border-base-300 pt-4 space-y-3">
        <div className="text-sm font-medium">生成反馈 JSON</div>
        <textarea
          className="textarea textarea-bordered w-full h-20 text-sm"
          placeholder="简要描述你遇到的问题..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <pre className="bg-base-200 rounded-lg p-3 text-xs overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
          {sceneContent}
        </pre>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm flex-1 gap-1"
            onClick={handleDownload}
          >
            <DownloadSimpleIcon className="size-4" />
            生成 JSON
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-1 gap-1 ${copied ? "btn-success" : "btn-outline"}`}
            onClick={handleCopy}
          >
            <CopySimpleIcon className="size-4" />
            {copied ? "已复制" : "复制到剪贴板"}
          </button>
        </div>
        <div className="text-xs opacity-60">
          JSON 中包含问题描述、环境信息和最近的控制台日志。
        </div>
      </div>
    </div>
  );
}
