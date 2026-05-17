import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { SymbolView } from "expo-symbols";
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

export type DmMessageAction = "reply" | "copy" | "recall";

interface DmMessageActionMenuProps {
  currentUserId: number | null;
  message: MessageDirectResponse | null;
  onAction: (action: DmMessageAction, message: MessageDirectResponse) => void;
  onClose: () => void;
  visible: boolean;
}

export function DmMessageActionMenu({
  currentUserId,
  message,
  onAction,
  onClose,
  visible,
}: DmMessageActionMenuProps) {
  const theme = useTheme();
  if (!message) return null;

  const isMine = typeof currentUserId === "number" && currentUserId === message.senderId;
  const actions: { action: DmMessageAction; icon: any; label: string; danger?: boolean; ownerOnly?: boolean }[] = [
    { action: "reply", icon: { ios: "arrowshape.turn.up.left", android: "reply", web: "reply" }, label: "回复" },
    { action: "copy", icon: { ios: "doc.on.doc", android: "content_copy", web: "content_copy" }, label: "复制" },
    { action: "recall", icon: { ios: "trash", android: "delete", web: "delete" }, label: "撤回", danger: true, ownerOnly: true },
  ];

  const visibleActions = actions.filter((item) => (!item.ownerOnly || isMine) && !(item.action === "recall" && message.status === 1));

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          {visibleActions.map((item) => (
            <Pressable
              key={item.action}
              onPress={() => { onAction(item.action, message); onClose(); }}
              style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: theme.backgroundElement }]}
            >
              <SymbolView name={item.icon} size={20} tintColor={item.danger ? theme.danger : theme.text} weight="medium" />
              <ThemedText style={item.danger ? [styles.dangerLabel, { color: theme.danger }] : styles.actionLabel}>
                {item.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
