import type { AlertButton } from "react-native";

import { Alert, Platform } from "react-native";

type ConfirmOptions = {
  cancelText?: string;
  confirmText?: string;
  destructive?: boolean;
  message: string;
  title: string;
};

/**
 * Show a confirmation dialog that works on both native and mobile web.
 * `react-native-web` exposes `Alert.alert` as a no-op, so web must use `window.confirm`.
 */
export async function confirmAction({
  cancelText = "取消",
  confirmText = "确定",
  destructive = false,
  message,
  title,
}: ConfirmOptions) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || typeof window.confirm !== "function") {
      throw new TypeError("当前环境不支持确认弹窗。");
    }
    return window.confirm(`${title}\n\n${message}`);
  }

  return new Promise<boolean>((resolve) => {
    const buttons: AlertButton[] = [
      {
        text: cancelText,
        style: "cancel",
        onPress: () => resolve(false),
      },
      {
        text: confirmText,
        style: destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ];

    Alert.alert(title, message, buttons, {
      cancelable: true,
      onDismiss: () => resolve(false),
    });
  });
}
