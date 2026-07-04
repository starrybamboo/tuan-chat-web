import { Redirect, router } from "expo-router";
import { ArrowLeft, WarningCircle } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { ShouldStartLoadRequest, WebViewNavigation } from "react-native-webview/lib/WebViewTypes";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { buildMobileWebLoginUrl, resolveMobileWebAuthCallbackSession } from "@/features/auth/mobile-web-auth";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerTitle: { flex: 1, gap: 2 },
  webViewWrap: { flex: 1 },
  loader: {
    alignItems: "center",
    bottom: 0,
    gap: Spacing.md,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  errorState: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.lg,
    justifyContent: "center",
    padding: Spacing.xxl,
  },
  retryButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
});

export default function WebLoginScreen() {
  const theme = useTheme();
  const { isAuthenticated, replaceSession } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleAuthCallback = useCallback((url: string) => {
    const callbackSession = resolveMobileWebAuthCallbackSession(url);
    if (!callbackSession) {
      return false;
    }

    void replaceSession(callbackSession).then(() => {
      router.replace("/(tabs)" as any);
    });
    return true;
  }, [replaceSession]);

  const handleShouldStartLoad = useCallback((request: ShouldStartLoadRequest) => {
    return !handleAuthCallback(request.url);
  }, [handleAuthCallback]);

  const handleNavigationStateChange = useCallback((navigation: WebViewNavigation) => {
    handleAuthCallback(navigation.url);
  }, [handleAuthCallback]);

  if (isAuthenticated) {
    return <Redirect href={"/(tabs)" as any} />;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable
          accessibilityLabel="返回登录页"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: pressed ? theme.backgroundElement : "transparent" },
          ]}
        >
          <ArrowLeft color={theme.text} size={22} />
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText type="smallBold">网页登录</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">Turnstile 验证在 App 内完成</ThemedText>
        </View>
      </View>

      <View style={styles.webViewWrap}>
        <WebView
          key={loadKey}
          allowsBackForwardNavigationGestures
          javaScriptEnabled
          onError={(event) => {
            setLoadError(event.nativeEvent.description || "网页登录页加载失败。");
            setIsLoading(false);
          }}
          onHttpError={(event) => {
            setLoadError(`网页登录页返回 ${event.nativeEvent.statusCode}。`);
            setIsLoading(false);
          }}
          onLoadEnd={() => {
            setHasLoadedOnce(true);
            setIsLoading(false);
          }}
          onLoadStart={() => {
            setLoadError(null);
            if (!hasLoadedOnce) {
              setIsLoading(true);
            }
          }}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          originWhitelist={["https://*", "tuanchat://*"]}
          source={{ uri: buildMobileWebLoginUrl() }}
          startInLoadingState
        />

        {isLoading ? (
          <View style={[styles.loader, { backgroundColor: theme.background }]}>
            <ActivityIndicator color={theme.accent} />
            <ThemedText themeColor="textSecondary" type="small">正在加载网页登录…</ThemedText>
          </View>
        ) : null}

        {loadError ? (
          <View style={[styles.errorState, { backgroundColor: theme.background }]}>
            <WarningCircle color={theme.danger} size={36} />
            <ThemedText type="subtitle">网页登录页加载失败</ThemedText>
            <ThemedText themeColor="textSecondary">{loadError}</ThemedText>
            <Pressable
              onPress={() => {
                setLoadError(null);
                setHasLoadedOnce(false);
                setIsLoading(true);
                setLoadKey(key => key + 1);
              }}
              style={[styles.retryButton, { borderColor: theme.border }]}
            >
              <ThemedText type="smallBold">重试</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
