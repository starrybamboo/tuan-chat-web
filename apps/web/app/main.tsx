import { RouterProvider } from "@tanstack/react-router";
import { startTransition, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { getRouter } from "./router";
import { installBrowserShortcutGuard } from "./utils/browserShortcutGuard";
import "./utils/windowTimerBinding";

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- Window 扩展依赖 interface 声明合并。
  interface Window {
    __tcBrowserShortcutGuardCleanup?: () => void;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element for SPA mount.");
}

const router = getRouter();
window.__tcBrowserShortcutGuardCleanup?.();
window.__tcBrowserShortcutGuardCleanup = installBrowserShortcutGuard();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.__tcBrowserShortcutGuardCleanup?.();
    window.__tcBrowserShortcutGuardCleanup = undefined;
  });
}

startTransition(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
