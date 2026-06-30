import { Platform } from "react-native";

import { readMobileKeyValue, writeMobileKeyValue } from "../../lib/mobile-key-value-storage";

const BACKGROUND_PUSH_REMINDER_STORAGE_KEY = "tuanchat.mobile.background-push-reminder.v1";

function isWebStorageAvailable() {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export async function hasDisabledBackgroundPushReminder() {
  if (isWebStorageAvailable()) {
    return window.localStorage.getItem(BACKGROUND_PUSH_REMINDER_STORAGE_KEY) === "1";
  }

  const entry = await readMobileKeyValue<boolean>(BACKGROUND_PUSH_REMINDER_STORAGE_KEY);
  return entry?.value === true;
}

export async function markBackgroundPushReminderDisabled() {
  if (isWebStorageAvailable()) {
    window.localStorage.setItem(BACKGROUND_PUSH_REMINDER_STORAGE_KEY, "1");
    return;
  }

  await writeMobileKeyValue(BACKGROUND_PUSH_REMINDER_STORAGE_KEY, true);
}
