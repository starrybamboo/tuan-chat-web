import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";
import { useWorkspaceSession } from "@/features/workspace/workspace-session";

import { logNotificationTrace } from "../notifications/notificationTrace";
import {
  FOREGROUND_REFRESH_THROTTLE_MS,
  getForegroundRefreshQueryKeys,
  shouldRunForegroundRefresh,
} from "./mobileForegroundRefresh";

export function MobileForegroundRefreshBridge() {
  const queryClient = useQueryClient();
  const { isAuthenticated, session } = useAuthSession();
  const { selectedRoomId } = useWorkspaceSession();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousAppState = appStateRef.current;
      const now = Date.now();
      appStateRef.current = nextAppState;

      if (!shouldRunForegroundRefresh({
        isAuthenticated,
        lastRefreshAt: lastRefreshAtRef.current,
        nextAppState,
        now,
        previousAppState,
      })) {
        logNotificationTrace("foreground-refresh.skip", {
          currentUserId: session?.userId ?? null,
          nextAppState,
          previousAppState,
          selectedRoomId: selectedRoomId ?? null,
          throttleMs: FOREGROUND_REFRESH_THROTTLE_MS,
        });
        return;
      }

      lastRefreshAtRef.current = now;
      const queryKeys = getForegroundRefreshQueryKeys({
        currentUserId: session?.userId ?? null,
        selectedRoomId,
      });

      logNotificationTrace("foreground-refresh.start", {
        currentUserId: session?.userId ?? null,
        nextAppState,
        previousAppState,
        queryKeys: queryKeys.map((queryKey) => JSON.stringify(queryKey)),
        selectedRoomId: selectedRoomId ?? null,
      });

      for (const queryKey of queryKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, queryClient, selectedRoomId, session?.userId]);

  return null;
}
