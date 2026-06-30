import { describe, expect, it } from "vitest";

import { normalizeNotificationTargetPath } from "./mobileNotificationTypes";

describe("mobile-notification-types", () => {
  it("会保留站内相对路径及其查询参数", () => {
    expect(normalizeNotificationTargetPath("/chat/private?tab=pending")).toBe("/chat/private?tab=pending");
    expect(normalizeNotificationTargetPath("/feedback/12#comment-3")).toBe("/feedback/12#comment-3");
  });

  it("会把 App scheme 深链归一化为站内路径", () => {
    expect(normalizeNotificationTargetPath("tuanchat://chat/room/10657")).toBe("/chat/room/10657");
    expect(normalizeNotificationTargetPath("tuanchat://chat/private/42?from=push")).toBe("/chat/private/42?from=push");
  });

  it("会过滤空值、外链样式和双斜杠路径", () => {
    expect(normalizeNotificationTargetPath(undefined)).toBeNull();
    expect(normalizeNotificationTargetPath("   ")).toBeNull();
    expect(normalizeNotificationTargetPath("https://tuan.chat/chat")).toBeNull();
    expect(normalizeNotificationTargetPath("//chat/private")).toBeNull();
    expect(normalizeNotificationTargetPath("chat/private")).toBeNull();
  });
});
