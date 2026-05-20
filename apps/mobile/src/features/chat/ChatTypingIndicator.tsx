import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
});

type ChatTypingIndicatorProps = {
  typingUsers: string[];
};

export function ChatTypingIndicator({ typingUsers }: ChatTypingIndicatorProps) {
  const theme = useTheme();

  if (typingUsers.length === 0)
    return null;

  const label
    = typingUsers.length === 1
      ? `${typingUsers[0]} 正在输入...`
      : `${typingUsers[0]} 等人正在输入...`;

  return (
    <View style={styles.container}>
      <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
        {label}
      </ThemedText>
    </View>
  );
}
