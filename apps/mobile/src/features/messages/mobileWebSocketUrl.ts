import { DEFAULT_TUANCHAT_API_BASE_URL } from "../../lib/api";

export function createMobileWebSocketUrl(token: string) {
  const explicitWebSocketUrl = process.env.EXPO_PUBLIC_TUANCHAT_API_WS_URL?.trim();
  const fallbackWebSocketUrl = DEFAULT_TUANCHAT_API_BASE_URL === "https://tuan.chat/api"
    ? "wss://tuan.chat/ws"
    : null;
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
