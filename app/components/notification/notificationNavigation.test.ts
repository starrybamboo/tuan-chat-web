import { describe, expect, it } from "vitest";

import {
  normalizeNotificationTargetPath,
  NOTIFICATION_TARGET_FALLBACK_PATH,
  resolveNotificationTargetPath,
} from "@/components/notification/notificationNavigation";

describe("notificationNavigation", () => {
  it("接受站内绝对路径并去掉首尾空白", () => {
    expect(normalizeNotificationTargetPath(" /feedback/123 ")).toBe("/feedback/123");
  });

  it("拒绝空路径、相对路径和协议相对外链", () => {
    expect(normalizeNotificationTargetPath("")).toBeNull();
    expect(normalizeNotificationTargetPath("feedback/123")).toBeNull();
    expect(normalizeNotificationTargetPath("//evil.example/path")).toBeNull();
    expect(normalizeNotificationTargetPath(null)).toBeNull();
  });

  it("无效通知路径回退到通知中心", () => {
    expect(resolveNotificationTargetPath("https://example.com")).toBe(NOTIFICATION_TARGET_FALLBACK_PATH);
  });
});
