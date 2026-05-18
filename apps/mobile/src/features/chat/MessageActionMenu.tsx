import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { IconProps } from "phosphor-react-native";
import { ArrowBendUpLeft, CheckCircle, Copy, PencilSimple, Trash } from "phosphor-react-native";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: Spacing.xl,
    width: 36,
  },
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

export type MessageAction = "reply" | "delete" | "copy" | "edit" | "multiSelect";

interface MessageActionMenuProps {
  currentUserId: number | null;
  message: Message | null;
  onAction: (action: MessageAction, message: Message) => void;
  onClose: () => void;
  visible: boolean;
}

export function MessageActionMenu({
  currentUserId,
  message,
  onAction,
  onClose,
  visible,
}: MessageActionMenuProps) {
  const theme = useTheme();

  if (!message) return null;

  const isMine = typeof currentUserId === "number" && currentUserId === message.userId;

  const actions: { action: MessageAction; Icon: React.ComponentType<IconProps>; label: string; danger?: boolean; ownerOnly?: boolean }[] = [
    { action: "copy", Icon: Copy, label: "复制" },
    { action: "reply", Icon: ArrowBendUpLeft, label: "回复" },
    { action: "edit", Icon: PencilSimple, label: "编辑", ownerOnly: true },
    { action: "multiSelect", Icon: CheckCircle, label: "多选" },
    { action: "delete", Icon: Trash, label: "删除", danger: true, ownerOnly: true },
  ];

  const visibleActions = actions.filter(a => !a.ownerOnly || isMine);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="关闭菜单"
          accessibilityRole="button"
        />
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          {visibleActions.map((item) => (
            <Pressable
              key={item.action}
              testID={`message-action-${item.action}`}
              onPress={() => { onAction(item.action, message); onClose(); }}
              style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: theme.backgroundElement }]}
              accessibilityLabel={item.label}
              accessibilityRole="button"
            >
              <item.Icon size={20} color={item.danger ? theme.danger : theme.text} />
              <ThemedText style={item.danger ? [styles.dangerLabel, { color: theme.danger }] : styles.actionLabel}>
                {item.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}
