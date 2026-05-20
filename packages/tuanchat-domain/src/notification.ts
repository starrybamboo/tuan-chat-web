export type NotificationSettings = {
  feedbackDesktopEnabled: boolean;
  feedbackInAppEnabled: boolean;
  groupMessagePopupEnabled: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  feedbackDesktopEnabled: true,
  feedbackInAppEnabled: true,
  groupMessagePopupEnabled: true,
};

const USER_EXTRA_NOTIFICATION_SETTINGS_KEY = "notificationSettings";

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function readNotificationSettingsFromUserExtra(extra: unknown): NotificationSettings {
  const root = toRecord(extra);
  const settings = toRecord(root?.[USER_EXTRA_NOTIFICATION_SETTINGS_KEY]);
  return {
    feedbackDesktopEnabled: readBoolean(settings?.feedbackDesktopEnabled, DEFAULT_NOTIFICATION_SETTINGS.feedbackDesktopEnabled),
    feedbackInAppEnabled: readBoolean(settings?.feedbackInAppEnabled, DEFAULT_NOTIFICATION_SETTINGS.feedbackInAppEnabled),
    groupMessagePopupEnabled: readBoolean(settings?.groupMessagePopupEnabled, DEFAULT_NOTIFICATION_SETTINGS.groupMessagePopupEnabled),
  };
}

export function buildUserExtraWithNotificationSettings(
  extra: unknown,
  settings: NotificationSettings,
): Record<string, unknown> {
  return {
    ...toRecord(extra),
    [USER_EXTRA_NOTIFICATION_SETTINGS_KEY]: settings,
  };
}
