import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Slot } from "expo-router";
import React from "react";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AppProviders } from "@/providers/app-providers";

export default function TabLayout() {
  return (
    <AppProviders>
      <ThemeProvider value={DarkTheme}>
        <AnimatedSplashOverlay />
        <Slot />
      </ThemeProvider>
    </AppProviders>
  );
}
