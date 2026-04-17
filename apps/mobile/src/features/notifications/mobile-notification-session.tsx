import type { PropsWithChildren } from "react";
import type { NativeAppNotificationPayload } from "./mobileNotificationTypes";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Platform } from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";
import { MobileNotificationSessionContext } from "./mobileNotificationSessionContext";
import { normalizeNotificationTargetPath } from "./mobileNotificationTypes";

const MOBILE_NOTIFICATION_CHANNEL_ID = "tuanchat-mobile-chat";
const DEDUPE_WINDOW_MS = 15_000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface MobileNotificationSessionContextValue {
  acknowledgeTargetPath: (targetPath: string | null) => void;
  pendingTargetPath: string | null;
  presentNotification: (payload: NativeAppNotificationPayload) => Promise<void>;
}

async function ensureNotificationPermissionAsync() {
  if (Platform.OS === "web") {
    return false;
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  if (currentPermission.granted || currentPermission.status === Notifications.PermissionStatus.GRANTED) {
    return true;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return requestedPermission.granted || requestedPermission.status === Notifications.PermissionStatus.GRANTED;
}

function resolveTargetPathFromResponse(response: Notifications.NotificationResponse | null) {
  const targetPath = response?.notification.request.content.data?.targetPath;
  return normalizeNotificationTargetPath(typeof targetPath === "string" ? targetPath : null);
}

export function MobileNotificationSessionProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuthSession();
  const [pendingTargetPath, setPendingTargetPath] = useState<string | null>(null);
  const permissionGrantedRef = useRef(false);
  const recentNotificationTagsRef = useRef<Map<string, number>>(new Map());
  const handledResponseIdentifierRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    void (async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(MOBILE_NOTIFICATION_CHANNEL_ID, {
          name: "团剧通知",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 200, 250],
          enableVibrate: true,
          enableLights: true,
          lightColor: "#208AEF",
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") {
      return;
    }

    void ensureNotificationPermissionAsync().then((granted) => {
      permissionGrantedRef.current = granted;
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      const responseIdentifier = response?.notification.request.identifier ?? null;
      if (!responseIdentifier || handledResponseIdentifierRef.current === responseIdentifier) {
        return;
      }

      handledResponseIdentifierRef.current = responseIdentifier;
      const targetPath = resolveTargetPathFromResponse(response);
      if (!targetPath) {
        return;
      }

      setPendingTargetPath(targetPath);
      router.replace("/");
    };

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleResponse(response);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      handleResponse(response);
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  const presentNotification = useCallback(async (payload: NativeAppNotificationPayload) => {
    if (Platform.OS === "web") {
      return;
    }

    const title = payload.title?.trim() ?? "";
    const body = payload.body?.trim() ?? "";
    if (!title || !body) {
      return;
    }

    const targetPath = normalizeNotificationTargetPath(payload.targetPath);
    const tag = payload.tag?.trim() || `${title}:${body}:${targetPath ?? ""}`;
    const now = Date.now();

    for (const [recentTag, timestamp] of recentNotificationTagsRef.current.entries()) {
      if (now - timestamp > DEDUPE_WINDOW_MS) {
        recentNotificationTagsRef.current.delete(recentTag);
      }
    }

    const lastTimestamp = recentNotificationTagsRef.current.get(tag);
    if (typeof lastTimestamp === "number" && now - lastTimestamp < DEDUPE_WINDOW_MS) {
      return;
    }

    const granted = permissionGrantedRef.current || await ensureNotificationPermissionAsync();
    permissionGrantedRef.current = granted;
    if (!granted) {
      return;
    }

    recentNotificationTagsRef.current.set(tag, now);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: {
          tag,
          targetPath: targetPath ?? "/chat",
        },
      },
      trigger: null,
    });
  }, []);

  const acknowledgeTargetPath = useCallback((targetPath: string | null) => {
    const normalized = normalizeNotificationTargetPath(targetPath);
    setPendingTargetPath((currentValue) => {
      if (currentValue !== normalized) {
        return currentValue;
      }
      return null;
    });
  }, []);

  const value = useMemo<MobileNotificationSessionContextValue>(() => ({
    acknowledgeTargetPath,
    pendingTargetPath,
    presentNotification,
  }), [acknowledgeTargetPath, pendingTargetPath, presentNotification]);

  return (
    <MobileNotificationSessionContext value={value}>
      {children}
    </MobileNotificationSessionContext>
  );
}
