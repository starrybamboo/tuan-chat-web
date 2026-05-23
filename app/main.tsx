import { RouterProvider } from "@tanstack/react-router";
import { startTransition, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getRouter } from "./router";
import { installBrowserShortcutGuard } from "./utils/browserShortcutGuard";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element for SPA mount.");
}

const router = getRouter();
installBrowserShortcutGuard();

startTransition(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
