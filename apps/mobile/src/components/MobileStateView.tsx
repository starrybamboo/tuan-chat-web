import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { ActivityIndicator, StyleSheet, View } from "react-native";

import { MobileButton } from "@/components/MobileButton";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type MobileStateTone = "default" | "error" | "success" | "warning";

type MobileStateViewProps = {
  actionLabel?: string;
  children?: ReactNode;
  loading?: boolean;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
  tone?: MobileStateTone;
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Spacing.md,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
});

export function MobileStateView({
  actionLabel,
  children,
  loading = false,
  onAction,
  style,
  title,
  tone = "default",
}: MobileStateViewProps) {
  const theme = useTheme();
  const color = tone === "error"
    ? theme.danger
    : tone === "success"
      ? theme.success
      : tone === "warning"
        ? theme.warning
        : theme.textSecondary;

  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      accessibilityLiveRegion={tone === "error" ? "assertive" : "polite"}
      style={[styles.container, style]}
    >
      {loading ? <ActivityIndicator color={color} /> : null}
      <ThemedText style={{ color, textAlign: "center" }}>{title}</ThemedText>
      {typeof children === "string"
        ? <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: "center" }}>{children}</ThemedText>
        : children}
      {actionLabel && onAction
        ? <MobileButton accessibilityLabel={actionLabel} label={actionLabel} onPress={onAction} variant={tone === "error" ? "danger" : "secondary"} />
        : null}
    </View>
  );
}
