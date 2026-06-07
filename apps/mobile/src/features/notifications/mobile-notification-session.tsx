import type { PropsWithChildren } from "react";

import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";

import type { NativeAppNotificationPayload } from "./mobileNotificationTypes";

import { MobileNotificationSessionContext } from "./mobileNotificationSessionContext";
import { normalizeNotificationTargetPath } from "./mobileNotificationTypes";

const MOBILE_NOTIFICATION_CHANNEL_ID = "tuanchat-mobile-chat";
const DEDUPE_WINDOW_MS = 15_000;

type NotificationPermissionResponse = Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type MobileNotificationPermissionStatus = "checking" | "denied" | "granted" | "unavailable" | "unknown";

export type MobileNotificationSessionContextValue = {
  acknowledgeTargetPath: (targetPath: string | null) => void;
  notificationPermissionStatus: MobileNotificationPermissionStatus;
  pendingTargetPath: string | null;
  presentNotification: (payload: NativeAppNotificationPayload) => Promise<void>;
  refreshNotificationPermissionStatus: () => Promise<MobileNotificationPermissionStatus>;
};

function resolveNotificationPermissionStatus(permission: NotificationPermissionResponse): MobileNotificationPermissionStatus {
  if (
    permission.granted
    || permission.status === Notifications.PermissionStatus.GRANTED
    || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return "granted";
  }

  if (permission.status === Notifications.PermissionStatus.DENIED) {
    return "denied";
  }

  return "unknown";
}

async function readNotificationPermissionStatusAsync(): Promise<MobileNotificationPermissionStatus> {
  if (Platform.OS === "web") {
    return "unavailable";
  }

  try {
    const currentPermission = await Notifications.getPermissionsAsync();
    return resolveNotificationPermissionStatus(currentPermission);
  }
  catch {
    return "unavailable";
  }
}

async function ensureNotificationPermissionAsync(): Promise<MobileNotificationPermissionStatus> {
  if (Platform.OS === "web") {
    return "unavailable";
  }

  const currentStatus = await readNotificationPermissionStatusAsync();
  if (currentStatus === "granted") {
    return currentStatus;
  }

  try {
    const requestedPermission = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return resolveNotificationPermissionStatus(requestedPermission);
  }
  catch {
    return "unavailable";
  }
}

function resolveTargetPathFromResponse(response: Notifications.NotificationResponse | null) {
  const targetPath = response?.notification.request.content.data?.targetPath;
  return normalizeNotificationTargetPath(typeof targetPath === "string" ? targetPath : null);
}

export function MobileNotificationSessionProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuthSession();
  const [pendingTargetPath, setPendingTargetPath] = useState<string | null>(null);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<MobileNotificationPermissionStatus>(
    () => Platform.OS === "web" ? "unavailable" : "checking",
  );
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

    void ensureNotificationPermissionAsync().then((status) => {
      permissionGrantedRef.current = status === "granted";
      setNotificationPermissionStatus(status);
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

    const permissionStatus = permissionGrantedRef.current ? "granted" : await ensureNotificationPermissionAsync();
    permissionGrantedRef.current = permissionStatus === "granted";
    setNotificationPermissionStatus(permissionStatus);
    if (permissionStatus !== "granted") {
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
          resourceId: payload.resourceId ?? null,
          resourceType: payload.resourceType ?? null,
          targetPath: targetPath ?? "/chat",
        },
      },
      trigger: null,
    });
  }, []);

  const refreshNotificationPermissionStatus = useCallback(async () => {
    const status = await readNotificationPermissionStatusAsync();
    permissionGrantedRef.current = status === "granted";
    setNotificationPermissionStatus(status);
    return status;
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
    notificationPermissionStatus,
    pendingTargetPath,
    presentNotification,
    refreshNotificationPermissionStatus,
  }), [acknowledgeTargetPath, notificationPermissionStatus, pendingTargetPath, presentNotification, refreshNotificationPermissionStatus]);

  return (
    <MobileNotificationSessionContext value={value}>
      {children}
    </MobileNotificationSessionContext>
  );
}
