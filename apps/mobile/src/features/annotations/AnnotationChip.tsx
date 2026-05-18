import type { AnnotationDefinition, AnnotationTone } from "@tuanchat/domain/annotation-catalog";

import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
});

function getToneColor(tone: AnnotationTone | undefined, theme: ReturnType<typeof useTheme>) {
  switch (tone) {
    case "info": return theme.accent;
    case "primary": return "#a78bfa";
    case "accent": return "#f59e0b";
    case "warning": return theme.warning;
    case "success": return theme.success;
    default: return theme.textSecondary;
  }
}

interface AnnotationChipProps {
  annotation: AnnotationDefinition;
  active?: boolean;
  onPress?: () => void;
}

export function AnnotationChip({ annotation, active, onPress }: AnnotationChipProps) {
  const theme = useTheme();
  const color = getToneColor(annotation.tone, theme);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? color : theme.border,
          backgroundColor: active ? `${color}22` : "transparent",
        },
      ]}
    >
      <ThemedText style={{ fontSize: 11, color, fontWeight: active ? "600" : "400" }}>
        {annotation.label}
      </ThemedText>
    </Pressable>
  );
}
