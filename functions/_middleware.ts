type PagesEnv = {
  TUANCHAT_API_ORIGIN?: string;
  TUANCHAT_MEDIA_ORIGIN?: string;
};

type PagesContext = {
  request: Request;
  env: PagesEnv;
  next: () => Promise<Response>;
};

const DEFAULT_API_ORIGIN = "http://media-origin.tuan.chat";
const DEFAULT_MEDIA_ORIGIN = "http://media-origin.tuan.chat";

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

async function proxyRequest(request: Request, targetUrl: string): Promise<Response> {
  const init: RequestInit = {
    method: request.method,
    headers: createProxyHeaders(request),
    body: request.body,
    redirect: "manual",
  };

  return fetch(new Request(targetUrl, init));
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);

  if (shouldProxy(url.pathname, API_PREFIXES)) {
    const origin = normalizeOrigin(context.env.TUANCHAT_API_ORIGIN, DEFAULT_API_ORIGIN);
    return proxyRequest(context.request, buildTargetUrl(url, origin));
  }

  if (shouldProxy(url.pathname, MEDIA_PREFIXES)) {
    const origin = normalizeOrigin(context.env.TUANCHAT_MEDIA_ORIGIN, DEFAULT_MEDIA_ORIGIN);
    return proxyRequest(context.request, buildTargetUrl(url, origin));
  }

  return context.next();
}
