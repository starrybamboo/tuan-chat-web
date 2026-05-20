import { memo, useCallback, useState } from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type InlineEditCellProps = {
  keyboardType?: "default" | "numeric";
  onSave: (value: string) => void;
  value: string;
};

export const InlineEditCell = memo(({
  keyboardType = "default",
  onSave,
  value,
}: InlineEditCellProps) => {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handlePress = useCallback(() => {
    setDraft(value);
    setEditing(true);
  }, [value]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onSave(trimmed || value);
    }
  }, [draft, value, onSave]);

  if (editing) {
    return (
      <TextInput
        autoFocus
        keyboardType={keyboardType}
        onBlur={handleBlur}
        onChangeText={setDraft}
        style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.accent, color: theme.text }]}
        value={draft}
      />
    );
  }

  return (
    <Pressable onPress={handlePress} style={styles.cell}>
      <ThemedText type="caption" numberOfLines={1}>{value}</ThemedText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: Spacing.xs,
  },
  input: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    fontSize: 12,
    minHeight: 28,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
});
