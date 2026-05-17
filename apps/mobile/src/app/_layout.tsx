import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Slot } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { useNotificationInit } from "@/features/notifications/useNotificationInit";
import { AppProviders } from "@/providers/app-providers";

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default function RootLayout() {
  useNotificationInit();

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppProviders>
        <ThemeProvider value={DarkTheme}>
          <AnimatedSplashOverlay />
          <Slot />
        </ThemeProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
