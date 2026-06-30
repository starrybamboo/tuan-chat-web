import { useCallback, useEffect, useState } from "react";

import type { NotificationPreferences } from "./notificationPreferences";

import {
  getDefaultPreferences,
  readNotificationPreferences,
  writeNotificationPreferences,
} from "./notificationPreferences";

export function useNotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getDefaultPreferences());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void readNotificationPreferences().then((stored) => {
      setPrefs(stored);
      setIsLoading(false);
    });
  }, []);

  const update = useCallback(async (patch: Partial<NotificationPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await writeNotificationPreferences(next);
  }, [prefs]);

  return { isLoading, prefs, update };
}
