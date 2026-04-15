import { Platform } from "react-native";
import { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { getStoredAuthToken } from "@/features/auth/auth-storage";

function resolveDefaultApiBaseUrl() {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_TUANCHAT_API_BASE_URL;
  if (explicitBaseUrl && explicitBaseUrl.trim().length > 0) {
    return explicitBaseUrl.trim();
  }

  if (Platform.OS === "android") {
    // Android 模拟器访问宿主机 localhost 需要走 10.0.2.2。
    return "http://10.0.2.2:8081";
  }

  return "http://127.0.0.1:8081";
}

export const DEFAULT_TUANCHAT_API_BASE_URL = resolveDefaultApiBaseUrl();

export function createMobileApiClient(baseUrl: string = DEFAULT_TUANCHAT_API_BASE_URL) {
  return new TuanChat({
    BASE: baseUrl.replace(/\/$/, ""),
    WITH_CREDENTIALS: true,
    CREDENTIALS: "include",
    TOKEN: async () => (await getStoredAuthToken()) ?? "",
  });
}

export const mobileApiClient = createMobileApiClient();
