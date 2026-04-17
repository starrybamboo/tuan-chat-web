import type { ComponentType, Ref } from "react";
import type { StoredAuthSession } from "@/features/auth/auth-storage";

import type { NativeAppNotificationPayload } from "@/features/notifications/mobileNotificationTypes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { normalizeNotificationTargetPath } from "@/features/notifications/mobileNotificationTypes";

type WebBridgeMessage
  = | {
    payload?: {
      href?: string;
    };
    type: "bootstrap";
  }
  | {
    payload?: {
      key?: string;
      value?: string | null;
    };
    type: "storage";
  }
  | {
    payload?: NativeAppNotificationPayload;
    type: "notification";
  };

interface MinimalWebViewInstance {
  goBack: () => void;
  injectJavaScript: (script: string) => void;
}

interface MinimalWebViewMessageEvent {
  nativeEvent: {
    data: string;
  };
}

interface MinimalWebViewNavigationState {
  canGoBack: boolean;
  url?: string;
}

function readExpoPublicEnv(name: string) {
  const maybeProcess = Reflect.get(globalThis as object, "process") as
    | {
      env?: Record<string, string | undefined>;
    }
    | undefined;
  return maybeProcess?.env?.[name];
}

function resolveChatWebBaseUrl() {
  const explicit = readExpoPublicEnv("EXPO_PUBLIC_TUANCHAT_WEB_URL")?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const apiBase = readExpoPublicEnv("EXPO_PUBLIC_TUANCHAT_API_BASE_URL")?.trim();
  if (apiBase) {
    try {
      const url = new URL(apiBase);
      const hostname = url.hostname.toLowerCase();
      const isLoopback = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "10.0.2.2";
      if (!isLoopback) {
        url.pathname = url.pathname.replace(/\/api\/?$/, "/");
        return url.toString().replace(/\/$/, "");
      }
    }
    catch {
      // Ignore invalid env and fall back to production site.
    }
  }

  return "https://tuan.chat";
}

function resolveHostedUrl(baseUrl: string, targetPath?: string | null) {
  const normalized = normalizeNotificationTargetPath(targetPath);
  return normalized ? `${baseUrl}${normalized}` : `${baseUrl}/chat`;
}

function extractHostedPathFromUrl(url?: string) {
  if (typeof url !== "string" || url.trim().length === 0) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return normalizeNotificationTargetPath(`${parsed.pathname}${parsed.search}${parsed.hash}`);
  }
  catch {
    return null;
  }
}

function buildNavigateScript(targetUrl: string) {
  return `
    (function() {
      try {
        if (window.location.href !== ${JSON.stringify(targetUrl)}) {
          window.location.href = ${JSON.stringify(targetUrl)};
        }
      } catch (error) {}
    })();
    true;
  `;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loader: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  loaderCard: {
    alignItems: "center",
    borderRadius: 18,
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
});

function buildBridgeScript(session: StoredAuthSession | null, insets: { top: number; right: number; bottom: number; left: number }) {
  const token = JSON.stringify(session?.token ?? "");
  const uid = JSON.stringify(typeof session?.userId === "number" && session.userId > 0 ? String(session.userId) : "");
  const insetsPayload = JSON.stringify({
    bottom: `${Math.max(0, insets.bottom)}px`,
    left: `${Math.max(0, insets.left)}px`,
    right: `${Math.max(0, insets.right)}px`,
    top: `${Math.max(0, insets.top)}px`,
  });

  return `
    (function() {
      var token = ${token};
      var uid = ${uid};
      var safeArea = ${insetsPayload};
      var post = function(type, payload) {
        try {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
        } catch (error) {}
      };
      var applyStorage = function() {
        try {
          if (token) {
            window.localStorage.setItem("token", token);
          } else {
            window.localStorage.removeItem("token");
          }
          if (uid) {
            window.localStorage.setItem("uid", uid);
          } else {
            window.localStorage.removeItem("uid");
          }
        } catch (error) {}
      };
      var applySafeArea = function() {
        try {
          var root = document.documentElement;
          root.style.setProperty("--tc-safe-area-top", safeArea.top);
          root.style.setProperty("--tc-safe-area-right", safeArea.right);
          root.style.setProperty("--tc-safe-area-bottom", safeArea.bottom);
          root.style.setProperty("--tc-safe-area-left", safeArea.left);
        } catch (error) {}
      };
      applyStorage();
      applySafeArea();
      try {
        var rawSetItem = window.localStorage.setItem.bind(window.localStorage);
        var rawRemoveItem = window.localStorage.removeItem.bind(window.localStorage);
        window.localStorage.setItem = function(key, value) {
          rawSetItem(key, value);
          if (key === "token" || key === "uid") {
            post("storage", { key: key, value: value });
          }
        };
        window.localStorage.removeItem = function(key) {
          rawRemoveItem(key);
          if (key === "token" || key === "uid") {
            post("storage", { key: key, value: null });
          }
        };
      } catch (error) {}
      post("bootstrap", { href: window.location.href });
    })();
    true;
  `;
}

