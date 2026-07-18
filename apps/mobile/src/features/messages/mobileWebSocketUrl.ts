import {
  DEFAULT_TUANCHAT_API_BASE_URL,
  LOCAL_TUANCHAT_API_BASE_URL,
  PRODUCTION_TUANCHAT_API_BASE_URL,
} from "../../lib/api";

const LOCAL_TUANCHAT_WS_URL = "ws://10.0.2.2:8090";
const PRODUCTION_TUANCHAT_WS_URL = "wss://api.tuan.chat/ws";

function resolveFallbackWebSocketUrl(apiBaseUrl: string) {
  if (apiBaseUrl === PRODUCTION_TUANCHAT_API_BASE_URL) {
    return PRODUCTION_TUANCHAT_WS_URL;
  }
  if (apiBaseUrl === "https://tuan.chat/api") {
    return "wss://tuan.chat/ws";
  }
  if (apiBaseUrl === LOCAL_TUANCHAT_API_BASE_URL) {
    return LOCAL_TUANCHAT_WS_URL;
  }
  return null;
}

export function createMobileWebSocketUrl(token: string) {
  const explicitWebSocketUrl = process.env.EXPO_PUBLIC_TUANCHAT_API_WS_URL?.trim();
  const fallbackWebSocketUrl = resolveFallbackWebSocketUrl(DEFAULT_TUANCHAT_API_BASE_URL);
  const normalizedBaseUrl = (explicitWebSocketUrl || fallbackWebSocketUrl || DEFAULT_TUANCHAT_API_BASE_URL)
    .trim()
    .replace(/\/$/, "");
  const webSocketBaseUrl = (explicitWebSocketUrl || fallbackWebSocketUrl)
    ? normalizedBaseUrl
    : `${normalizedBaseUrl.replace(/^http/i, "ws")}/ws`;
  const separator = webSocketBaseUrl.includes("?") ? "&" : "?";

  return `${webSocketBaseUrl}${separator}token=${encodeURIComponent(token)}`;
}

export function maskMobileWebSocketUrl(webSocketUrl: string) {
  return webSocketUrl.replace(/([?&]token=)[^&]+/i, "$1<redacted>");
}
