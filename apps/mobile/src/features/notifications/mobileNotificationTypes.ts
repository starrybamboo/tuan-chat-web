export type NativeAppNotificationPayload = {
  body?: string;
  tag?: string;
  resourceId?: number | null;
  resourceType?: string | null;
  targetPath?: string | null;
  title?: string;
};

const APP_DEEP_LINK_PROTOCOL = "tuanchat:";

export function normalizeNotificationTargetPath(targetPath?: string | null) {
  if (typeof targetPath !== "string") {
    return null;
  }

  const normalized = targetPath.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("/")) {
    return normalized.startsWith("//") ? null : normalized;
  }

  try {
    const url = new URL(normalized);
    if (url.protocol !== APP_DEEP_LINK_PROTOCOL) {
      return null;
    }

    const pathname = url.host ? `/${url.host}${url.pathname}` : url.pathname;
    if (!pathname.startsWith("/") || pathname.startsWith("//")) {
      return null;
    }
    return `${pathname}${url.search}${url.hash}`;
  }
  catch {
    return null;
  }
}
