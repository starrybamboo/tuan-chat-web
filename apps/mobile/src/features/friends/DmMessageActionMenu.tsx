import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { IconProps } from "phosphor-react-native";

import { ArrowBendUpLeft, Copy, Trash } from "phosphor-react-native";
import { Pressable, StyleSheet } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  actionRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
  },
  dangerLabel: {
    fontSize: 16,
  },
});

export type DmMessageAction = "reply" | "copy" | "recall";

type DmMessageActionMenuProps = {
  currentUserId: number | null;
  message: MessageDirectResponse | null;
  onAction: (action: DmMessageAction, message: MessageDirectResponse) => void;
  onClose: () => void;
  visible: boolean;
};

export function DmMessageActionMenu({
  currentUserId,
  message,
  onAction,
  onClose,
  visible,
}: DmMessageActionMenuProps) {
  const theme = useTheme();

  if (!message)
    return null;

  const isMine = typeof currentUserId === "number" && currentUserId === message.senderId;
  const actions: { action: DmMessageAction; Icon: React.ComponentType<IconProps>; label: string; hint: string; danger?: boolean; ownerOnly?: boolean }[] = [
    { action: "reply", Icon: ArrowBendUpLeft, label: "回复", hint: "引用这条消息进行回复" },
    { action: "copy", Icon: Copy, label: "复制", hint: "复制消息内容到剪贴板" },
    { action: "recall", Icon: Trash, label: "撤回", hint: "撤回前会打开确认提示", danger: true, ownerOnly: true },
  ];

  const visibleActions = actions.filter((item) => {
    if (item.ownerOnly && !isMine)
      return false;
    if (item.action === "recall" && message.status === 1)
      return false;
    return true;
  });

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      onClose={onClose}
      visible={visible}
    >
      {visibleActions.map(item => (
        <Pressable
          key={item.action}
          onPress={() => { onAction(item.action, message); onClose(); }}
          style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: theme.backgroundElement }]}
          accessibilityLabel={item.label}
          accessibilityHint={item.hint}
          accessibilityRole="button"
        >
          <item.Icon size={20} color={item.danger ? theme.danger : theme.text} />
          <ThemedText style={item.danger ? [styles.dangerLabel, { color: theme.danger }] : styles.actionLabel}>
            {item.label}
          </ThemedText>
        </Pressable>
      ))}
    </BottomSheetModal>
  );
}
