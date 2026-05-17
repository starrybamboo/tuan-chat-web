import { describe, expect, it } from "vitest";

import { resolveMobileNotificationRoute } from "./mobile-notification-routing";

describe("mobile-notification-routing", () => {
  it("会把私聊通知路由到聊天页并携带联系人参数", () => {
    expect(resolveMobileNotificationRoute({ targetPath: "/chat/private/42" })).toBe("/(tabs)?contactId=42");
  });

  it("会把房间通知路由到聊天页并携带空间与房间参数", () => {
    expect(resolveMobileNotificationRoute({ targetPath: "/chat/12/34" })).toBe("/(tabs)?spaceId=12&roomId=34");
  });

  it("会把角色与通知页映射到对应的 tab", () => {
    expect(resolveMobileNotificationRoute({ targetPath: "/role" })).toBe("/(tabs)/role");
    expect(resolveMobileNotificationRoute({ targetPath: "/notifications" })).toBe("/(tabs)/explore");
  });

  it("会把未知通知兜底到个人 tab", () => {
    expect(resolveMobileNotificationRoute({ targetPath: "/feedback/12", resourceId: 12 })).toBe("/(tabs)/explore");
  });
});
