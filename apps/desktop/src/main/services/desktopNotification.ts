import type { DesktopNotificationRequest, DesktopNotificationResult } from "@tuanchat/electron-ipc";

import { Notification, type BrowserWindow } from "electron";

export function normalizeNotificationTargetPath(targetPath: unknown) {
  const normalized = String(targetPath || "").trim();
  if (!normalized) {
    return "";
  }
  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return "";
  }
  return normalized;
}

function focusMainWindow(mainWindow: BrowserWindow | null) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
}

function navigateMainWindowToPath(mainWindow: BrowserWindow | null, targetPath: string) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const normalizedTargetPath = normalizeNotificationTargetPath(targetPath);
  if (!normalizedTargetPath) {
    return;
  }

  const escapedPath = JSON.stringify(normalizedTargetPath);
  const script = `
    (() => {
      try {
        const targetPath = ${escapedPath};
        const currentPath = String(window.location.pathname || "")
          + String(window.location.search || "")
          + String(window.location.hash || "");
        if (currentPath !== targetPath) {
          window.location.assign(targetPath);
        }
      }
      catch {}
    })();
  `;

  void mainWindow.webContents.executeJavaScript(script, true).catch(() => {
    // ignore
  });
}

export function showDesktopNotification(
  payload: DesktopNotificationRequest,
  getMainWindow: () => BrowserWindow | null,
): DesktopNotificationResult {
  const title = String(payload?.title || "").trim();
  const body = String(payload?.body || "").trim();
  if (!title || !body) {
    return { ok: false, reason: "missing-title-or-body" };
  }

  if (!Notification || typeof Notification.isSupported !== "function" || !Notification.isSupported()) {
    return { ok: false, reason: "notification-not-supported" };
  }

  const targetPath = normalizeNotificationTargetPath(payload?.targetPath);
  const icon = String(payload?.icon || "").trim();
  const notification = new Notification({
    title,
    body,
    icon: icon || undefined,
    silent: Boolean(payload?.silent),
  });

  notification.on("click", () => {
    const mainWindow = getMainWindow();
    focusMainWindow(mainWindow);
    navigateMainWindowToPath(mainWindow, targetPath);
  });

  notification.show();
  return { ok: true };
}
