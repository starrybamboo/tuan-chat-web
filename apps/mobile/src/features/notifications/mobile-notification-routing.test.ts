import { describe, expect, it } from "vitest";

import { resolveMobileNotificationRoute } from "./mobile-notification-routing";

describe("mobile-notification-routing", () => {
  it("会把私聊通知路由到聊天页并携带联系人参数", () => {
    expect(resolveMobileNotificationRoute({ targetPath: "/chat/private/42" })).toBe("/(tabs)?contactId=42");
    expect(resolveMobileNotificationRoute({ targetPath: "tuanchat://chat/private/42" })).toBe("/(tabs)?contactId=42");
  });

  it("会把房间通知路由到聊天页并携带空间与房间参数", () => {
    expect(resolveMobileNotificationRoute({ targetPath: "/chat/12/34" })).toBe("/(tabs)?spaceId=12&roomId=34");
  });

  it("会把仅含房间 ID 的旧群聊深链直接交给聊天页", () => {
    expect(resolveMobileNotificationRoute({ targetPath: "/chat/room/10657" })).toBe("/(tabs)?roomId=10657");
    expect(resolveMobileNotificationRoute({ targetPath: "tuanchat://chat/room/10657" })).toBe("/(tabs)?roomId=10657");
  });

  it("会把角色与个人页映射到对应的 tab", () => {
    expect(resolveMobileNotificationRoute({ targetPath: "/role" })).toBe("/(tabs)/role");
    expect(resolveMobileNotificationRoute({ targetPath: "/profile" })).toBe("/(tabs)/explore");
  });

  it("会把已移除的通知页与未知通知兜底到聊天 tab", () => {
    expect(resolveMobileNotificationRoute({ targetPath: "/notifications" })).toBe("/(tabs)");
    expect(resolveMobileNotificationRoute({ targetPath: "/feedback/12", resourceId: 12 })).toBe("/(tabs)");
  });

  it("会安全处理无法识别或非法的 targetPath", () => {
    expect(resolveMobileNotificationRoute({ targetPath: "/unknown/mobile/path" })).toBe("/(tabs)");
    expect(resolveMobileNotificationRoute({ targetPath: "https://tuan.chat/chat" })).toBeNull();
    expect(resolveMobileNotificationRoute({ targetPath: "//chat/private/42" })).toBeNull();
  });
});