export function MobileChatWebShell({
  onNotificationTargetSettled,
  onPresentNotification,
  onSessionChange,
  pendingNotificationTargetPath,
  session,
}: {
  onNotificationTargetSettled: (targetPath: string | null) => void;
  onPresentNotification: (payload: NativeAppNotificationPayload) => Promise<void> | void;
  onSessionChange: (session: StoredAuthSession | null) => Promise<void> | void;
  pendingNotificationTargetPath: string | null;
  session: StoredAuthSession | null;
}) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<MinimalWebViewInstance | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentHostedPath, setCurrentHostedPath] = useState<string | null>(null);
  const currentSessionRef = useRef<StoredAuthSession | null>(session);
  const pendingTokenRef = useRef(session?.token?.trim() ?? "");
  const pendingUserIdRef = useRef<number | null>(typeof session?.userId === "number" && session.userId > 0 ? session.userId : null);
  const lastSyncedSessionRef = useRef<StoredAuthSession | null>(session);
  const sessionSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appliedNotificationTargetRef = useRef<string | null>(null);

  const baseUrl = useMemo(() => {
    return resolveChatWebBaseUrl();
  }, []);
  const initialUrlRef = useRef(resolveHostedUrl(baseUrl, pendingNotificationTargetPath));
  const injectedJavaScriptBeforeContentLoaded = useMemo(() => {
    return buildBridgeScript(session, insets);
  }, [insets, session]);

  useEffect(() => {
    currentSessionRef.current = session;
    pendingTokenRef.current = session?.token?.trim() ?? "";
    pendingUserIdRef.current = typeof session?.userId === "number" && session.userId > 0 ? session.userId : null;
    lastSyncedSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    // eslint-disable-next-line react-web-api/no-leaked-event-listener
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack || !webViewRef.current) {
        return false;
      }
      webViewRef.current.goBack();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [canGoBack]);

  useEffect(() => {
    return () => {
      if (sessionSyncTimerRef.current) {
        clearTimeout(sessionSyncTimerRef.current);
      }
    };
  }, []);

  const handleNavigationStateChange = useCallback((event: MinimalWebViewNavigationState) => {
    setCanGoBack(event.canGoBack);
    setCurrentHostedPath(extractHostedPathFromUrl(event.url));
  }, []);

  const flushSessionSync = useCallback(() => {
    sessionSyncTimerRef.current = null;

    const token = pendingTokenRef.current.trim();
    const userId = pendingUserIdRef.current;
    const currentSession = currentSessionRef.current;
    const nextSession = token
      ? {
          token,
          userId: userId ?? undefined,
          username: currentSession?.userId === userId ? currentSession.username : undefined,
        }
      : null;

    if (
      lastSyncedSessionRef.current?.token === nextSession?.token
      && lastSyncedSessionRef.current?.userId === nextSession?.userId
      && lastSyncedSessionRef.current?.username === nextSession?.username
    ) {
      return;
    }

    lastSyncedSessionRef.current = nextSession;
    void onSessionChange(nextSession);
  }, [onSessionChange]);

  const scheduleSessionSync = useCallback(() => {
    if (sessionSyncTimerRef.current) {
      clearTimeout(sessionSyncTimerRef.current);
    }
    sessionSyncTimerRef.current = setTimeout(() => {
      flushSessionSync();
    }, 60);
  }, [flushSessionSync]);

  const handleMessage = useCallback((event: MinimalWebViewMessageEvent) => {
    let payload: WebBridgeMessage | null = null;
    try {
      payload = JSON.parse(event.nativeEvent.data) as WebBridgeMessage;
    }
    catch {
      return;
    }

    switch (payload?.type) {
      case "bootstrap": {
        setCurrentHostedPath(extractHostedPathFromUrl(payload.payload?.href));
        return;
      }
      case "notification": {
        void onPresentNotification(payload.payload ?? {});
        return;
      }
      case "storage": {
        if (payload.payload?.key === "token") {
          pendingTokenRef.current = typeof payload.payload.value === "string" ? payload.payload.value.trim() : "";
          scheduleSessionSync();
          return;
        }

        if (payload.payload?.key === "uid") {
          const rawUserId = typeof payload.payload.value === "string" ? Number(payload.payload.value.trim()) : Number.NaN;
          pendingUserIdRef.current = Number.isFinite(rawUserId) && rawUserId > 0 ? rawUserId : null;
          scheduleSessionSync();
        }
        break;
      }
      default: {
        break;
      }
    }
  }, [onPresentNotification, scheduleSessionSync]);

  useEffect(() => {
    const normalizedTargetPath = normalizeNotificationTargetPath(pendingNotificationTargetPath);
    if (!normalizedTargetPath) {
      appliedNotificationTargetRef.current = null;
      return;
    }

    if (currentHostedPath === normalizedTargetPath) {
      appliedNotificationTargetRef.current = null;
      onNotificationTargetSettled(normalizedTargetPath);
      return;
    }

    if (!isLoaded || !webViewRef.current) {
      return;
    }

    if (appliedNotificationTargetRef.current === normalizedTargetPath) {
      return;
    }

    appliedNotificationTargetRef.current = normalizedTargetPath;
    webViewRef.current.injectJavaScript(
      buildNavigateScript(resolveHostedUrl(baseUrl, normalizedTargetPath)),
    );
  }, [
    baseUrl,
    currentHostedPath,
    isLoaded,
    onNotificationTargetSettled,
    pendingNotificationTargetPath,
  ]);

  if (Platform.OS === "web") {
    return (
      <ThemedView style={{ alignItems: "center", flex: 1, justifyContent: "center", padding: 24 }}>
        <View style={{ gap: 8, maxWidth: 420 }}>
          <ThemedText type="smallBold">当前平台直接使用网页端聊天页即可</ThemedText>
          <ThemedText themeColor="textSecondary">
            Web 端无需再包一层 WebView。
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            当前登录账号：
            {session?.username ?? session?.userId ?? "未知用户"}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // 仅在 native 平台加载 WebView，避免 web 端 bundle 直接触达原生实现。
  // eslint-disable-next-line ts/no-require-imports
  const { WebView } = require("react-native-webview") as {
    WebView: ComponentType<{
      allowFileAccess?: boolean;
      allowsBackForwardNavigationGestures?: boolean;
      allowsInlineMediaPlayback?: boolean;
      domStorageEnabled?: boolean;
      injectedJavaScriptBeforeContentLoaded?: string;
      javaScriptEnabled?: boolean;
      onLoadEnd?: () => void;
      onMessage?: (event: MinimalWebViewMessageEvent) => void;
      onNavigationStateChange?: (event: MinimalWebViewNavigationState) => void;
      originWhitelist?: string[];
      ref?: Ref<MinimalWebViewInstance | null>;
      setSupportMultipleWindows?: boolean;
      sharedCookiesEnabled?: boolean;
      source: { uri: string };
      style?: object;
      thirdPartyCookiesEnabled?: boolean;
    }>;
  };

  return (
    <ThemedView style={styles.root}>
      <WebView
        ref={webViewRef}
        allowFileAccess
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        domStorageEnabled
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        javaScriptEnabled
        onLoadEnd={() => setIsLoaded(true)}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
        originWhitelist={["*"]}
        setSupportMultipleWindows={false}
        sharedCookiesEnabled
        source={{ uri: initialUrlRef.current }}
        style={styles.root}
        thirdPartyCookiesEnabled
      />

      {!isLoaded
        ? (
            <View pointerEvents="none" style={styles.loader}>
              <ThemedView type="backgroundElement" style={styles.loaderCard}>
                <ActivityIndicator />
                <ThemedText themeColor="textSecondary">正在加载网页端聊天工作台…</ThemedText>
              </ThemedView>
            </View>
          )
        : null}
    </ThemedView>
  );
}
