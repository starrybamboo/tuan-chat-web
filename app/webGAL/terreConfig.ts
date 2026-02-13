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

function getDefaultTerreBaseUrlRaw(): string {
  return (import.meta.env.VITE_TERRE_URL as string | undefined) || "http://localhost:3001";
}

function getDefaultTerreBaseUrl(): string {
  return normalizeBaseUrl(getDefaultTerreBaseUrlRaw());
}

export function getDefaultTerrePort(): number {
  const parsed = safeUrlParse(getDefaultTerreBaseUrl());
  const port = parsed?.port ? Number(parsed.port) : Number.NaN;
  return Number.isFinite(port) && port > 0 ? port : 3001;
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
