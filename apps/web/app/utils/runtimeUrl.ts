type RuntimeWindowLike = {
  isSecureContext?: boolean;
  location: {
    href: string;
    origin: string;
    protocol?: string;
  };
};

const LOOPBACK_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

const TUANCHAT_HOSTED_HOSTNAMES = new Set([
  "tuan.chat",
  "www.tuan.chat",
  "test.tuan.chat",
  "www.test.tuan.chat",
]);

const TUANCHAT_DIRECT_API_ORIGIN = "https://api.tuan.chat";

function getRuntimeWindow(): RuntimeWindowLike | null {
  if (typeof window === "undefined" || !window.location?.href || !window.location?.origin) {
    return null;
  }
  return window;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "");
  return normalized || "/";
}

function normalizeUrl(url: URL): URL {
  const normalized = new URL(url.toString());
  normalized.hash = "";
  normalized.pathname = normalizePathname(normalized.pathname);
  return normalized;
}

function toNormalizedAbsoluteUrl(url: URL): string {
  return trimTrailingSlash(normalizeUrl(url).toString());
}

function toNormalizedSameOriginPath(url: URL): string {
  const normalized = normalizeUrl(url);
  const pathname = normalized.pathname === "/" ? "" : normalized.pathname;
  return `${pathname}${normalized.search}`;
}

function createRuntimeUrl(rawUrl: string, runtimeWindow: RuntimeWindowLike): URL | null {
  try {
    return new URL(rawUrl, runtimeWindow.location.href);
  }
  catch {
    return null;
  }
}

function isHttpsPage(runtimeWindow: RuntimeWindowLike): boolean {
  return runtimeWindow.location.protocol === "https:";
}

function isSecureRuntimeContext(runtimeWindow: RuntimeWindowLike): boolean {
  return runtimeWindow.isSecureContext === true || isHttpsPage(runtimeWindow);
}

function getCurrentHost(runtimeWindow: RuntimeWindowLike): string {
  return new URL(runtimeWindow.location.origin).host;
}

function getCurrentHostname(runtimeWindow: RuntimeWindowLike): string {
  return new URL(runtimeWindow.location.origin).hostname.toLowerCase();
}

function isCurrentTuanChatHosted(runtimeWindow: RuntimeWindowLike): boolean {
  return TUANCHAT_HOSTED_HOSTNAMES.has(getCurrentHostname(runtimeWindow));
}

function isTuanChatHostedAlias(url: URL, runtimeWindow: RuntimeWindowLike): boolean {
  return TUANCHAT_HOSTED_HOSTNAMES.has(url.hostname.toLowerCase())
    && isCurrentTuanChatHosted(runtimeWindow);
}

function buildCurrentOriginUrl(
  runtimeWindow: RuntimeWindowLike,
  pathname: string,
  search: string = "",
): URL {
  const current = new URL(runtimeWindow.location.origin);
  current.pathname = pathname || "/";
  current.search = search;
  current.hash = "";
  return current;
}

function buildCurrentOriginWebSocketUrl(
  runtimeWindow: RuntimeWindowLike,
  pathname: string,
  search: string = "",
): URL {
  const current = buildCurrentOriginUrl(runtimeWindow, pathname, search);
  current.protocol = isHttpsPage(runtimeWindow) ? "wss:" : "ws:";
  return current;
}

function warnOnInsecureLoopbackRequest(url: URL, runtimeWindow: RuntimeWindowLike) {
  if (!LOOPBACK_HOSTNAMES.has(url.hostname) || isSecureRuntimeContext(runtimeWindow)) {
    return;
  }

  console.warn(
    "[TuanChat] 当前页面不是安全上下文(HTTPS)，请求本机 loopback(例如 localhost) 可能被浏览器 PNA 拦截。"
    + "建议将站点切换为 HTTPS，并确保本机服务支持 PNA 预检/跨域头。",
  );
}

function toCurrentOriginAbsoluteUrl(url: URL, runtimeWindow: RuntimeWindowLike): string {
  return toNormalizedAbsoluteUrl(buildCurrentOriginUrl(runtimeWindow, url.pathname, url.search));
}

function toCurrentOriginWebSocketBaseUrl(
  url: URL,
  runtimeWindow: RuntimeWindowLike,
  fallbackPath: string,
): string {
  const pathname = url.pathname && url.pathname !== "/" ? url.pathname : fallbackPath;
  return toNormalizedAbsoluteUrl(buildCurrentOriginWebSocketUrl(runtimeWindow, pathname, url.search));
}

function normalizeFallbackPath(fallbackPath: string): string {
  return fallbackPath.startsWith("/") ? fallbackPath : `/${fallbackPath}`;
}

function buildDirectApiUrlFromPath(pathname: string, search: string = ""): string {
  const direct = new URL(TUANCHAT_DIRECT_API_ORIGIN);
  direct.pathname = pathname || "/";
  direct.search = search;
  return toNormalizedAbsoluteUrl(direct);
}

function buildDirectApiUrl(url: URL, fallbackPath: string): string {
  const pathname = url.pathname && url.pathname !== "/" ? url.pathname : fallbackPath;
  return buildDirectApiUrlFromPath(pathname, url.search);
}

function buildDirectApiWebSocketUrlFromPath(pathname: string, search: string = ""): string {
  const direct = new URL(buildDirectApiUrlFromPath(pathname, search));
  direct.protocol = "wss:";
  return toNormalizedAbsoluteUrl(direct);
}

