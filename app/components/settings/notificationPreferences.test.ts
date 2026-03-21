import { describe, expect, it } from "vitest";

import {
  buildUserExtraWithNotificationSettings,
  readNotificationSettingsFromUserExtra,
} from "@/components/settings/notificationPreferences";

describe("notificationPreferences", () => {
  it("会从用户 extra 中解析反馈通知设置并补默认值", () => {
    const settings = readNotificationSettingsFromUserExtra({
      notificationSettings: {
        groupMessagePopupEnabled: false,
        feedbackInAppEnabled: true,
      },
    });

    expect(settings).toEqual({
      groupMessagePopupEnabled: false,
      feedbackInAppEnabled: true,
      feedbackDesktopEnabled: true,
    });
  });

  it("会把反馈通知设置写回到用户 extra.notificationSettings", () => {
    const extra = buildUserExtraWithNotificationSettings(
      { profileCard: { pinnedRoleId: 7 } },
      {
        groupMessagePopupEnabled: true,
        feedbackInAppEnabled: false,
        feedbackDesktopEnabled: false,
      },
    );

    expect(extra).toMatchObject({
      profileCard: { pinnedRoleId: 7 },
      notificationSettings: {
        groupMessagePopupEnabled: true,
        feedbackInAppEnabled: false,
        feedbackDesktopEnabled: false,
      },
    });
  });
});
