const DEFAULT_AUTH_REDIRECT = "/chat";

// 兼容历史遗留的绝对地址 redirect（例如旧端口 localhost:5180），统一收敛为当前站点内路径。
export function normalizeAuthRedirectPath(
  redirect: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
): string {
  const raw = String(redirect || "").trim();
  if (!raw) {
    return fallback;
  }

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallback;
    }

    const normalizedPath = `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
    if (parsed.origin !== window.location.origin) {
      return normalizedPath;
    }

    return normalizedPath;
  }
  catch {
    return fallback;
  }
}
