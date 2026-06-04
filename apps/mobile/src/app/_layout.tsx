import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNotificationInit } from "@/features/notifications/useNotificationInit";
import { installGlobalHandlers } from "@/lib/logger";
import { AppProviders } from "@/providers/app-providers";

installGlobalHandlers();

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default function RootLayout() {
  useNotificationInit();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <AppProviders>
          <ThemeProvider value={DarkTheme}>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="role-edit" />
              <Stack.Screen name="feedback" />
            </Stack>
          </ThemeProvider>
        </AppProviders>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
