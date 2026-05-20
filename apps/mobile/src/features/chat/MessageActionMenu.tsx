import type { IconProps } from "phosphor-react-native";

import { ArrowBendUpLeft, CheckCircle, Copy, Lightbulb, PaperPlaneTilt, PencilSimple, Trash } from "phosphor-react-native";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import type { Message } from "@tuanchat/openapi-client/models/Message";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { canCopyMessageToClueFolder } from "@tuanchat/domain/clue-folder";
import { canDeleteRoomMessage, canEditRoomMessage, canReplyRoomMessage } from "@tuanchat/domain/message-action-permissions";

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

export type MessageAction = "addClue" | "reply" | "delete" | "copy" | "edit" | "multiSelect" | "sendToRoom";

type MessageActionMenuProps = {
  canAddClue?: boolean;
  canMultiSelect?: boolean;
  canReply?: boolean;
  canSendToRoom?: boolean;
  currentUserId: number | null;
  hasHostPrivileges?: boolean;
  message: Message | null;
  onAction: (action: MessageAction, message: Message) => void;
  onClose: () => void;
  visible: boolean;
};

export function MessageActionMenu({
  canAddClue = false,
  canMultiSelect = true,
  canReply = true,
  canSendToRoom = false,
  currentUserId,
  hasHostPrivileges: isHost = false,
  message,
  onAction,
  onClose,
  visible,
}: MessageActionMenuProps) {
  const theme = useTheme();

  if (!message)
    return null;

  const permissionContext = {
    currentUserId,
    hasHostPrivileges: isHost,
    messageSenderId: message.userId,
    messageStatus: message.status,
    messageType: message.messageType,
  };

  const showEdit = canEditRoomMessage(permissionContext);
  const showDelete = canDeleteRoomMessage(permissionContext);
  const showReply = canReply && canReplyRoomMessage(permissionContext);
  const showAddClue = canAddClue && canCopyMessageToClueFolder(message);
  const showSendToRoom = canSendToRoom && canCopyMessageToClueFolder(message);

  const actions: { action: MessageAction; Icon: React.ComponentType<IconProps>; label: string; danger?: boolean; show: boolean }[] = [
    { action: "copy", Icon: Copy, label: "复制", show: message.status !== 1 },
    { action: "addClue", Icon: Lightbulb, label: "添加线索", show: showAddClue },
    { action: "sendToRoom", Icon: PaperPlaneTilt, label: "发送到当前房间", show: showSendToRoom },
    { action: "reply", Icon: ArrowBendUpLeft, label: "回复", show: showReply },
    { action: "edit", Icon: PencilSimple, label: "编辑", show: showEdit },
    { action: "multiSelect", Icon: CheckCircle, label: "多选", show: canMultiSelect },
    { action: "delete", Icon: Trash, label: "删除", danger: true, show: showDelete },
  ];

  const visibleActions = actions.filter(a => a.show);

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
          {visibleActions.map(item => (
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
