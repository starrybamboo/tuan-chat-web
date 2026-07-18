import { describe, expect, it, vi } from "vitest";

import { createCurrentUserQuerySnapshotOptions } from "./current-user-query-snapshot";

vi.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

vi.mock("../../lib/mobile-query-snapshot-cache", () => ({
  readMobileQuerySnapshot: vi.fn(),
  writeMobileQuerySnapshot: vi.fn(),
}));

describe("current user query snapshot", () => {
  it("为已登录用户创建无过期时间的账号隔离快照", () => {
    const options = createCurrentUserQuerySnapshotOptions({
      isAuthenticated: true,
      userId: 7,
    });

    expect(options).toEqual({
      enabled: true,
      key: "[\"current-user-profile\",1,[\"getMyUserInfo\"]]",
      scope: "current-user-profile",
      ttlMs: null,
      userId: 7,
    });
  });

  it("未登录或缺少用户 ID 时禁止读取资料快照", () => {
    expect(createCurrentUserQuerySnapshotOptions({
      isAuthenticated: false,
      userId: 7,
    }).enabled).toBe(false);
    expect(createCurrentUserQuerySnapshotOptions({
      isAuthenticated: true,
      userId: null,
    }).enabled).toBe(false);
  });
});
