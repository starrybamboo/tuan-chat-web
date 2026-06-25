import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";
import { createMobileWebSocketUrl, maskMobileWebSocketUrl } from "@/features/messages/mobileWebSocketUrl";

import {
  setAndroidForegroundMessageServiceAppActive,
  startAndroidForegroundMessageService,
  stopAndroidForegroundMessageService,
} from "./androidForegroundMessageService";
import { logNotificationTrace } from "./notificationTrace";

export function AndroidForegroundMessageServiceBridge() {
  const { isAuthenticated, isBootstrapping, session } = useAuthSession();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const token = session?.token?.trim() ?? "";
  const userId = session?.userId ?? null;
  const username = session?.username ?? null;

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    void setAndroidForegroundMessageServiceAppActive(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      void setAndroidForegroundMessageServiceAppActive(nextState === "active");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    if (isBootstrapping) {
      logNotificationTrace("fg-service.bridge.skip-bootstrap");
      return;
    }

    if (!isAuthenticated || !token) {
      void stopAndroidForegroundMessageService("unauthenticated");
      return;
    }

    const wsUrl = createMobileWebSocketUrl(token);
    logNotificationTrace("fg-service.bridge.start", {
      appActive: appStateRef.current === "active",
      url: maskMobileWebSocketUrl(wsUrl),
      userId,
    });
    void startAndroidForegroundMessageService({
      appActive: appStateRef.current === "active",
      token,
      userId,
      username,
      wsUrl,
    });
  }, [isAuthenticated, isBootstrapping, token, userId, username]);

  return null;
}
