export type NativeAppNotificationPayload = {
  body: string;
  tag?: string;
  targetPath?: string | null;
  title: string;
};

type NativeAppBridgeMessage
  = | {
    payload: NativeAppNotificationPayload;
    type: "notification";
  };

type ReactNativeWebViewBridge = {
  postMessage: (message: string) => void;
};

function getReactNativeWebViewBridge(): ReactNativeWebViewBridge | null {
  if (typeof window === "undefined") {
    return null;
  }

  const bridge = (window as unknown as {
    ReactNativeWebView?: ReactNativeWebViewBridge;
  }).ReactNativeWebView;

  return bridge && typeof bridge.postMessage === "function" ? bridge : null;
}

export function isRunningInsideNativeAppWebView() {
  return getReactNativeWebViewBridge() != null;
}

export function postNativeAppNotification(payload: NativeAppNotificationPayload) {
  const bridge = getReactNativeWebViewBridge();
  if (!bridge) {
    return false;
  }

  const message: NativeAppBridgeMessage = {
    type: "notification",
    payload,
  };

  try {
    bridge.postMessage(JSON.stringify(message));
    return true;
  }
  catch {
    return false;
  }
}
