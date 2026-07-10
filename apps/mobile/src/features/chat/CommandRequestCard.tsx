import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type CommandRequestCardProps = {
  allowedRoleIds?: number[];
  command: string;
  disableReason: string | null;
  isAllowAll: boolean;
  isConsumed: boolean;
  messageId: number;
  onExecute: (payload: { command: string; messageId: number }) => void;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  badgeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  badge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  commandText: {
    fontFamily: "monospace",
    fontSize: 14,
  },
  hint: {
    fontSize: 11,
  },
});

export function CommandRequestCard({
  command,
  disableReason,
  isAllowAll,
  isConsumed,
  messageId,
  onExecute,
}: CommandRequestCardProps) {
  const theme = useTheme();
  const disabled = !!disableReason || isConsumed;

  return (
    <Pressable
      accessibilityLabel={isConsumed ? `检定 ${command} 已执行` : disableReason ? `检定 ${command} 不可执行，${disableReason}` : `执行检定 ${command}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onExecute({ command, messageId })}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: disabled ? theme.border : theme.accent,
          backgroundColor: pressed ? theme.backgroundElement : "transparent",
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <ThemedText style={[styles.badgeText, { color: "#fff" }]}>检定请求</ThemedText>
        </View>
        {isAllowAll
          ? (
              <View style={[styles.badge, { backgroundColor: theme.warning ?? "#f59e0b" }]}>
                <ThemedText style={[styles.badgeText, { color: "#fff" }]}>全员</ThemedText>
              </View>
            )
          : null}
      </View>
      <ThemedText style={[styles.commandText, { color: theme.text }]}>
        {command}
      </ThemedText>
      <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
        {isConsumed ? "此检定已执行" : disableReason ?? "点按执行此检定"}
      </ThemedText>
    </Pressable>
  );
}

export function getCommandRequestDisableReason({
  command,
  isConsumed,
  isSpaceOwner,
  noRole,
  currentRoleId,
  allowedRoleIds,
}: {
  allowedRoleIds?: number[];
  command: string;
  currentRoleId: number;
  isConsumed: boolean;
  isSpaceOwner: boolean;
  noRole: boolean;
}): string | null {
  if (!command)
    return "指令为空";
  if (isConsumed)
    return "已执行";
  if (noRole && !isSpaceOwner)
    return "请先选择角色";
  if (allowedRoleIds && allowedRoleIds.length > 0 && !allowedRoleIds.includes(currentRoleId)) {
    return "当前角色不可执行";
  }
  return null;
}
