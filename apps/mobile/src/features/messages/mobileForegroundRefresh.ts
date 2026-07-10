import type { QueryKey } from "@tanstack/react-query";
import type { AppStateStatus } from "react-native";

import { getDirectInboxQueryKey } from "@tuanchat/query/direct-message";
import { getUserMessageSessionsQueryKey } from "@tuanchat/query/message-sessions";
import { getNotificationsUnreadCountQueryKey } from "@tuanchat/query/notifications";

import { getRoomMessagesQueryKey } from "./roomMessagesQueryKey";

export const FOREGROUND_REFRESH_THROTTLE_MS = 5_000;

export type ForegroundRefreshContext = {
  currentUserId?: number | null;
  selectedRoomId?: number | null;
};

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function shouldRunForegroundRefresh(params: {
  isAuthenticated: boolean;
  lastRefreshAt: number;
  nextAppState: AppStateStatus;
  now: number;
  previousAppState: AppStateStatus;
}) {
  if (!params.isAuthenticated || params.nextAppState !== "active" || params.previousAppState === "active") {
    return false;
  }
  return params.now - params.lastRefreshAt >= FOREGROUND_REFRESH_THROTTLE_MS;
}

export function getForegroundRefreshQueryKeys(context: ForegroundRefreshContext): QueryKey[] {
  const queryKeys: QueryKey[] = [
    getUserMessageSessionsQueryKey(),
    ["notifications"],
    getNotificationsUnreadCountQueryKey(),
  ];

  if (isPositiveId(context.currentUserId)) {
    queryKeys.push(getDirectInboxQueryKey(context.currentUserId));
  }
  if (isPositiveId(context.selectedRoomId)) {
    queryKeys.push(getRoomMessagesQueryKey(context.selectedRoomId));
  }

  return queryKeys;
}
