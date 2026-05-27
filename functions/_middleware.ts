type PagesEnv = {
  TUANCHAT_API_ORIGIN?: string;
  TUANCHAT_MEDIA_ORIGIN?: string;
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

function shouldProxy(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildTargetUrl(requestUrl: URL, origin: string): string {
  const target = new URL(origin);
  target.pathname = `${target.pathname.replace(/\/+$/, "")}${requestUrl.pathname}`;
  target.search = requestUrl.search;
  return target.toString();
}

function createProxyHeaders(request: Request): Headers {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  headers.delete("cf-ray");
  return headers;
}

async function proxyRequest(request: Request, targetUrl: string, resolveOverride: string): Promise<Response> {
  const init: CloudflareRequestInit = {
    method: request.method,
    headers: createProxyHeaders(request),
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
    const origin = normalizeOrigin(context.env.TUANCHAT_API_ORIGIN, DEFAULT_API_ORIGIN);
    const resolveOverride = normalizeOptionalValue(context.env.TUANCHAT_RESOLVE_OVERRIDE, DEFAULT_RESOLVE_OVERRIDE);
    return proxyRequest(context.request, buildTargetUrl(url, origin), resolveOverride);
  }

  if (shouldProxy(url.pathname, MEDIA_PREFIXES)) {
    const origin = normalizeOrigin(context.env.TUANCHAT_MEDIA_ORIGIN, DEFAULT_MEDIA_ORIGIN);
    const resolveOverride = normalizeOptionalValue(context.env.TUANCHAT_RESOLVE_OVERRIDE, DEFAULT_RESOLVE_OVERRIDE);
    return proxyRequest(context.request, buildTargetUrl(url, origin), resolveOverride);
  }

  return context.next();
}
