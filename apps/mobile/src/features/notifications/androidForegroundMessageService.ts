import { NativeModules, Platform } from "react-native";

import { logNotificationTrace, logNotificationTraceError } from "./notificationTrace";

type NativeForegroundMessageServiceStatus = {
  connected?: boolean;
  lastEvent?: string;
  lastMessageAt?: number;
  running?: boolean;
};

type NativeForegroundMessageServiceModule = {
  getStatus: () => Promise<NativeForegroundMessageServiceStatus>;
  setAppActive: (active: boolean) => Promise<boolean>;
  start: (config: {
    appActive: boolean;
    token: string;
    userId?: number | null;
    username?: string | null;
    wsUrl: string;
  }) => Promise<boolean>;
  stop: () => Promise<boolean>;
};

const nativeModule = Platform.OS === "android"
  ? NativeModules.TuanChatForegroundMessageService as NativeForegroundMessageServiceModule | undefined
  : undefined;

export function isAndroidForegroundMessageServiceSupported() {
  return Platform.OS === "android" && Boolean(nativeModule);
}

export async function startAndroidForegroundMessageService(config: {
  appActive: boolean;
  token: string;
  userId?: number | null;
  username?: string | null;
  wsUrl: string;
}) {
  if (!nativeModule) {
    logNotificationTrace("fg-service.start.skip-unavailable");
    return false;
  }

  try {
    const result = await nativeModule.start(config);
    logNotificationTrace("fg-service.start.done", {
      appActive: config.appActive,
      result,
      userId: config.userId ?? null,
    });
    return result;
  }
  catch (error) {
    logNotificationTraceError("fg-service.start.error", error, {
      userId: config.userId ?? null,
    });
    return false;
  }
}

export async function stopAndroidForegroundMessageService(reason: string) {
  if (!nativeModule) {
    logNotificationTrace("fg-service.stop.skip-unavailable", { reason });
    return false;
  }

  try {
    const result = await nativeModule.stop();
    logNotificationTrace("fg-service.stop.done", { reason, result });
    return result;
  }
  catch (error) {
    logNotificationTraceError("fg-service.stop.error", error, { reason });
    return false;
  }
}

export async function setAndroidForegroundMessageServiceAppActive(active: boolean) {
  if (!nativeModule) {
    return false;
  }

  try {
    const result = await nativeModule.setAppActive(active);
    logNotificationTrace("fg-service.app-active.done", { active, result });
    return result;
  }
  catch (error) {
    logNotificationTraceError("fg-service.app-active.error", error, { active });
    return false;
  }
}

export async function getAndroidForegroundMessageServiceStatus() {
  if (!nativeModule) {
    return null;
  }

  try {
    return await nativeModule.getStatus();
  }
  catch (error) {
    logNotificationTraceError("fg-service.status.error", error);
    return null;
  }
}
