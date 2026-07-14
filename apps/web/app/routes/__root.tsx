import { WarningCircleIcon } from "@phosphor-icons/react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import React from "react";

import type {
  RouteMetaArgs,
} from "@/routes/routeTypes";
import type { CloudflareWebAnalyticsStatus } from "@/utils/cloudflareWebAnalytics";

import {
  CHAT_LOCAL_DB_UNAVAILABLE_EVENT,
  type ChatLocalDbUnavailableEventDetail,
  consumeChatLocalDbUnavailableEvent,
  logChatLocalDbUnavailable,
} from "@/components/chat/infra/localDb/localDbStatusEvents";
import { installMediaDebugBridge } from "@/components/chat/infra/media/mediaDebug";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { appToast, AppToaster } from "@/components/common/appToast/appToast";
import { Button } from "@/components/common/Button";
import { ConfirmDialogProvider } from "@/components/common/ConfirmDialog";
import { Surface, Text } from "@/components/common/DesignLanguage";
import { Disclosure } from "@/components/common/Disclosure";
import { StateView } from "@/components/common/StateView";
import { ToastWindowRenderer } from "@/components/common/toastWindow/toastWindowRenderer";
import { writeFeedbackAttachmentDraft } from "@/components/feedback/feedbackAttachmentDraft";
import { buildDiagnosticLogFile, buildRouteErrorFeedbackDraft } from "@/components/feedback/feedbackDiagnosticDraft";
import { writeFeedbackDraft } from "@/components/feedback/feedbackDraft";
import { GlobalContextProvider } from "@/components/globalContextProvider";
import StartupNoticeCenter from "@/components/startupNotice/startupNoticeCenter";
import { queryClient } from "@/queryClient";
import { checkAuthStatus } from "@/utils/auth/authapi";
import { consumeAuthToast } from "@/utils/auth/unauthorized";
import { cloudflareWebAnalytics } from "@/utils/cloudflareWebAnalytics";
import { isDesignSystemPath } from "@/utils/devRouteAccess";
import {
  buildDiagnosticConsoleFileContent,
  buildDiagnosticConsoleFileName,
  buildDiagnosticConsoleReport,
  exportDiagnosticConsoleFile,
  installDiagnosticConsoleCapture,
  recordDiagnosticConsoleEntry,
} from "@/utils/diagnosticConsole";
import { createSeoMeta, getCanonicalHref } from "@/utils/seo";
import "@/app.css";

if (typeof window !== "undefined") {
  installDiagnosticConsoleCapture();
}

// Patch customElements.define to avoid duplicate custom-element registrations during HMR/re-mounts.
if (typeof window !== "undefined" && window.customElements) {
  const originalDefine = window.customElements.define;
  window.customElements.define = function (name, constructor, options) {
    if (window.customElements.get(name)) {
      return;
    }
    originalDefine.call(this, name, constructor, options);
  };
}

if (typeof window !== "undefined") {
  installMediaDebugBridge();
}

// DEV-only: help diagnose "Multiple versions of Lit loaded".
// If it still happens after dedupe/alias, this prints a stack once so we can
// pinpoint which module instance is triggering the warning.
if (typeof window !== "undefined" && import.meta.env.DEV) {
  const originalWarn = console.warn;
  const originalError = console.error;
  let printedLitMultiStack = false;
  let printedNaNChildrenStack = false;

  console.warn = (...args: unknown[]) => {
    try {
      const first = typeof args[0] === "string" ? (args[0] as string) : "";
      if (!printedLitMultiStack && first.includes("Multiple versions of Lit loaded")) {
        printedLitMultiStack = true;
        originalWarn(...args);
        originalWarn(`[tc] Lit multiple-versions warn stack:\n${new Error("Lit multiple-versions warn stack").stack ?? ""}`);
        return;
      }
    }
    catch {
      // ignore
    }

    originalWarn(...args);
  };

  console.error = (...args: unknown[]) => {
    try {
      const first = typeof args[0] === "string" ? (args[0] as string) : "";
      if (!printedNaNChildrenStack && first.includes("Received NaN for the `children` attribute")) {
        printedNaNChildrenStack = true;
        originalError(...args);
        originalError(`[tc] NaN children warn stack:\n${new Error("NaN children warn stack").stack ?? ""}`);
        return;
      }
    }
    catch {
      // ignore
    }

    originalError(...args);
  };
}

