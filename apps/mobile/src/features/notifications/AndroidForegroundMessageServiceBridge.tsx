import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";
import { createMobileWebSocketUrl, maskMobileWebSocketUrl } from "@/features/messages/mobileWebSocketUrl";

import {
  setAndroidForegroundMessageServiceAppActive,
  startAndroidForegroundMessageService,
  stopAndroidForegroundMessageService,
  syncAndroidForegroundMessageServiceRoomRoleNames,
} from "./androidForegroundMessageService";
import { logNotificationTrace } from "./notificationTrace";

type CachedRoomRolesData = {
  allRoles?: readonly UserRole[];
} | readonly UserRole[];

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function readRoomRoles(data: CachedRoomRolesData | undefined): readonly UserRole[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data && "allRoles" in data ? data.allRoles ?? [] : [];
}

export function AndroidForegroundMessageServiceBridge() {
  const queryClient = useQueryClient();
  const { isAuthenticated, isBootstrapping, session } = useAuthSession();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const syncedRoleSignaturesRef = useRef(new Map<number, string>());
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

  useEffect(() => {
    if (Platform.OS !== "android" || !isAuthenticated) {
      return;
    }

    const syncCachedRoomRoleNames = () => {
      for (const [queryKey, data] of queryClient.getQueriesData<CachedRoomRolesData>({ queryKey: ["roomRoles"] })) {
        const roomId = Array.isArray(queryKey) ? queryKey[1] : null;
        if (!isPositiveId(roomId) || data === undefined) {
          continue;
        }

        const roles = readRoomRoles(data);
        const signature = JSON.stringify(roles.map(role => [role.roleId, role.roleName ?? null]));
        if (syncedRoleSignaturesRef.current.get(roomId) === signature) {
          continue;
        }
        syncedRoleSignaturesRef.current.set(roomId, signature);
        void syncAndroidForegroundMessageServiceRoomRoleNames(roomId, roles);
      }
    };

    syncCachedRoomRoleNames();
    return queryClient.getQueryCache().subscribe(syncCachedRoomRoleNames);
  }, [isAuthenticated, queryClient]);

  return null;
}
