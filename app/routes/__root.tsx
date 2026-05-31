import type {
  RouteMetaArgs,
} from "@/routes/routeTypes";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import React from "react";
import { toast, Toaster } from "react-hot-toast";
import { installMediaDebugBridge } from "@/components/chat/infra/media/mediaDebug";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { ToastWindowRenderer } from "@/components/common/toastWindow/toastWindowRenderer";
import { GlobalContextProvider } from "@/components/globalContextProvider";
import { queryClient } from "@/queryClient";
import { checkAuthStatus } from "@/utils/auth/authapi";
import { consumeAuthToast } from "@/utils/auth/unauthorized";
import { installDiagnosticConsoleCapture } from "@/utils/diagnosticConsole";
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
const shouldEnableReactScan = typeof window !== "undefined" && (isTestBuild || import.meta.env.DEV);
const TEST_ENV_SPLASH_SESSION_KEY = "tc:test-env-splash:2026-02-20";
const BUG_FEEDBACK_SPLASH_SESSION_KEY = "tc:bug-feedback-splash:2026-05-20";
const CLOUDFLARE_WEB_ANALYTICS_SCRIPT_SRC = "https://static.cloudflareinsights.com/beacon.min.js";
const CLOUDFLARE_WEB_ANALYTICS_TOKEN = "bd3746d5fcac46db97172d382492de26";
const CLOUDFLARE_WEB_ANALYTICS_HOSTS = new Set([
  "tuan.chat",
  "www.tuan.chat",
  "test.tuan.chat",
  "www.test.tuan.chat",
]);

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

function getCloudflareWebAnalyticsScripts() {
  // 只在线上 Web 域名加载，避免本地开发和 Electron `app://` 壳污染站点统计。
  if (
    !import.meta.env.PROD
    || typeof window === "undefined"
    || window.location.protocol !== "https:"
    || !CLOUDFLARE_WEB_ANALYTICS_HOSTS.has(window.location.hostname.toLowerCase())
  ) {
    return [];
  }

  return [
    {
      "src": CLOUDFLARE_WEB_ANALYTICS_SCRIPT_SRC,
      "defer": true,
      "data-cf-beacon": JSON.stringify({
        token: CLOUDFLARE_WEB_ANALYTICS_TOKEN,
      }),
    },
  ];
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
  const [isTestEnvSplashOpen, setIsTestEnvSplashOpen] = React.useState(false);
  const [isBugFeedbackSplashOpen, setIsBugFeedbackSplashOpen] = React.useState(false);
  const authStatusQuery = useQuery({
    queryKey: ["authStatus"],
    queryFn: checkAuthStatus,
  });
  const isLoggedIn = authStatusQuery.data?.isLoggedIn === true;

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
    if (typeof window === "undefined" || !isTestBuild)
      return;
    try {
      if (window.sessionStorage.getItem(TEST_ENV_SPLASH_SESSION_KEY) === "1")
        return;
    }
    catch {
      // ignore
    }
    setIsTestEnvSplashOpen(true);
  }, []);

  const closeTestEnvSplash = React.useCallback(() => {
    setIsTestEnvSplashOpen(false);
    try {
      window.sessionStorage.setItem(TEST_ENV_SPLASH_SESSION_KEY, "1");
    }
    catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || authStatusQuery.isLoading || !isLoggedIn) {
      setIsBugFeedbackSplashOpen(false);
      return;
    }
    try {
      if (window.sessionStorage.getItem(BUG_FEEDBACK_SPLASH_SESSION_KEY) === "1")
        return;
    }
    catch {
      // ignore
    }
    setIsBugFeedbackSplashOpen(true);
  }, [authStatusQuery.isLoading, isLoggedIn]);

  const closeBugFeedbackSplash = React.useCallback(() => {
    setIsBugFeedbackSplashOpen(false);
    try {
      window.sessionStorage.setItem(BUG_FEEDBACK_SPLASH_SESSION_KEY, "1");
    }
    catch {
      // ignore
    }
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
      {import.meta.env.DEV
        ? (
            <TanStackRouterDevtools
              position="top-left"
              toggleButtonProps={{
                style: {
                  top: "8px",
                  left: "50%",
                  transform: "translateX(-50%)",
                },
              }}
            />
          )
        : null}
      {isTestEnvSplashOpen && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="测试环境提示">
          <div className="modal-box max-w-2xl">
            <h3 className="text-lg font-bold">测试环境提示</h3>
            <div className="mt-4 space-y-3 leading-7">
              <p>
                您现在访问的是团剧共创测试环境，相比于正式环境，测试环境会多出很多没有经过完善测试的功能，同时也有很多的bug，如果你不是团剧共创的深度用户，请酌情考虑使用。
              </p>
              <p>
                你可以访问团剧共创的正式环境来避免很多奇怪的bug。正式环境为，
                <a className="link link-primary ml-1" href="https://tuan.chat" target="_blank" rel="noreferrer">tuan.chat</a>
              </p>
            </div>
            <div className="modal-action">
              <a className="btn btn-outline" href="https://tuan.chat" target="_blank" rel="noreferrer">前往正式环境</a>
              <button type="button" className="btn btn-primary" onClick={closeTestEnvSplash}>我知道了</button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label="关闭测试环境提示"
            onClick={closeTestEnvSplash}
          />
        </div>
      )}
      {isBugFeedbackSplashOpen && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Bug反馈指引">
          <div className="modal-box max-w-2xl">
            <h3 className="text-lg font-bold">Bug 反馈指引</h3>
            <div className="mt-4 space-y-3 leading-7">
              <p>
                如果你在使用过程中遇到了 Bug，可以通过以下步骤快速反馈，帮助我们尽快修复问题：
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>点击顶栏右侧的 QQ 图标按钮</li>
                <li>在弹窗中简要描述你遇到的问题</li>
                <li>点击「生成现场文件」下载诊断信息文件</li>
                <li>将该文件和问题描述一起发送到 QQ 反馈群中</li>
              </ol>
              <p className="text-sm opacity-80">
                现场文件包含当前页面地址、浏览器信息等诊断数据，能帮助开发者快速定位问题。如有截图或录屏请一并附上。
              </p>
            </div>
            <div className="modal-action">
              <button type="button" className="btn btn-primary" onClick={closeBugFeedbackSplash}>我知道了</button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label="关闭Bug反馈指引"
            onClick={closeBugFeedbackSplash}
          />
        </div>
      )}
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
    scripts: getCloudflareWebAnalyticsScripts(),
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

  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-4">
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
              <div className="collapse collapse-arrow border border-base-300 bg-base-200">
                <div className="collapse-title font-medium">
                  Stack Trace (Development Only)
                </div>
                <div className="collapse-content">
                  <pre className="w-full p-2 overflow-x-auto bg-neutral text-neutral-content rounded-box text-sm">
                    <code>{stack}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          <div className="card-actions justify-center mt-6">
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
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <section className="w-full max-w-lg rounded-lg bg-base-100 p-8 text-center shadow-xl">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-warning/15 text-warning">
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
