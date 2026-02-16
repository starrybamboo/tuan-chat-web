function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function safeUrlParse(url: string): URL | null {
  try {
    return new URL(url);
  }
  catch {
    return null;
  }
}

function isElectronRuntime(): boolean {
  return typeof window !== "undefined" && typeof window.electronAPI !== "undefined";
}

function getBrowserOrigin(): string | null {
  if (typeof window === "undefined" || !window.location?.origin) {
    return null;
  }
  return window.location.origin;
}

function normalizeTerreBaseUrlCandidate(url: string): string {
  const normalized = normalizeBaseUrl(url);
  const parsed = safeUrlParse(normalized);
  if (!parsed) {
    return normalized;
  }

  if (isElectronRuntime()) {
    return normalizeBaseUrl(parsed.toString());
  }

  const browserOrigin = getBrowserOrigin();
  const browserParsed = browserOrigin ? safeUrlParse(browserOrigin) : null;
  const isSameOrigin = !!browserParsed
    && browserParsed.protocol === parsed.protocol
    && browserParsed.host === parsed.host;

  const normalizedPath = parsed.pathname.replace(/\/+$/, "");
  const looksLikeRootPath = normalizedPath === "" || normalizedPath === "/";

  // Web 环境下若 Terre URL 被误配成当前站点根路径（如 https://tuan.chat），
  // 自动补齐 /terre，避免后续 API 命中主站 /api 并返回 401。
  if (isSameOrigin && looksLikeRootPath) {
    parsed.pathname = "/terre";
  }

  return normalizeBaseUrl(parsed.toString());
}

function getDefaultTerreBaseUrlRaw(): string {
  const envUrl = (import.meta.env.VITE_TERRE_URL as string | undefined)?.trim();
  if (envUrl) {
    return normalizeTerreBaseUrlCandidate(envUrl);
  }

  // Electron 场景保持原有本地 Terre 默认端口，便于本机引擎拉起和调试。
  if (isElectronRuntime()) {
    return "http://localhost:3001";
  }

  // Web 场景默认回落到当前站点的 /terre。
  // 线上若缺失 VITE_TERRE_URL，直接回落到 origin 会误命中主站 /api，触发 401。
  const browserOrigin = getBrowserOrigin();
  if (browserOrigin) {
    return `${normalizeBaseUrl(browserOrigin)}/terre`;
  }

  return "http://localhost:3001";
}

function getDefaultTerreBaseUrl(): string {
  return normalizeBaseUrl(getDefaultTerreBaseUrlRaw());
}

export function getDefaultTerrePort(): number {
  const parsed = safeUrlParse(getDefaultTerreBaseUrl());
  if (!parsed) {
    return 3001;
  }

  const explicitPort = parsed.port ? Number(parsed.port) : Number.NaN;
  if (Number.isFinite(explicitPort) && explicitPort > 0) {
    return explicitPort;
  }

  if (parsed.protocol === "https:") {
    return 443;
  }
  if (parsed.protocol === "http:") {
    return 80;
  }
  return 3001;
}

function getDefaultTerreWsPath(): string {
  const wsRaw = (import.meta.env.VITE_TERRE_WS as string | undefined) || "";
  const parsed = safeUrlParse(wsRaw);
  const pathname = parsed?.pathname || "/api/webgalsync";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

let terrePortOverride: number | null = null;

function getTerrePortOverride(): number | null {
  return terrePortOverride;
}

export function setTerrePortOverride(port: number | null): void {
  if (typeof port !== "number" || !Number.isFinite(port) || port <= 0) {
    terrePortOverride = null;
    return;
  }
  terrePortOverride = Math.floor(port);
}

export function getTerreBaseUrl(): string {
  const base = getDefaultTerreBaseUrl();
  const overridePort = getTerrePortOverride();
  if (overridePort == null) {
    return base;
  }

  const parsed = safeUrlParse(base);
  if (!parsed) {
    return base;
  }

  parsed.port = String(overridePort);
  return normalizeBaseUrl(parsed.toString());
}

export function getTerreWsUrl(): string {
  const baseUrl = getTerreBaseUrl();
  const wsBase = baseUrl.replace(/^http/, "ws");
  return `${wsBase}${getDefaultTerreWsPath()}`;
}
