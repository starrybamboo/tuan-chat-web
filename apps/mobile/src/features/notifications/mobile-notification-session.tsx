import type { PropsWithChildren } from "react";

import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";

import type { ForegroundBanner } from "./ForegroundNotificationBanner";
import type { NativeAppNotificationPayload } from "./mobileNotificationTypes";

import { ForegroundNotificationBanner } from "./ForegroundNotificationBanner";
import { MobileNotificationSessionContext } from "./mobileNotificationSessionContext";
import { normalizeNotificationTargetPath } from "./mobileNotificationTypes";
import {
  MOBILE_CHAT_NOTIFICATION_CHANNEL_ID,
  MOBILE_NOTIFICATION_MAX_BADGE_COUNT,
} from "./notificationChannels";
import { logNotificationTrace, logNotificationTraceError } from "./notificationTrace";

const DEDUPE_WINDOW_MS = 15_000;

type NotificationPermissionResponse = Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
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
    logNotificationTrace("permission.read.skip-web");
    return "unavailable";
  }

  try {
    const currentPermission = await Notifications.getPermissionsAsync();
    const status = resolveNotificationPermissionStatus(currentPermission);
    logNotificationTrace("permission.read", {
      granted: currentPermission.granted,
      status,
    });
    return status;
  }
  catch (error) {
    logNotificationTraceError("permission.read.error", error);
    return "unavailable";
  }
}

async function ensureNotificationPermissionAsync(): Promise<MobileNotificationPermissionStatus> {
  if (Platform.OS === "web") {
    logNotificationTrace("permission.ensure.skip-web");
    return "unavailable";
  }

  const currentStatus = await readNotificationPermissionStatusAsync();
  if (currentStatus === "granted") {
    logNotificationTrace("permission.ensure.already-granted");
    return currentStatus;
  }

  try {
    logNotificationTrace("permission.request.start", {
      currentStatus,
    });
    const requestedPermission = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    const status = resolveNotificationPermissionStatus(requestedPermission);
    logNotificationTrace("permission.request.done", {
      granted: requestedPermission.granted,
      status,
    });
    return status;
  }
  catch (error) {
    logNotificationTraceError("permission.request.error", error);
    return "unavailable";
  }
}

function resolveTargetPathFromResponse(response: Notifications.NotificationResponse | null) {
  const targetPath = response?.notification.request.content.data?.targetPath;
  return normalizeNotificationTargetPath(typeof targetPath === "string" ? targetPath : null);
}

