import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
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
    await Notifications.setNotificationChannelAsync("messages", {
      name: "消息通知",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#58a6ff",
    });

    await Notifications.setNotificationChannelAsync("system", {
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
  await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: params.data,
      ...(Platform.OS === "android" ? { channelId: params.channelId ?? "messages" } : {}),
    },
    trigger: null,
  });
}

export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}
