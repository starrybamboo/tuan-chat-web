import { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { getStoredAuthToken } from "../features/auth/auth-storage";

export const LOCAL_TUANCHAT_API_BASE_URL = "http://10.0.2.2:8081";

function resolveDefaultApiBaseUrl() {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_TUANCHAT_API_BASE_URL;
  if (explicitBaseUrl && explicitBaseUrl.trim().length > 0) {
    return explicitBaseUrl.trim();
  }

  return LOCAL_TUANCHAT_API_BASE_URL;
}

export const DEFAULT_TUANCHAT_API_BASE_URL = resolveDefaultApiBaseUrl();

export function getMobileApiBaseUrl() {
  return mobileApiClient.request.config.BASE;
}

export function createMobileApiClient(baseUrl: string = DEFAULT_TUANCHAT_API_BASE_URL) {
  return new TuanChat({
    BASE: baseUrl.replace(/\/$/, ""),
    WITH_CREDENTIALS: true,
    CREDENTIALS: "include",
    TOKEN: async () => (await getStoredAuthToken()) ?? "",
  });
}

export const mobileApiClient = createMobileApiClient();
