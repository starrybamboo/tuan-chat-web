type DesktopNotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  targetPath?: string | null;
  tag?: string;
  silent?: boolean;
};

const BROWSER_NOTIFICATION_AUTO_CLOSE_MS = 8000;
const BROWSER_PERMISSION_REQUEST_COOLDOWN_MS = 60_000;

let browserPermissionRequestInFlight: Promise<boolean> | null = null;
let lastBrowserPermissionRequestAt = 0;

function trimToEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTargetPath(targetPath?: string | null): string | null {
  const normalized = trimToEmpty(targetPath);
  if (!normalized) {
    return null;
  }
  // 仅允许站内相对路径，避免意外跳转到外部地址。
  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return null;
  }
  return normalized;
}

function jumpToPath(targetPath?: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeTargetPath(targetPath);
  if (!normalized) {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentPath === normalized) {
    return;
  }

  window.location.assign(normalized);
}

function canUseBrowserNotification(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return typeof Notification !== "undefined";
}

async function ensureBrowserNotificationPermission(): Promise<boolean> {
  if (!canUseBrowserNotification()) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }
  if (Notification.permission === "denied") {
    return false;
  }

  const now = Date.now();
  if (now - lastBrowserPermissionRequestAt < BROWSER_PERMISSION_REQUEST_COOLDOWN_MS) {
    return false;
  }
  lastBrowserPermissionRequestAt = now;

  if (!browserPermissionRequestInFlight) {
    browserPermissionRequestInFlight = Notification.requestPermission()
      .then(permission => permission === "granted")
      .catch(() => false)
      .finally(() => {
        browserPermissionRequestInFlight = null;
      });
  }

  return browserPermissionRequestInFlight;
}

async function showBrowserDesktopNotification(payload: DesktopNotificationPayload): Promise<boolean> {
  if (!canUseBrowserNotification()) {
    return false;
  }

  const granted = await ensureBrowserNotificationPermission();
  if (!granted) {
    return false;
  }

  try {
    const targetPath = normalizeTargetPath(payload.targetPath);
    const browserNotification = new Notification(payload.title, {
      body: payload.body,
      icon: trimToEmpty(payload.icon) || undefined,
      tag: trimToEmpty(payload.tag) || undefined,
      silent: Boolean(payload.silent),
    });

    browserNotification.onclick = () => {
      try {
        window.focus();
      }
      catch {
        // ignore
      }
      jumpToPath(targetPath);
      browserNotification.close();
    };

    window.setTimeout(() => {
      browserNotification.close();
    }, BROWSER_NOTIFICATION_AUTO_CLOSE_MS);

    return true;
  }
  catch {
    return false;
  }
}

async function showElectronDesktopNotification(payload: DesktopNotificationPayload): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  const notifyFn = window.electronAPI?.showDesktopNotification;
  if (typeof notifyFn !== "function") {
    return false;
  }

  try {
    const result = await notifyFn({
      title: payload.title,
      body: payload.body,
      icon: trimToEmpty(payload.icon) || undefined,
      targetPath: normalizeTargetPath(payload.targetPath) ?? undefined,
      tag: trimToEmpty(payload.tag) || undefined,
      silent: Boolean(payload.silent),
    });
    return Boolean(result?.ok);
  }
  catch {
    return false;
  }
}

export async function showDesktopNotification(payload: DesktopNotificationPayload): Promise<boolean> {
  const title = trimToEmpty(payload.title);
  const body = trimToEmpty(payload.body);
  if (!title || !body) {
    return false;
  }

  const normalizedPayload: DesktopNotificationPayload = {
    ...payload,
    title,
    body,
  };

  const notifiedByElectron = await showElectronDesktopNotification(normalizedPayload);
  if (notifiedByElectron) {
    return true;
  }
  return showBrowserDesktopNotification(normalizedPayload);
}
