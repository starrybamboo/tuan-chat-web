import { MagnifyingGlass, X } from "phosphor-react-native";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  input: {
    borderRadius: Radius.xl,
    flex: 1,
    fontSize: 14,
    height: 36,
    paddingHorizontal: Spacing.xl,
  },
  closeBtn: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
});

interface ChatSearchBarProps {
  onChangeQuery: (query: string) => void;
  onClose: () => void;
  query: string;
  resultCount: number;
}

export function ChatSearchBar({ onChangeQuery, onClose, query, resultCount }: ChatSearchBarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <MagnifyingGlass size={16} color={theme.textSecondary} />
      <TextInput
        autoFocus
        value={query}
        onChangeText={onChangeQuery}
        placeholder="搜索消息..."
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
        returnKeyType="search"
      />
      <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="关闭搜索">
        <X size={16} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}
