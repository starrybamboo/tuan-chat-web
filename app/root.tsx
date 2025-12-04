import type { Route } from "./+types/root";
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
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
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

  // Since this component replaces the entire page when an error occurs,
  // it needs to render a complete HTML document structure.
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{message}</title>
        {/* We need to re-link the stylesheets here because the main layout is no longer rendered */}
        <Links />
      </head>
      <body>
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
      </body>
    </html>
  );
}
