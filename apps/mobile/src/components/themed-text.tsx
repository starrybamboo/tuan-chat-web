import type { TextProps } from "react-native";

import { Platform, StyleSheet, Text } from "react-native";

import type { ThemeColor } from "@/constants/theme";

import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
  type?: "default" | "title" | "heading" | "small" | "smallBold" | "subtitle" | "link" | "linkPrimary" | "code" | "caption";
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = "default", themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? "text"] },
        type === "default" && styles.default,
        type === "title" && styles.title,
        type === "heading" && styles.heading,
        type === "small" && styles.small,
        type === "smallBold" && styles.smallBold,
        type === "subtitle" && styles.subtitle,
        type === "link" && styles.link,
        type === "linkPrimary" && styles.linkPrimary,
        type === "code" && styles.code,
        type === "caption" && styles.caption,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  smallBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  default: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  heading: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  link: {
    lineHeight: 22,
    fontSize: 15,
  },
  linkPrimary: {
    lineHeight: 22,
    fontSize: 15,
    color: "#58a6ff",
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: "700" }) ?? "500",
    fontSize: 12,
    lineHeight: 16,
  },
});
