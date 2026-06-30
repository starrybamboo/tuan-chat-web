import { NativeModules, Platform } from "react-native";

import type { AndroidBackgroundPushDiagnostics } from "./androidBackgroundPushGuidance";

import { logNotificationTrace, logNotificationTraceError } from "./notificationTrace";

export type AndroidBackgroundPushSettingTarget =
  | "appDetails"
  | "batteryOptimization"
  | "manufacturerBackground"
  | "notificationSettings";

export type AndroidForegroundMessageServiceStatus = {
  appActive?: boolean;
  connected?: boolean;
  jsAppActive?: boolean;
  lastBusinessFrameType?: number;
  lastEvent?: string;
  lastFrameType?: number;
  lastMessageAt?: number;
  lastShownNotificationAt?: number;
  lastSkipReason?: string | null;
  messageChannelImportance?: number;
  notificationsEnabled?: boolean;
  receivedFrameCount?: number;
  running?: boolean;
  shownNotificationCount?: number;
};

type NativeForegroundMessageServiceModule = {
  getBackgroundPushDiagnostics?: () => Promise<AndroidBackgroundPushDiagnostics>;
  getStatus: () => Promise<AndroidForegroundMessageServiceStatus>;
  openBackgroundPushSetting?: (target: AndroidBackgroundPushSettingTarget) => Promise<boolean>;
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

export function isAndroidBackgroundPushDiagnosticsSupported() {
  return Platform.OS === "android" && Boolean(nativeModule?.getBackgroundPushDiagnostics);
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

export async function getAndroidBackgroundPushDiagnostics() {
  if (!nativeModule?.getBackgroundPushDiagnostics) {
    return null;
  }

  try {
    return await nativeModule.getBackgroundPushDiagnostics();
  }
  catch (error) {
    logNotificationTraceError("fg-service.background-diagnostics.error", error);
    return null;
  }
}

export async function openAndroidBackgroundPushSetting(target: AndroidBackgroundPushSettingTarget) {
  if (!nativeModule?.openBackgroundPushSetting) {
    logNotificationTrace("fg-service.background-setting.skip-unavailable", { target });
    return false;
  }

  try {
    const result = await nativeModule.openBackgroundPushSetting(target);
    logNotificationTrace("fg-service.background-setting.done", { result, target });
    return result;
  }
  catch (error) {
    logNotificationTraceError("fg-service.background-setting.error", error, { target });
    return false;
  }
}