const isTestBuild = import.meta.env.MODE === "test";
const isDevBuild = import.meta.env.DEV;
const shouldEnableReactScan
  = typeof window !== "undefined"
    && (isDevBuild || isTestBuild)
    && !isDesignSystemPath(window.location.pathname);
if (shouldEnableReactScan) {
  void import("react-scan")
    .then(({ scan }) => {
      scan({
        enabled: true,
        showToolbar: true,
        // test 站点是 production build，需要显式强制开启。
        dangerouslyForceRunInProduction: isTestBuild,
      });
    })
    .catch(() => {
      // ignore
    });
}

if (typeof window !== "undefined" && import.meta.env.MODE === "test" && !(window as any).__tcTestTitleTagInstalled) {
  // test 环境为标签页标题追加标识，避免与正式环境混淆。
  const TEST_TITLE_TAG = " · 测试环境";
  const applyTestTitleTag = () => {
    const currentTitle = document.title.trim();
    if (!currentTitle) {
      document.title = `tuan-chat${TEST_TITLE_TAG}`;
      return;
    }
    if (!currentTitle.includes(TEST_TITLE_TAG)) {
      document.title = `${currentTitle}${TEST_TITLE_TAG}`;
    }
  };

  (window as any).__tcTestTitleTagInstalled = true;
  applyTestTitleTag();
  const titleObserver = new MutationObserver(() => applyTestTitleTag());
  titleObserver.observe(document.head, {
    subtree: true,
    childList: true,
    characterData: true,
  });
}

export function links() {
  return import.meta.env.VITE_ENABLE_GOOGLE_FONTS === "true"
    ? [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous" as const,
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
        },
      ]
    : [];
}

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "团剧共创",
    description: "团剧共创是面向团剧、模组与设定创作的协作平台，可用于发现公开模组、浏览素材库、管理角色和作品。",
    path: "/",
    index: false,
  });
}

function CanonicalLink() {
  const location = useLocation();
  const canonicalHref = React.useMemo(() => getCanonicalHref(location.pathname), [location.pathname]);

  return <link rel="canonical" href={canonicalHref} />;
}

function HydrateFallback() {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <StateView loading title="正在加载…" className="py-0" />
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeadContent />
      <CanonicalLink />
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </>
  );
}

function App() {
  const location = useLocation();
  const isDesignSystemPage = isDesignSystemPath(location.pathname);
  const [cloudflareWebAnalyticsStatus, setCloudflareWebAnalyticsStatus] = React.useState<CloudflareWebAnalyticsStatus>(
    () => cloudflareWebAnalytics.getStatus(),
  );
  const authStatusQuery = useQuery({
    queryKey: ["authStatus"],
    queryFn: checkAuthStatus,
    enabled: !isDesignSystemPage,
  });
  const isLoggedIn = authStatusQuery.data?.isLoggedIn === true;
  const isAnalyticsBlockedByAdBlocker = cloudflareWebAnalyticsStatus === "blocked";
  const shouldShowBugFeedbackGuide = isLoggedIn;

  React.useEffect(() => {
    const msg = consumeAuthToast();
    if (msg) {
      appToast.error(msg);
    }
  }, []);

  React.useEffect(() => {
    try {
      useDrawerPreferenceStore.getState().hydrateFromLocalStorage();
    }
    catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    let hasShownLocalDbUnavailableToast = false;
    const showLocalDbUnavailableToast = (detail: ChatLocalDbUnavailableEventDetail) => {
      if (hasShownLocalDbUnavailableToast) {
        return;
      }
      hasShownLocalDbUnavailableToast = true;
      logChatLocalDbUnavailable(detail);
      appToast.warning({
        title: "本地消息缓存不可用",
        description: detail.message,
        details: detail.suggestion
          ? `${detail.suggestion} 不影响正常收发消息；刷新后会从服务器重新拉取历史消息。`
          : "不影响正常收发消息；刷新后会从服务器重新拉取历史消息。",
      });
    };
    const handleLocalDbUnavailable = (event: Event) => {
      showLocalDbUnavailableToast((event as CustomEvent<ChatLocalDbUnavailableEventDetail>).detail);
      consumeChatLocalDbUnavailableEvent();
    };

    window.addEventListener(CHAT_LOCAL_DB_UNAVAILABLE_EVENT, handleLocalDbUnavailable);
    const pendingLocalDbUnavailableEvent = consumeChatLocalDbUnavailableEvent();
    if (pendingLocalDbUnavailableEvent) {
      showLocalDbUnavailableToast(pendingLocalDbUnavailableEvent);
    }
    return () => {
      window.removeEventListener(CHAT_LOCAL_DB_UNAVAILABLE_EVENT, handleLocalDbUnavailable);
    };
  }, []);

  React.useEffect(() => {
    setCloudflareWebAnalyticsStatus(cloudflareWebAnalytics.getStatus());
    const unsubscribe = cloudflareWebAnalytics.subscribe(setCloudflareWebAnalyticsStatus);
    void cloudflareWebAnalytics.ensureLoaded();
    return unsubscribe;
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <GlobalContextProvider>
        {/* <Topbar></Topbar> */}
        <Outlet />
      {/* 挂载ToastWindow的地方 */}
      <div id="modal-root"></div>
      {/* 挂载sideDrawer的地方 */}
      <div id="side-drawer"></div>
      <AppToaster />
      {/* ToastWindow渲染器，可以访问Router上下文 */}
      <ToastWindowRenderer />
      {/* 命令式 confirm() 的承载者 */}
      <ConfirmDialogProvider />
      {isDesignSystemPage
        ? null
        : (
            <StartupNoticeCenter
              isTestBuild={isTestBuild}
              isDevBuild={isDevBuild}
              isAuthStatusLoading={authStatusQuery.isLoading}
              isAnalyticsBlockedByAdBlocker={isAnalyticsBlockedByAdBlocker}
              shouldShowBugFeedbackGuide={shouldShowBugFeedbackGuide}
            />
          )}
      </GlobalContextProvider>
    </MotionConfig>
  );
}

function RootRouteComponent() {
  return (
    <Layout>
      <App />
    </Layout>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      },
      { name: "theme-color", content: "#101828" },
      ...meta({ params: {} }),
    ],
    links: links(),
  }),
  component: RootRouteComponent,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFoundFallback,
  pendingComponent: HydrateFallback,
});

