import type { StyleProp, TextStyle, ViewStyle } from "react-native";

import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type MobileButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type MobileButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: MobileButtonVariant;
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export function MobileButton({
  accessibilityLabel,
  disabled = false,
  label,
  loading = false,
  onPress,
  style,
  textStyle,
  variant = "primary",
}: MobileButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const backgroundColor = variant === "primary"
    ? theme.accent
    : variant === "danger"
      ? theme.danger
      : variant === "secondary"
        ? theme.backgroundSelected
        : "transparent";
  const textColor = variant === "primary" || variant === "danger" ? "#fff" : theme.text;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={textColor} size="small" /> : null}
        <ThemedText style={[styles.text, { color: textColor }, textStyle]}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}
