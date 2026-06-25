export const IMMUTABLE_UPLOAD_CACHE_CONTROL = "public, max-age=31536000, immutable";
export const DEV_OSS_UPLOAD_PROXY_PATH = "/api/oss-upload-proxy";

export type OssUploadHeaders = Record<string, string>;

export type OssUploadTarget = {
  targetUrl: string;
  headers: OssUploadHeaders;
  viaDevProxy: boolean;
};

export type OssUploadTargetOptions = {
  devProxyPath?: string;
  isDev?: boolean;
  currentOrigin?: string;
};

export function buildOssUploadHeaders(blob: Blob, uploadHeaders?: OssUploadHeaders): OssUploadHeaders {
  const headers = normalizeUploadHeaders(uploadHeaders);

  if (!hasHeader(headers, "Cache-Control")) {
    headers["Cache-Control"] = IMMUTABLE_UPLOAD_CACHE_CONTROL;
  }
  if (blob.type && !hasHeader(headers, "Content-Type")) {
    headers["Content-Type"] = blob.type;
  }

  return headers;
}

export function resolveOssUploadTarget(
  url: string,
  blob: Blob,
  uploadHeaders?: OssUploadHeaders,
  options: OssUploadTargetOptions = {},
): OssUploadTarget {
  const headers = buildOssUploadHeaders(blob, uploadHeaders);
  const isDev = options.isDev ?? Boolean((import.meta as any).env?.DEV);
  const currentOrigin = options.currentOrigin ?? resolveCurrentOrigin();

  if (!isDev || !currentOrigin) {
    return {
      targetUrl: url,
      headers,
      viaDevProxy: false,
    };
  }

  try {
    const target = new URL(url, currentOrigin);
    if (target.origin === currentOrigin) {
      return {
        targetUrl: url,
        headers,
        viaDevProxy: false,
      };
    }
  }
  catch {
    return {
      targetUrl: url,
      headers,
      viaDevProxy: false,
    };
  }

  return {
    targetUrl: options.devProxyPath ?? DEV_OSS_UPLOAD_PROXY_PATH,
    headers: {
      "X-TC-OSS-Upload-Url": encodeURIComponent(url),
      ...headers,
    },
    viaDevProxy: true,
  };
}

function normalizeUploadHeaders(uploadHeaders?: OssUploadHeaders): OssUploadHeaders {
  const headers: OssUploadHeaders = {};
  if (!uploadHeaders) {
    return headers;
  }

  for (const [key, value] of Object.entries(uploadHeaders)) {
    const normalizedKey = key.trim();
    const normalizedValue = String(value).trim();
    if (normalizedKey && normalizedValue) {
      headers[normalizedKey] = normalizedValue;
    }
  }
  return headers;
}

function hasHeader(headers: OssUploadHeaders, name: string): boolean {
  const normalizedName = name.toLowerCase();
  return Object.keys(headers).some(key => key.toLowerCase() === normalizedName);
}

function resolveCurrentOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin;
}
