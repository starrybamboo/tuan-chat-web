import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { IconProps } from "phosphor-react-native";
import type { LayoutChangeEvent } from "react-native";

import { canCopyMessageToClueFolder } from "@tuanchat/domain/clue-folder";
import { canDeleteRoomMessage, canEditRoomMessage, canReplyRoomMessage } from "@tuanchat/domain/message-action-permissions";
import { ArrowBendUpLeft, CheckCircle, Copy, HandTap, Lightbulb, PaperPlaneTilt, PencilSimple, Trash } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { MessageActionMenuAnchor } from "./messageActionMenuLayout";

import { resolveMessageActionMenuLayout } from "./messageActionMenuLayout";

const ACTION_ITEM_WIDTH = 64;
const MAX_ACTION_COLUMNS = 4;
const MENU_MAX_WIDTH = 320;
const POINTER_HALF_WIDTH = 8;
const POINTER_HEIGHT = 9;
const POINTER_INSET = 12;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  menu: {
    borderRadius: Radius.md,
    borderCurve: "continuous",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.18)",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.lg,
    maxWidth: 320,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    position: "absolute",
  },
  actionRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderCurve: "continuous",
    minHeight: 62,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    width: ACTION_ITEM_WIDTH,
  },
  actionLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  pointer: {
    borderLeftColor: "transparent",
    borderLeftWidth: POINTER_HALF_WIDTH,
    borderRightColor: "transparent",
    borderRightWidth: POINTER_HALF_WIDTH,
    height: 0,
    position: "absolute",
    width: 0,
  },
  pointerDown: {
    borderTopWidth: POINTER_HEIGHT,
    bottom: -POINTER_HEIGHT,
  },
  pointerUp: {
    borderBottomWidth: POINTER_HEIGHT,
    top: -POINTER_HEIGHT,
  },
});

export type MessageAction = "addClue" | "reply" | "delete" | "copy" | "edit" | "multiSelect" | "poke" | "sendToRoom";

type MessageActionMenuProps = {
  canAddClue?: boolean;
  canMultiSelect?: boolean;
  canPoke?: boolean;
  canReply?: boolean;
  canSendToRoom?: boolean;
  currentUserId: number | null;
  hasHostPrivileges?: boolean;
  message: Message | null;
  onAction: (action: MessageAction, message: Message) => void;
  onClose: () => void;
  anchor?: MessageActionMenuAnchor | null;
  visible: boolean;
};

export function MessageActionMenu({
  anchor,
  canAddClue = false,
  canMultiSelect = true,
  canPoke = false,
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
  const insets = useSafeAreaInsets();
  const viewport = useWindowDimensions();
  const [menuHeight, setMenuHeight] = useState(0);

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
    { action: "poke", Icon: HandTap, label: "戳一戳", show: canPoke && (message.roleId ?? -1) > 0 && message.status !== 1 },
    { action: "reply", Icon: ArrowBendUpLeft, label: "回复", show: showReply },
    { action: "edit", Icon: PencilSimple, label: "编辑", show: showEdit },
    { action: "multiSelect", Icon: CheckCircle, label: "多选", show: canMultiSelect },
    { action: "delete", Icon: Trash, label: "删除", danger: true, show: showDelete },
  ];

  const visibleActions = actions.filter(a => a.show);
  const availableWidth = Math.min(MENU_MAX_WIDTH, Math.max(ACTION_ITEM_WIDTH + Spacing.lg * 2, viewport.width - Spacing.lg * 2));
  const maxColumns = Math.max(1, Math.min(
    MAX_ACTION_COLUMNS,
    Math.floor((availableWidth - Spacing.lg * 2 + Spacing.lg) / (ACTION_ITEM_WIDTH + Spacing.lg)),
  ));
  const columnCount = Math.max(1, Math.min(visibleActions.length, maxColumns));
  const menuWidth = Math.min(
    availableWidth,
    Spacing.lg * 2 + columnCount * ACTION_ITEM_WIDTH + (columnCount - 1) * Spacing.lg,
  );
  const resolvedAnchor = anchor ?? {
    bottom: viewport.height / 2,
    top: viewport.height / 2,
    x: viewport.width / 2,
  };
  const menuLayout = resolveMessageActionMenuLayout({
    anchor: resolvedAnchor,
    horizontalMargin: Spacing.lg,
    insetBottom: insets.bottom,
    insetTop: insets.top,
    menuHeight,
    menuWidth,
    pointerHalfWidth: POINTER_HALF_WIDTH,
    pointerInset: POINTER_INSET,
    verticalGap: POINTER_HEIGHT,
    viewportHeight: viewport.height,
    viewportWidth: viewport.width,
  });
  const handleMenuLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setMenuHeight(nextHeight);
  }, []);

  return (
    <View style={styles.overlay} pointerEvents={visible ? "auto" : "none"}>
      <Pressable accessible={false} style={styles.backdrop} onPress={onClose} />
        <View
          onLayout={handleMenuLayout}
          style={[
            styles.menu,
            {
              backgroundColor: theme.surface,
              left: menuLayout.left,
              opacity: menuHeight > 0 ? 1 : 0,
              top: menuLayout.top,
              width: menuWidth,
            },
          ]}
        >
          {visibleActions.map(item => (
            <Pressable
              key={item.action}
              testID={`message-action-${item.action}`}
              onPress={() => { onAction(item.action, message); onClose(); }}
              style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: theme.backgroundElement }]}
              accessibilityLabel={item.label}
              accessibilityRole="button"
            >
              <item.Icon size={24} color={item.danger ? theme.danger : theme.text} />
              <ThemedText numberOfLines={2} style={[styles.actionLabel, { color: item.danger ? theme.danger : theme.text }]}>
                {item.label}
              </ThemedText>
            </Pressable>
          ))}
          <View
            style={[
              styles.pointer,
              menuLayout.placement === "above" ? styles.pointerDown : styles.pointerUp,
              {
                borderBottomColor: menuLayout.placement === "below" ? theme.surface : "transparent",
                borderTopColor: menuLayout.placement === "above" ? theme.surface : "transparent",
                left: menuLayout.pointerLeft,
              },
            ]}
          />
        </View>
    </View>
  );
}
