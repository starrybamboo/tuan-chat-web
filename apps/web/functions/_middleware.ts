type PagesEnv = {
  TUANCHAT_API_ORIGIN?: string;
  TUANCHAT_MEDIA_ORIGIN?: string;
  TUANCHAT_API_HOST?: string;
  TUANCHAT_MEDIA_HOST?: string;
  TUANCHAT_ORIGIN_HOST?: string;
  TUANCHAT_API_RESOLVE_OVERRIDE?: string;
  TUANCHAT_MEDIA_RESOLVE_OVERRIDE?: string;
  TUANCHAT_RESOLVE_OVERRIDE?: string;
};

type PagesContext = {
  request: Request;
  env: PagesEnv;
  next: () => Promise<Response>;
};

type CloudflareRequestInit = RequestInit & {
  cf?: {
    resolveOverride?: string;
  };
};

const DEFAULT_API_ORIGIN = "https://origin.tuan.chat";
const DEFAULT_MEDIA_ORIGIN = "https://origin.tuan.chat";
const DEFAULT_ORIGIN_HOST = "";
const DEFAULT_API_RESOLVE_OVERRIDE = "";
const DEFAULT_MEDIA_RESOLVE_OVERRIDE = "";
const DEFAULT_RESOLVE_OVERRIDE = "";

const API_PREFIXES = [
  "/api",
  "/ws",
  "/tts",
  "/terre",
];

const MEDIA_PREFIXES = [
  "/media",
  "/avatar",
  "/updates",
];

const WEBGAL_ASSET_PROXY_PATH = "/webgal-asset-proxy";

function normalizeOrigin(value: string | undefined, fallback: string): string {
  const raw = String(value || fallback).trim().replace(/\/+$/, "");
  return raw || fallback;
}

function normalizeOptionalValue(value: string | undefined, fallback: string): string {
  return String(value || fallback).trim();
}

function resolveProxyConfig(
  originValue: string | undefined,
  originFallback: string,
  specificHostValue: string | undefined,
  sharedHostValue: string | undefined,
  specificOverrideValue: string | undefined,
  specificOverrideFallback: string,
  sharedOverrideValue: string | undefined,
) {
  const hasCustomOrigin = Boolean(originValue?.trim());
  const origin = normalizeOrigin(originValue, originFallback);
  const specificHost = normalizeOptionalValue(specificHostValue, "");
  const sharedHost = normalizeOptionalValue(sharedHostValue, "");
  const specificOverride = normalizeOptionalValue(specificOverrideValue, "");
  const sharedOverride = normalizeOptionalValue(sharedOverrideValue, DEFAULT_RESOLVE_OVERRIDE);

  return {
    origin,
    hostOverride: specificHost || sharedHost || (hasCustomOrigin ? "" : DEFAULT_ORIGIN_HOST),
    resolveOverride: specificOverride || sharedOverride || (hasCustomOrigin ? "" : specificOverrideFallback),
  };
}

function shouldProxy(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildTargetUrl(requestUrl: URL, origin: string): string {
  const target = new URL(origin);
  target.pathname = `${target.pathname.replace(/\/+$/, "")}${requestUrl.pathname}`;
  target.search = requestUrl.search;
  return target.toString();
}

function createProxyHeaders(request: Request, hostOverride: string): Headers {
  const headers = new Headers(request.headers);
  if (hostOverride) {
    // 真实源站只放行 tuan.chat / test.tuan.chat 等已知 Host，连接目标则走 DNS-only 源站名。
    headers.set("host", hostOverride);
  }
  else {
    headers.delete("host");
  }
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  headers.delete("cf-ray");
  return headers;
}

async function proxyRequest(
  request: Request,
  targetUrl: string,
  hostOverride: string,
  resolveOverride: string,
): Promise<Response> {
  const init: CloudflareRequestInit = {
    method: request.method,
    headers: createProxyHeaders(request, hostOverride),
    body: request.body,
    redirect: "manual",
  };

  if (resolveOverride) {
    // 使用源站允许的 Host，同时把解析定向到 DNS-only 源站，避免 Pages fetch 裸 IP。
    init.cf = { resolveOverride };
  }

  return fetch(targetUrl, init);
}

function isAllowedWebgalAssetTarget(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === "media.tuan.chat"
    || hostname.endsWith(".media.tuan.chat")
    || hostname === "origin.tuan.chat";
}

function buildTuanChatMediaOriginFallbackUrl(targetUrl: URL): string | null {
  const hostname = targetUrl.hostname.toLowerCase();
  if (hostname !== "media.tuan.chat" && !hostname.endsWith(".media.tuan.chat")) {
    return null;
  }
  const fallbackUrl = new URL("https://origin.tuan.chat");
  fallbackUrl.pathname = targetUrl.pathname;
  fallbackUrl.search = targetUrl.search;
  return fallbackUrl.toString();
}

function createWebgalAssetHeaders(request: Request): Headers {
  const headers = new Headers();
  headers.set("accept", request.headers.get("accept") || "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
  headers.set("referer", request.headers.get("referer") || `${new URL(request.url).origin}/`);
  headers.set("user-agent", request.headers.get("user-agent") || "Mozilla/5.0");

  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("authorization", authorization);
  }
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }
  return headers;
}

function copyWebgalAssetResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) {
    headers.set("cache-control", cacheControl);
  }
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    headers.set("content-length", contentLength);
  }
  headers.set("access-control-allow-origin", "*");
  return headers;
}

async function fetchWebgalAssetFromTarget(request: Request, targetUrl: URL): Promise<Response> {
  const requestHeaders = createWebgalAssetHeaders(request);
  const firstResponse = await fetch(targetUrl.toString(), {
    method: "GET",
    headers: requestHeaders,
    redirect: "manual",
  });
  if (firstResponse.ok) {
    return firstResponse;
  }

  const fallbackUrl = buildTuanChatMediaOriginFallbackUrl(targetUrl);
  if (!fallbackUrl) {
    return firstResponse;
  }

  const fallbackResponse = await fetch(fallbackUrl, {
    method: "GET",
    headers: requestHeaders,
    redirect: "manual",
  });
  return fallbackResponse.ok ? fallbackResponse : firstResponse;
}

async function handleWebgalAssetProxyRequest(request: Request, requestUrl: URL): Promise<Response> {
  if (request.method.toUpperCase() !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const targetUrlRaw = String(requestUrl.searchParams.get("url") || "").trim();
  let targetUrl: URL;
  try {
    targetUrl = new URL(targetUrlRaw);
  }
  catch {
    return new Response("Invalid asset URL", { status: 400 });
  }

  if (!["http:", "https:"].includes(targetUrl.protocol) || !isAllowedWebgalAssetTarget(targetUrl)) {
    return new Response("Asset URL is not allowed", { status: 400 });
  }

  const upstream = await fetchWebgalAssetFromTarget(request, targetUrl);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: copyWebgalAssetResponseHeaders(upstream),
  });
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);

  if (url.pathname === WEBGAL_ASSET_PROXY_PATH) {
    return handleWebgalAssetProxyRequest(context.request, url);
  }

  if (shouldProxy(url.pathname, API_PREFIXES)) {
    const { origin, hostOverride, resolveOverride } = resolveProxyConfig(
      context.env.TUANCHAT_API_ORIGIN,
      DEFAULT_API_ORIGIN,
      context.env.TUANCHAT_API_HOST,
      context.env.TUANCHAT_ORIGIN_HOST,
      context.env.TUANCHAT_API_RESOLVE_OVERRIDE,
      DEFAULT_API_RESOLVE_OVERRIDE,
      context.env.TUANCHAT_RESOLVE_OVERRIDE,
    );
    return proxyRequest(context.request, buildTargetUrl(url, origin), hostOverride, resolveOverride);
  }

  if (shouldProxy(url.pathname, MEDIA_PREFIXES)) {
    const { origin, hostOverride, resolveOverride } = resolveProxyConfig(
      context.env.TUANCHAT_MEDIA_ORIGIN,
      DEFAULT_MEDIA_ORIGIN,
      context.env.TUANCHAT_MEDIA_HOST,
      context.env.TUANCHAT_ORIGIN_HOST,
      context.env.TUANCHAT_MEDIA_RESOLVE_OVERRIDE,
      DEFAULT_MEDIA_RESOLVE_OVERRIDE,
      context.env.TUANCHAT_RESOLVE_OVERRIDE,
    );
    return proxyRequest(context.request, buildTargetUrl(url, origin), hostOverride, resolveOverride);
  }

  return context.next();
}