async function incrementBadgeCountAsync() {
  try {
    const currentCount = await Notifications.getBadgeCountAsync();
    const nextCount = Math.min(currentCount + 1, MOBILE_NOTIFICATION_MAX_BADGE_COUNT);
    await Notifications.setBadgeCountAsync(nextCount);
    logNotificationTrace("badge.increment", {
      currentCount,
      nextCount,
    });
    return nextCount;
  }
  catch (error) {
    logNotificationTraceError("badge.increment.error", error);
    return undefined;
  }
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
  const [foregroundBanner, setForegroundBanner] = useState<ForegroundBanner | null>(null);
  const bannerSeqRef = useRef(0);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    void (async () => {
      if (Platform.OS === "android") {
        try {
          logNotificationTrace("channel.setup.start", {
            channelId: MOBILE_CHAT_NOTIFICATION_CHANNEL_ID,
          });
          await Notifications.setNotificationChannelAsync(MOBILE_CHAT_NOTIFICATION_CHANNEL_ID, {
            name: "团剧通知",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 200, 250],
            enableVibrate: true,
            enableLights: true,
            lightColor: "#208AEF",
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
          logNotificationTrace("channel.setup.done", {
            channelId: MOBILE_CHAT_NOTIFICATION_CHANNEL_ID,
          });
        }
        catch (error) {
          logNotificationTraceError("channel.setup.error", error, {
            channelId: MOBILE_CHAT_NOTIFICATION_CHANNEL_ID,
          });
        }
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
        logNotificationTrace("response.skip", {
          duplicate: handledResponseIdentifierRef.current === responseIdentifier,
          hasResponseIdentifier: Boolean(responseIdentifier),
        });
        return;
      }

      handledResponseIdentifierRef.current = responseIdentifier;
      const targetPath = resolveTargetPathFromResponse(response);
      if (!targetPath) {
        logNotificationTrace("response.skip-no-target", {
          responseIdentifier,
        });
        return;
      }

      logNotificationTrace("response.target", {
        responseIdentifier,
        targetPath,
      });
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
      logNotificationTrace("present.skip-web", {
        resourceId: payload.resourceId ?? null,
        resourceType: payload.resourceType ?? null,
      });
      return;
    }

    const title = payload.title?.trim() ?? "";
    const body = payload.body?.trim() ?? "";
    if (!title || !body) {
      logNotificationTrace("present.skip-empty", {
        hasBody: Boolean(body),
        hasTitle: Boolean(title),
        resourceId: payload.resourceId ?? null,
        resourceType: payload.resourceType ?? null,
      });
      return;
    }

    const targetPath = normalizeNotificationTargetPath(payload.targetPath);
    const tag = payload.tag?.trim() || `${title}:${body}:${targetPath ?? ""}`;
    const now = Date.now();

    logNotificationTrace("present.start", {
      bodyLength: body.length,
      resourceId: payload.resourceId ?? null,
      resourceType: payload.resourceType ?? null,
      tag,
      targetPath,
      title,
    });

    for (const [recentTag, timestamp] of recentNotificationTagsRef.current.entries()) {
      if (now - timestamp > DEDUPE_WINDOW_MS) {
        recentNotificationTagsRef.current.delete(recentTag);
      }
    }

    const lastTimestamp = recentNotificationTagsRef.current.get(tag);
    if (typeof lastTimestamp === "number" && now - lastTimestamp < DEDUPE_WINDOW_MS) {
      logNotificationTrace("present.skip-dedupe", {
        ageMs: now - lastTimestamp,
        tag,
      });
      return;
    }

    recentNotificationTagsRef.current.set(tag, now);

    // 前台：安卓系统不会把通知弹成 heads-up 悬浮窗，由 App 自绘悬浮提醒条补齐。
    // 应用内悬浮条不依赖系统通知权限，且跳过系统通知，避免前台"悬浮条 + 通知栏"双重提醒。
    if (AppState.currentState === "active") {
      bannerSeqRef.current += 1;
      logNotificationTrace("present.foreground-banner", {
        seq: bannerSeqRef.current,
        tag,
        targetPath,
      });
      setForegroundBanner({
        id: `${tag}:${bannerSeqRef.current}`,
        title,
        body,
        targetPath: targetPath ?? "/chat",
      });
      return;
    }

    const permissionStatus = permissionGrantedRef.current ? "granted" : await ensureNotificationPermissionAsync();
    permissionGrantedRef.current = permissionStatus === "granted";
    setNotificationPermissionStatus(permissionStatus);
    if (permissionStatus !== "granted") {
      logNotificationTrace("present.skip-permission", {
        permissionStatus,
        tag,
      });
      return;
    }

    const badge = await incrementBadgeCountAsync();

    try {
      const notificationIdentifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          badge,
          priority: Notifications.AndroidNotificationPriority.MAX,
          sound: true,
          vibrate: [0, 250, 200, 250],
          data: {
            tag,
            resourceId: payload.resourceId ?? null,
            resourceType: payload.resourceType ?? null,
            targetPath: targetPath ?? "/chat",
          },
        },
        trigger: Platform.OS === "android"
          ? { channelId: MOBILE_CHAT_NOTIFICATION_CHANNEL_ID }
          : null,
      });

      logNotificationTrace("present.scheduled", {
        badge,
        channelId: Platform.OS === "android" ? MOBILE_CHAT_NOTIFICATION_CHANNEL_ID : null,
        notificationIdentifier,
        tag,
      });
    }
    catch (error) {
      logNotificationTraceError("present.schedule.error", error, {
        tag,
      });
      throw error;
    }
  }, []);

  const refreshNotificationPermissionStatus = useCallback(async () => {
    const status = await readNotificationPermissionStatusAsync();
    permissionGrantedRef.current = status === "granted";
    setNotificationPermissionStatus(status);
    return status;
  }, []);

  const acknowledgeTargetPath = useCallback((targetPath: string | null) => {
    const normalized = normalizeNotificationTargetPath(targetPath);
    logNotificationTrace("target.acknowledge", {
      normalized,
      targetPath,
    });
    setPendingTargetPath((currentValue) => {
      if (currentValue !== normalized) {
        return currentValue;
      }
      return null;
    });
  }, []);

  const dismissForegroundBanner = useCallback(() => {
    setForegroundBanner(null);
  }, []);

  const handleForegroundBannerPress = useCallback((banner: ForegroundBanner) => {
    setForegroundBanner(null);
    const targetPath = normalizeNotificationTargetPath(banner.targetPath);
    if (!targetPath) {
      return;
    }
    logNotificationTrace("foreground-banner.press", { targetPath });
    setPendingTargetPath(targetPath);
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
      <ForegroundNotificationBanner
        banner={foregroundBanner}
        onDismiss={dismissForegroundBanner}
        onPress={handleForegroundBannerPress}
      />
    </MobileNotificationSessionContext>
  );
}
