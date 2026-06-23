import { describe, expect, it } from "vitest";

import {
  FOREGROUND_REFRESH_THROTTLE_MS,
  getForegroundRefreshQueryKeys,
  shouldRunForegroundRefresh,
} from "./mobileForegroundRefresh";

describe("mobileForegroundRefresh", () => {
  it("只在切回 active 且超过节流时间时刷新", () => {
    expect(shouldRunForegroundRefresh({
      isAuthenticated: true,
      lastRefreshAt: 0,
      nextAppState: "background",
      now: FOREGROUND_REFRESH_THROTTLE_MS + 1,
      previousAppState: "active",
    })).toBe(false);

    expect(shouldRunForegroundRefresh({
      isAuthenticated: false,
      lastRefreshAt: 0,
      nextAppState: "active",
      now: FOREGROUND_REFRESH_THROTTLE_MS + 1,
      previousAppState: "background",
    })).toBe(false);

    expect(shouldRunForegroundRefresh({
      isAuthenticated: true,
      lastRefreshAt: 0,
      nextAppState: "active",
      now: FOREGROUND_REFRESH_THROTTLE_MS + 1,
      previousAppState: "background",
    })).toBe(true);

    expect(shouldRunForegroundRefresh({
      isAuthenticated: true,
      lastRefreshAt: FOREGROUND_REFRESH_THROTTLE_MS + 1,
      nextAppState: "active",
      now: FOREGROUND_REFRESH_THROTTLE_MS + 2,
      previousAppState: "background",
    })).toBe(false);
  });

  it("会生成私信、群聊和会话刷新键", () => {
    expect(getForegroundRefreshQueryKeys({ currentUserId: 7, selectedRoomId: 9 })).toEqual([
      ["getUserSessions"],
      ["notifications"],
      ["notificationsUnreadCount"],
      ["dmInbox", 7],
      ["getHistoryMessages", 9, 0],
    ]);
  });
});
