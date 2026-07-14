import { RouterProvider } from "@tanstack/react-router";
import { startTransition, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { getRouter } from "./router";
import { installBrowserShortcutGuard } from "./utils/browserShortcutGuard";
import { installPreloadErrorRecovery } from "./utils/preloadErrorRecovery";
import "./utils/windowTimerBinding";

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- Window 扩展依赖 interface 声明合并。
  interface Window {
    __tcBrowserShortcutGuardCleanup?: () => void;
    __tcPreloadErrorRecoveryCleanup?: () => void;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element for SPA mount.");
}

window.__tcPreloadErrorRecoveryCleanup?.();
window.__tcPreloadErrorRecoveryCleanup = installPreloadErrorRecovery();

const router = getRouter();
window.__tcBrowserShortcutGuardCleanup?.();
window.__tcBrowserShortcutGuardCleanup = installBrowserShortcutGuard();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.__tcBrowserShortcutGuardCleanup?.();
    window.__tcBrowserShortcutGuardCleanup = undefined;
    window.__tcPreloadErrorRecoveryCleanup?.();
    window.__tcPreloadErrorRecoveryCleanup = undefined;
  });
}

startTransition(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
