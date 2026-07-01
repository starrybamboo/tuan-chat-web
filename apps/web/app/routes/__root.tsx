import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import React from "react";
import { toast, Toaster } from "react-hot-toast";

import type {
  RouteMetaArgs,
} from "@/routes/routeTypes";
import type { CloudflareWebAnalyticsStatus } from "@/utils/cloudflareWebAnalytics";

import { installMediaDebugBridge } from "@/components/chat/infra/media/mediaDebug";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
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
const shouldEnableReactScan = typeof window !== "undefined" && (isTestBuild || import.meta.env.DEV);

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
      <div className="flex items-center gap-2 text-base-content/70">
        <span className="loading loading-spinner loading-md" aria-label="Loading" />
        <span>Loading...</span>
      </div>
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
  const [cloudflareWebAnalyticsStatus, setCloudflareWebAnalyticsStatus] = React.useState<CloudflareWebAnalyticsStatus>(
    () => cloudflareWebAnalytics.getStatus(),
  );
  const authStatusQuery = useQuery({
    queryKey: ["authStatus"],
    queryFn: checkAuthStatus,
  });
  const isLoggedIn = authStatusQuery.data?.isLoggedIn === true;
  const isAnalyticsBlockedByAdBlocker = cloudflareWebAnalyticsStatus === "blocked";
  const shouldShowBugFeedbackGuide = isLoggedIn;

  React.useEffect(() => {
    const msg = consumeAuthToast();
    if (msg) {
      toast.error(msg);
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
    setCloudflareWebAnalyticsStatus(cloudflareWebAnalytics.getStatus());
    const unsubscribe = cloudflareWebAnalytics.subscribe(setCloudflareWebAnalyticsStatus);
    void cloudflareWebAnalytics.ensureLoaded();
    return unsubscribe;
  }, []);

  return (
    <GlobalContextProvider>
      {/* <Topbar></Topbar> */}
      <Outlet />
      {/* 挂载ToastWindow的地方 */}
      <div id="modal-root"></div>
      {/* 挂载sideDrawer的地方 */}
      <div id="side-drawer"></div>
      <Toaster />
      {/* ToastWindow渲染器，可以访问Router上下文 */}
      <ToastWindowRenderer />
      <StartupNoticeCenter
        isTestBuild={isTestBuild}
        isDevBuild={isDevBuild}
        isAuthStatusLoading={authStatusQuery.isLoading}
        isAnalyticsBlockedByAdBlocker={isAnalyticsBlockedByAdBlocker}
        shouldShowBugFeedbackGuide={shouldShowBugFeedbackGuide}
      />
      {import.meta.env.DEV
        ? (
            <TanStackRouterDevtools
              position="top-right"
              toggleButtonProps={{
                style: {
                  top: "8px",
                  // 贴近顶部操作区，避免开发工具按钮盖在页面正中间。
                  right: "clamp(3.5rem, 14rem, calc(100vw - 11rem))",
                },
              }}
            />
          )
        : null}
    </GlobalContextProvider>
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
      toast.error(`诊断日志下载失败：${result.error}`);
      return result;
    }

    toast.success(`已下载诊断日志：${result.fileName}`);
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
      toast.error("反馈草稿写入失败，请先下载诊断日志后手动补充。");
    }
    void navigate({ to: "/feedback" });
  }, [details, message, navigate]);

  return (
    <main className="
      min-h-screen bg-base-200 flex items-center justify-center p-4
    ">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          {/* Alert Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-error h-24 w-24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>

          <h1 className="card-title text-4xl font-bold mt-4">{message}</h1>
          <p className="py-4 text-lg">{details}</p>

          {/* Collapsible Stack Trace for Dev Mode */}
          {stack && (
            <div className="text-left w-full mt-4">
              <div className="
                collapse collapse-arrow border border-base-300 bg-base-200
              ">
                <div className="collapse-title font-medium">
                  Stack Trace (Development Only)
                </div>
                <div className="collapse-content">
                  <pre className="
                    w-full p-2 overflow-x-auto bg-neutral text-neutral-content
                    rounded-box text-sm
                  ">
                    <code>{stack}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          <div className="card-actions justify-center mt-6 gap-3">
            <button
              className="btn btn-outline btn-wide"
              onClick={handleDownloadDiagnosticLog}
              type="button"
            >
              下载诊断日志
            </button>
            <button
              className="btn btn-error btn-wide"
              onClick={handleOpenFeedback}
              type="button"
            >
              提交 Bug 反馈
            </button>
            <button
              className="btn btn-primary btn-wide"
              // Use replace: true to avoid the error page in browser history
              onClick={() => navigate({ to: "/", replace: true })}
              type="button"
            >
              返回主页
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function NotFoundFallback() {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = React.useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  return (
    <main className="
      min-h-screen bg-base-200 flex items-center justify-center p-4
    ">
      <section className="
        w-full max-w-lg rounded-lg bg-base-100 p-8 text-center shadow-xl
      ">
        <div className="
          mx-auto flex size-16 items-center justify-center rounded-full
          bg-warning/15 text-warning
        ">
          <span className="text-3xl font-bold">404</span>
        </div>
        <h1 className="mt-6 text-3xl font-bold">页面不存在</h1>
        <p className="mt-3 break-all text-base-content/70">
          当前路径无法匹配到可用页面：
          {location.pathname}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-outline" onClick={goBack}>
            返回上一页
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate({ to: "/", replace: true })}
          >
            回到首页
          </button>
        </div>
      </section>
    </main>
  );
}
