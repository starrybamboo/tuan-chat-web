import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { MOBILE_CHAT_NOTIFICATION_CHANNEL_ID, MOBILE_SYSTEM_NOTIFICATION_CHANNEL_ID } from "./notificationChannels";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted")
    return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function setupNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(MOBILE_CHAT_NOTIFICATION_CHANNEL_ID, {
      name: "消息通知",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#58a6ff",
      enableLights: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync(MOBILE_SYSTEM_NOTIFICATION_CHANNEL_ID, {
      name: "系统通知",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function scheduleLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
}) {
  const channelId = params.channelId === "messages" || !params.channelId
    ? MOBILE_CHAT_NOTIFICATION_CHANNEL_ID
    : params.channelId;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: params.data,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: Platform.OS === "android"
      ? { channelId }
      : null,
  });
}

export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}
