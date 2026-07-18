import { describe, expect, it } from "vitest";

import {
  MOBILE_AVATAR_DOUBLE_TAP_WINDOW_MS,
  resolveMobileAvatarTap,
} from "./mobileAvatarTap";

describe("mobileAvatarTap", () => {
  it("首次点击等待单击确认，窗口内第二次点击识别为双击", () => {
    const firstTap = resolveMobileAvatarTap(null, 7, 1_000);

    expect(firstTap).toEqual({
      matchedDoubleTap: false,
      next: { roleId: 7, timestamp: 1_000 },
    });
    expect(resolveMobileAvatarTap(firstTap.next, 7, 1_000 + MOBILE_AVATAR_DOUBLE_TAP_WINDOW_MS)).toEqual({
      matchedDoubleTap: true,
      next: null,
    });
  });

  it("不同头像或超出窗口时保留新的单击候选", () => {
    expect(resolveMobileAvatarTap({ roleId: 7, timestamp: 1_000 }, 8, 1_100)).toEqual({
      matchedDoubleTap: false,
      next: { roleId: 8, timestamp: 1_100 },
    });
    expect(resolveMobileAvatarTap({ roleId: 7, timestamp: 1_000 }, 7, 1_000 + MOBILE_AVATAR_DOUBLE_TAP_WINDOW_MS + 1)).toEqual({
      matchedDoubleTap: false,
      next: { roleId: 7, timestamp: 1_000 + MOBILE_AVATAR_DOUBLE_TAP_WINDOW_MS + 1 },
    });
  });
});
