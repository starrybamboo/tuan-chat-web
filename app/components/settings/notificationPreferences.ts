import { getLocalStorageValue } from "@/components/common/customHooks/useLocalStorage";

export const GROUP_MESSAGE_POPUP_STORAGE_KEY = "tc:notify:groupMessagePopupEnabled";
const USER_EXTRA_NOTIFICATION_SETTINGS_KEY = "notificationSettings";

export type NotificationSettings = {
  groupMessagePopupEnabled: boolean;
};

function parseExtraRecord(extra: unknown): Record<string, unknown> | null {
  if (!extra) {
    return null;
  }
  if (typeof extra === "string") {
    try {
      const parsed = JSON.parse(extra);
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
    }
    catch {
      return null;
    }
  }
  if (typeof extra === "object") {
    return extra as Record<string, unknown>;
  }
  return null;
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

export function getDefaultNotificationSettings(): NotificationSettings {
  return {
    groupMessagePopupEnabled: true,
  };
}

export function readGroupMessagePopupEnabledFromLocalStorage(): boolean {
  const rawValue = getLocalStorageValue<unknown>(GROUP_MESSAGE_POPUP_STORAGE_KEY, null);
  const normalized = normalizeBoolean(rawValue);
  return normalized == null ? getDefaultNotificationSettings().groupMessagePopupEnabled : normalized;
}

export function writeGroupMessagePopupEnabledToLocalStorage(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(GROUP_MESSAGE_POPUP_STORAGE_KEY, JSON.stringify(enabled));
}

export function readNotificationSettingsFromUserExtra(extra: unknown): NotificationSettings {
  const defaults = getDefaultNotificationSettings();
  const extraRecord = parseExtraRecord(extra);
  if (!extraRecord) {
    return defaults;
  }

  const settingsFromExtra = extraRecord[USER_EXTRA_NOTIFICATION_SETTINGS_KEY];
  if (!settingsFromExtra || typeof settingsFromExtra !== "object") {
    return defaults;
  }

  const normalizedGroupPopup = normalizeBoolean(
    (settingsFromExtra as Record<string, unknown>).groupMessagePopupEnabled,
  );

  return {
    groupMessagePopupEnabled: normalizedGroupPopup == null ? defaults.groupMessagePopupEnabled : normalizedGroupPopup,
  };
}

export function buildUserExtraWithNotificationSettings(
  currentExtra: unknown,
  settings: NotificationSettings,
): Record<string, Record<string, any>> {
  const parsedBase = parseExtraRecord(currentExtra);
  const base = parsedBase
    ? { ...(parsedBase as Record<string, Record<string, any>>) }
    : {} as Record<string, Record<string, any>>;

  const currentSettings = (base[USER_EXTRA_NOTIFICATION_SETTINGS_KEY] && typeof base[USER_EXTRA_NOTIFICATION_SETTINGS_KEY] === "object")
    ? base[USER_EXTRA_NOTIFICATION_SETTINGS_KEY] as Record<string, any>
    : {} as Record<string, any>;

  base[USER_EXTRA_NOTIFICATION_SETTINGS_KEY] = {
    ...currentSettings,
    groupMessagePopupEnabled: settings.groupMessagePopupEnabled,
  };

  return base;
}
