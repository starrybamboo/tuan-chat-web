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

export async function onRequest(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);

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
