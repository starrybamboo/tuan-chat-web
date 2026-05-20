import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEY = "tuanchat.mobile.notification.preferences";

export type NotificationPreferences = {
  enabled: boolean;
  messages: boolean;
  system: boolean;
  friendRequests: boolean;
  sound: boolean;
  vibration: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  messages: true,
  system: true,
  friendRequests: true,
  sound: true,
  vibration: true,
};

function isWebStorageAvailable() {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export async function readNotificationPreferences(): Promise<NotificationPreferences> {
  let raw: string | null = null;
  if (isWebStorageAvailable()) {
    raw = window.localStorage.getItem(STORAGE_KEY);
  }
  else {
    raw = await SecureStore.getItemAsync(STORAGE_KEY);
  }

  if (!raw)
    return { ...DEFAULT_PREFERENCES };

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      enabled: parsed.enabled ?? DEFAULT_PREFERENCES.enabled,
      messages: parsed.messages ?? DEFAULT_PREFERENCES.messages,
      system: parsed.system ?? DEFAULT_PREFERENCES.system,
      friendRequests: parsed.friendRequests ?? DEFAULT_PREFERENCES.friendRequests,
      sound: parsed.sound ?? DEFAULT_PREFERENCES.sound,
      vibration: parsed.vibration ?? DEFAULT_PREFERENCES.vibration,
    };
  }
  catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function writeNotificationPreferences(prefs: NotificationPreferences) {
  const value = JSON.stringify(prefs);
  if (isWebStorageAvailable()) {
    window.localStorage.setItem(STORAGE_KEY, value);
  }
  else {
    await SecureStore.setItemAsync(STORAGE_KEY, value);
  }
}

export function getDefaultPreferences(): NotificationPreferences {
  return { ...DEFAULT_PREFERENCES };
}
