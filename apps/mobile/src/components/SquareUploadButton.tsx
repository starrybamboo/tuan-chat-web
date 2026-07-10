import type { ReactNode } from "react";

import { Pressable, StyleSheet, View } from "react-native";

import { Radius } from "@/constants/theme";

type SquareUploadButtonProps = {
  accessibilityLabel: string;
  borderColor: string;
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  size: number;
};

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export function SquareUploadButton({
  accessibilityLabel,
  borderColor,
  children,
  disabled = false,
  onPress,
  size,
}: SquareUploadButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.box, { borderColor, height: size, width: size }]}>
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </Pressable>
  );
}