function buildDirectApiWebSocketUrl(url: URL, fallbackPath: string): string {
  const pathname = url.pathname && url.pathname !== "/" ? url.pathname : fallbackPath;
  return buildDirectApiWebSocketUrlFromPath(pathname, url.search);
}

function shouldUseDirectApiOrigin(url: URL, runtimeWindow: RuntimeWindowLike): boolean {
  if (!isCurrentTuanChatHosted(runtimeWindow)) {
    return false;
  }

  return url.origin === runtimeWindow.location.origin
    || isTuanChatHostedAlias(url, runtimeWindow)
    || (isHttpsPage(runtimeWindow) && (url.protocol === "http:" || url.protocol === "ws:"));
}

export function resolveRuntimeApiBaseUrl(envBaseUrl: string | undefined): string | undefined {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    return envBaseUrl;
  }

  const fallback = isCurrentTuanChatHosted(runtimeWindow)
    ? buildDirectApiUrlFromPath("/api")
    : runtimeWindow.location.origin;
  const rawUrl = String(envBaseUrl ?? "").trim();
  if (!rawUrl) {
    return fallback;
  }

  const url = createRuntimeUrl(rawUrl, runtimeWindow);
  if (!url) {
    return fallback;
  }

  if (shouldUseDirectApiOrigin(url, runtimeWindow)) {
    return buildDirectApiUrl(url, "/api");
  }

  if (url.origin === runtimeWindow.location.origin) {
    return toNormalizedSameOriginPath(url);
  }

  if (isTuanChatHostedAlias(url, runtimeWindow)) {
    return toNormalizedSameOriginPath(url);
  }

  warnOnInsecureLoopbackRequest(url, runtimeWindow);

  if (isHttpsPage(runtimeWindow) && url.protocol === "http:") {
    return toNormalizedSameOriginPath(url);
  }

  return toNormalizedAbsoluteUrl(url);
}

export function resolveRuntimeMediaBaseUrl(
  envBaseUrl: string | undefined,
  fallbackAbsoluteUrl: string,
): string {
  const runtimeWindow = getRuntimeWindow();
  const rawUrl = String(envBaseUrl ?? "").trim();
  if (!runtimeWindow) {
    return rawUrl ? trimTrailingSlash(rawUrl) : fallbackAbsoluteUrl;
  }

  const url = createRuntimeUrl(rawUrl || fallbackAbsoluteUrl, runtimeWindow);
  if (!url) {
    return fallbackAbsoluteUrl;
  }

  if (shouldUseDirectApiOrigin(url, runtimeWindow)) {
    return buildDirectApiUrl(url, "/");
  }

  if (isHttpsPage(runtimeWindow) && url.protocol === "http:") {
    return toCurrentOriginAbsoluteUrl(url, runtimeWindow);
  }

  return toNormalizedAbsoluteUrl(url);
}

export function resolveRuntimeTuanChatServiceBaseUrl(
  envBaseUrl: string | undefined,
  fallbackPath: string,
  localFallbackBaseUrl: string,
): string {
  const runtimeWindow = getRuntimeWindow();
  const rawUrl = String(envBaseUrl ?? "").trim();
  if (!runtimeWindow) {
    return rawUrl ? trimTrailingSlash(rawUrl) : localFallbackBaseUrl;
  }

  const normalizedFallbackPath = normalizeFallbackPath(fallbackPath);
  const fallback = isCurrentTuanChatHosted(runtimeWindow)
    ? `${TUANCHAT_DIRECT_API_ORIGIN}${normalizedFallbackPath}`
    : localFallbackBaseUrl;
  const url = createRuntimeUrl(rawUrl || fallback, runtimeWindow);
  if (!url) {
    return fallback;
  }

  if (shouldUseDirectApiOrigin(url, runtimeWindow)) {
    return buildDirectApiUrl(url, normalizedFallbackPath);
  }

  return toNormalizedAbsoluteUrl(url);
}

export function resolveRuntimeWebSocketBaseUrl(
  envBaseUrl: string | undefined,
  fallbackPath: string = "/ws",
): string | undefined {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    return envBaseUrl;
  }

  const normalizedFallbackPath = normalizeFallbackPath(fallbackPath);
  const fallback = isCurrentTuanChatHosted(runtimeWindow)
    ? buildDirectApiWebSocketUrlFromPath(normalizedFallbackPath)
    : toNormalizedAbsoluteUrl(buildCurrentOriginWebSocketUrl(runtimeWindow, normalizedFallbackPath));
  const rawUrl = String(envBaseUrl ?? "").trim();
  if (!rawUrl) {
    return fallback;
  }

  const url = createRuntimeUrl(rawUrl, runtimeWindow);
  if (!url) {
    return fallback;
  }

  if (url.protocol === "http:") {
    url.protocol = "ws:";
  }
  else if (url.protocol === "https:") {
    url.protocol = "wss:";
  }

  if (shouldUseDirectApiOrigin(url, runtimeWindow)) {
    return buildDirectApiWebSocketUrl(url, normalizedFallbackPath);
  }

  if (url.host === getCurrentHost(runtimeWindow) || isTuanChatHostedAlias(url, runtimeWindow)) {
    return toCurrentOriginWebSocketBaseUrl(url, runtimeWindow, normalizedFallbackPath);
  }

  if (isHttpsPage(runtimeWindow) && url.protocol === "ws:") {
    return toCurrentOriginWebSocketBaseUrl(url, runtimeWindow, normalizedFallbackPath);
  }

  return toNormalizedAbsoluteUrl(url);
}

export function appendUrlQueryParam(baseUrl: string, key: string, value: string): string {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}
