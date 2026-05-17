import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#f3f6fb",
    background: "#0d1117",
    backgroundElement: "#161b22",
    backgroundSelected: "#21262d",
    textSecondary: "#8b949e",
    border: "#30363d",
    accent: "#58a6ff",
    accentMuted: "rgba(56, 139, 253, 0.15)",
    danger: "#f85149",
    dangerMuted: "rgba(248, 81, 73, 0.15)",
    success: "#3fb950",
    successMuted: "rgba(63, 185, 80, 0.15)",
    warning: "#d29922",
    surface: "#1c2128",
    surfaceOverlay: "rgba(22, 27, 34, 0.95)",
    shadow: "rgba(0, 0, 0, 0.4)",
  },
  dark: {
    text: "#f3f6fb",
    background: "#0d1117",
    backgroundElement: "#161b22",
    backgroundSelected: "#21262d",
    textSecondary: "#8b949e",
    border: "#30363d",
    accent: "#58a6ff",
    accentMuted: "rgba(56, 139, 253, 0.15)",
    danger: "#f85149",
    dangerMuted: "rgba(248, 81, 73, 0.15)",
    success: "#3fb950",
    successMuted: "rgba(63, 185, 80, 0.15)",
    warning: "#d29922",
    surface: "#1c2128",
    surfaceOverlay: "rgba(22, 27, 34, 0.95)",
    shadow: "rgba(0, 0, 0, 0.4)",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