function isRouteErrorResponse(error: unknown): error is { status: number; statusText?: string; data?: { message?: string } } {
  return typeof error === "object"
    && error !== null
    && "status" in error
    && typeof (error as { status?: unknown }).status === "number";
}

function ErrorBoundary({ error }: { error: Error }) {
  const navigate = useNavigate();
  let message = "Oops! Something went wrong.";
  let details = "An unexpected error occurred. Please try again later.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Page Not Found" : "An Error Occurred";
    details
      = error.status === 404
        ? "页面不存在"
        : error.data?.message || error.statusText || "请求失败";
  }
  else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  React.useEffect(() => {
    recordDiagnosticConsoleEntry("error", ["[route-error-boundary]", error]);
  }, [error]);

  const handleDownloadDiagnosticLog = React.useCallback(() => {
    const result = exportDiagnosticConsoleFile();
    if (!result.ok) {
      appToast.error({
        title: "诊断日志下载失败",
        description: result.error,
        details: "你仍然可以手动截图或复制页面错误信息反馈给我们。",
      });
      return result;
    }

    appToast.success({
      title: "诊断日志已下载",
      description: result.fileName,
      terms: [{
        label: "诊断日志",
        description: "记录当前页面错误和控制台信息的文件，用于帮助定位问题。",
      }],
    });
    return result;
  }, []);

  const handleOpenFeedback = React.useCallback(() => {
    const report = buildDiagnosticConsoleReport();
    const diagnosticFileName = buildDiagnosticConsoleFileName();
    const diagnosticFile = buildDiagnosticLogFile(
      diagnosticFileName,
      buildDiagnosticConsoleFileContent(report),
    );
    const attachmentWritten = writeFeedbackAttachmentDraft([diagnosticFile]);
    const draftWritten = writeFeedbackDraft(buildRouteErrorFeedbackDraft({
      message,
      details,
      pageUrl: typeof window === "undefined" ? undefined : window.location.href,
      diagnosticFileName,
    }));
    if (!draftWritten || !attachmentWritten) {
      appToast.error({
        title: "反馈草稿写入失败",
        description: "请先下载诊断日志，再到反馈页手动补充错误信息。",
      });
    }
    void navigate({ to: "/feedback" });
  }, [details, message, navigate]);

  return (
    <main className="
      min-h-screen bg-base-200 flex items-center justify-center p-4
    ">
      <Surface level="content" className="w-full max-w-lg p-6 text-center shadow-xl">
          <WarningCircleIcon className="mx-auto size-24 text-error" weight="regular" aria-hidden="true" />

          <Text as="h1" variant="pageTitle" className="mt-4">{message}</Text>
          <Text as="p" variant="body" className="py-4">{details}</Text>

          {stack && (
            <Disclosure
              title="Stack Trace (Development Only)"
              className="mt-4 w-full bg-base-200 text-left"
            >
              <pre className="w-full overflow-x-auto overscroll-x-none rounded-md bg-neutral p-2 text-sm text-neutral-content">
                <code>{stack}</code>
              </pre>
            </Disclosure>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              className="w-full sm:w-64"
              onClick={handleDownloadDiagnosticLog}
            >
              下载诊断日志
            </Button>
            <Button
              variant="error"
              className="w-full sm:w-64"
              onClick={handleOpenFeedback}
            >
              提交 Bug 反馈
            </Button>
            <Button
              variant="primary"
              className="w-full sm:w-64"
              // Use replace: true to avoid the error page in browser history
              onClick={() => navigate({ to: "/", replace: true })}
            >
              返回主页
            </Button>
          </div>
      </Surface>
    </main>
  );
}

// 404 品牌角色彩蛋阈值与登录页 LoginBrandIntro 保持一致（4 击探头 / 8 击现身），
// 让 404 上探头出来的角色就是登录页那只「跟过来了」的角色，复用同一组品牌图。
const NOT_FOUND_PEEK_CLICK_THRESHOLD = 4;
const NOT_FOUND_REVEAL_CLICK_THRESHOLD = 8;
const NOT_FOUND_PEEK_IMAGE_SRC = "/login-brand-peek.png";
const NOT_FOUND_REVEAL_IMAGE_SRC = "/login-brand-reveal.png";

// galgame 风「迷路」台词：随点击推进；到现身阈值给出彩蛋句。
const NOT_FOUND_DIALOGUE_LINES = [
  "这里好像什么都没有……要不回去？",
  "诶，你戳到我了。",
  "再点也不会变出页面哦。",
  "……不过，难得有人走到这儿。",
  "既然你这么坚持——那我也出来吧。",
  "这里啊，是我们的小角落。",
  "嘘——别告诉别人你来过。",
] as const;
const NOT_FOUND_REVEAL_LINE = "「迷路，也是剧情的一部分。」 ✨";

function resolveNotFoundEasterEggImage(clickCount: number): string | null {
  if (clickCount >= NOT_FOUND_REVEAL_CLICK_THRESHOLD) {
    return NOT_FOUND_REVEAL_IMAGE_SRC;
  }
  if (clickCount >= NOT_FOUND_PEEK_CLICK_THRESHOLD) {
    return NOT_FOUND_PEEK_IMAGE_SRC;
  }
  return null;
}

function resolveNotFoundDialogue(clickCount: number): string {
  if (clickCount >= NOT_FOUND_REVEAL_CLICK_THRESHOLD) {
    return NOT_FOUND_REVEAL_LINE;
  }
  return NOT_FOUND_DIALOGUE_LINES[
    Math.min(clickCount, NOT_FOUND_DIALOGUE_LINES.length - 1)
  ];
}

function NotFoundFallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const clickControls = useAnimationControls();
  const [clickCount, setClickCount] = React.useState(0);

  // 光标跟随：角色轻微偏头看向光标，制造「活着」的感觉；reduce-motion 下不动。
  const tiltSource = useMotionValue(0);
  const headTilt = useSpring(tiltSource, { stiffness: 140, damping: 18 });

  const easterEggImage = resolveNotFoundEasterEggImage(clickCount);
  const dialogue = resolveNotFoundDialogue(clickCount);

  const goBack = React.useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  const handleHeroClick = () => {
    setClickCount(current => current + 1);
    if (reduceMotion) {
      return;
    }
    // 点击时的轻量「被戳到」回弹，与登录页 Logo 点击一致。
    void clickControls.start({
      rotate: [0, -1.4, 1.4, 0],
      scale: [1, 0.97, 1.03, 1],
      transition: { duration: 0.34, ease: "easeOut" },
    });
  };

  const handleHeroPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (reduceMotion) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    // 归一化到 -0.5..0.5，映射为 ±6deg 偏头。
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    tiltSource.set(offsetX * 12);
  };

  const handleHeroPointerLeave = () => {
    tiltSource.set(0);
  };

  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <section className="w-full max-w-lg rounded-lg bg-base-100 p-8 text-center shadow-xl">
        <motion.button
          type="button"
          aria-label="404 页面不存在，点按几下看看谁藏在这里"
          onClick={handleHeroClick}
          onPointerMove={handleHeroPointerMove}
          onPointerLeave={handleHeroPointerLeave}
          animate={clickControls}
          className="
            group relative mx-auto isolate flex flex-col items-center rounded-md px-6 py-2
            transition-colors duration-200 hover:bg-base-content/5
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
          "
        >
          <motion.span
            style={reduceMotion ? undefined : { rotateY: headTilt, transformPerspective: 600 }}
            className="relative inline-flex items-center justify-center"
          >
            <AnimatePresence mode="wait">
              {easterEggImage && (
                <motion.img
                  key={easterEggImage}
                  src={easterEggImage}
                  alt=""
                  aria-hidden="true"
                  className="
                    pointer-events-none absolute bottom-[calc(100%-0.35rem)] left-1/2
                    z-0 size-28 -translate-x-1/2 object-contain drop-shadow-xl
                    sm:size-32
                  "
                  // 探头入场：从下方「藏着」→ 好奇探出(歪头偷看) → 缩一下 → 归位，四段关键帧模拟探头探脑。
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 56, scale: 0.82, rotate: 0 }}
                  animate={
                    reduceMotion
                      ? { opacity: 1 }
                      : {
                          opacity: [0, 1, 1, 1],
                          y: [56, -8, 10, 0],
                          scale: [0.82, 1.05, 0.97, 1],
                          rotate: [0, -4, 3, 0],
                        }
                  }
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: 28, scale: 0.9, rotate: 4, transition: { duration: 0.32, ease: "easeIn" } }
                  }
                  transition={
                    reduceMotion ? { duration: 0 } : { duration: 0.8, ease: "easeOut", times: [0, 0.45, 0.75, 1] }
                  }
                />
              )}
            </AnimatePresence>

            <span
              aria-hidden="true"
              className="relative z-10 text-7xl font-bold leading-none tracking-tight text-base-content sm:text-8xl"
            >
              404
            </span>
          </motion.span>
        </motion.button>

        <h1 className="mt-8 text-2xl font-bold text-base-content sm:text-3xl">页面不存在</h1>

        {/* galgame 风对话：随点击推进，打字机式逐字浮现（复用登录页副标题的 maxWidth 手法）。 */}
        <div className="mt-3 flex min-h-6 items-center justify-center text-sm text-base-content/70 sm:text-base">
          <AnimatePresence mode="wait">
            <motion.span
              key={dialogue}
              className="inline-block overflow-hidden whitespace-nowrap"
              initial={reduceMotion ? { opacity: 1, maxWidth: "none" } : { opacity: 0, maxWidth: 0 }}
              animate={
                reduceMotion
                  ? { opacity: 1, maxWidth: "none" }
                  : { opacity: 1, maxWidth: `${dialogue.length + 0.6}em` }
              }
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, maxWidth: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
            >
              {dialogue}
            </motion.span>
          </AnimatePresence>
          <motion.span
            aria-hidden="true"
            className="ml-1 inline-block h-[0.9em] w-0.5 bg-primary"
            animate={reduceMotion ? { opacity: 1 } : { opacity: [1, 0, 1] }}
            transition={reduceMotion ? { duration: 0 } : { duration: 1, repeat: Infinity, repeatDelay: 0.08 }}
          />
        </div>

        {/* 彩蛋可发现性提示：首次点击前显示，点击后淡出。 */}
        <AnimatePresence>
          {clickCount === 0 && (
            <motion.p
              className="mt-2 text-xs text-base-content/50"
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            >
              戳戳上面的 404 试试 →
            </motion.p>
          )}
        </AnimatePresence>

        <p className="mt-4 break-all text-xs text-base-content/50">
          当前路径无法匹配到可用页面：{location.pathname}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={goBack}>返回上一页</Button>
          <Button variant="primary" onClick={() => navigate({ to: "/", replace: true })}>回到首页</Button>
        </div>
      </section>
    </main>
  );
}
