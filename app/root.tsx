import type { Route } from "./+types/root";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";

import { ToastWindowRenderer } from "@/components/common/toastWindow/toastWindowRenderer";
import { GlobalContextProvider } from "@/components/globalContextProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import { Toaster } from "react-hot-toast";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
} from "react-router";
import "./app.css";
import "./animation.css";

// Patch customElements.define to avoid "already defined" errors from BlockSuite or other libraries during HMR/re-mounts.
if (typeof window !== "undefined" && window.customElements) {
  const originalDefine = window.customElements.define;
  window.customElements.define = function (name, constructor, options) {
    if (window.customElements.get(name)) {
      return;
    }
    originalDefine.call(this, name, constructor, options);
  };
}

// DEV-only: help diagnose "Multiple versions of Lit loaded".
// If it still happens after dedupe/alias, this prints a stack once so we can
// pinpoint which module instance is triggering the warning.
if (typeof window !== "undefined" && import.meta.env.DEV) {
  const originalWarn = console.warn;
  let printedLitMultiStack = false;

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
}

const queryClient = new QueryClient(
  {
    defaultOptions: {
      queries: {
        retry: 2, // 请求失败重试次数
        staleTime: 1000 * 60 * 5,
      },
    },
  },
);

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  React.useEffect(() => {
    try {
      useDrawerPreferenceStore.getState().hydrateFromLocalStorage();
    }
    catch {
      // ignore
    }
  }, []);

  return (
    <GlobalContextProvider>
      {/* <Topbar></Topbar> */}
      <Outlet />
      <ReactQueryDevtools initialIsOpen={false} />
      {/* 挂载popWindow的地方 */}
      <div id="modal-root"></div>
      {/* 挂载sideDrawer的地方 */}
      <div id="side-drawer"></div>
      <Toaster />
      {/* ToastWindow渲染器，可以访问Router上下文 */}
      <ToastWindowRenderer />
    </GlobalContextProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const navigate = useNavigate();
  let message = "Oops! Something went wrong.";
  let details = "An unexpected error occurred. Please try again later.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Page Not Found" : "An Error Occurred";
    details
        = error.status === 404
        ? "页面不存在"
        : error.data?.message || error.statusText;
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
              <div
                tabIndex={0}
                className="collapse collapse-arrow border border-base-300 bg-base-200"
              >
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
              onClick={() => navigate("/", { replace: true })}
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
