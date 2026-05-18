import { TuanChat } from "@tuanchat/openapi-client/TuanChat";
import { Platform } from "react-native";

import { getStoredAuthToken } from "@/features/auth/auth-storage";

function resolveDefaultApiBaseUrl() {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_TUANCHAT_API_BASE_URL;
  if (explicitBaseUrl && explicitBaseUrl.trim().length > 0) {
    return explicitBaseUrl.trim();
  }

  if (Platform.OS === "web") {
    return "https://tuan.chat/api";
  }

  // 真机和模拟器都通过脚本配置 adb reverse，把设备 localhost 转到电脑后端。
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
