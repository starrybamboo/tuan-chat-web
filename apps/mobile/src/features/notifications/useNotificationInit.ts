import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { clearBadge, requestNotificationPermissions, setupNotificationChannel } from "./notificationSetup";

export function useNotificationInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current)
      return;
    initialized.current = true;

    void (async () => {
      await setupNotificationChannel();
      await requestNotificationPermissions();
    })();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void clearBadge();
      }
    });
    return () => subscription.remove();
  }, []);
}
