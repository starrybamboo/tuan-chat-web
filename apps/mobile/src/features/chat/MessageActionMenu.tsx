import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { IconProps } from "phosphor-react-native";
import { ArrowBendUpLeft, CheckCircle, Copy, PencilSimple, Trash } from "phosphor-react-native";
import { useEffect, useRef } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { SPRING_SNAPPY } from "@/lib/animations";

const TOOLBAR_HEIGHT = 48;
const TOOLBAR_MARGIN = 8;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  container: {
    flex: 1,
  },
  toolbar: {
    alignItems: "center",
    borderRadius: Radius.lg,
    flexDirection: "row",
    height: TOOLBAR_HEIGHT,
    paddingHorizontal: Spacing.sm,
    position: "absolute",
    alignSelf: "center",
    zIndex: 1,
  },
  actionBtn: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 40,
    justifyContent: "center",
    minWidth: 56,
    paddingHorizontal: Spacing.lg,
  },
  actionLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

export type MessageAction = "reply" | "delete" | "copy" | "edit" | "multiSelect";

interface MessageActionMenuProps {
  currentUserId: number | null;
  message: Message | null;
  onAction: (action: MessageAction, message: Message) => void;
  onClose: () => void;
  pressY: number;
  visible: boolean;
}

export function MessageActionMenu({
  currentUserId,
  message,
  onAction,
  onClose,
  pressY,
  visible,
}: MessageActionMenuProps) {
  const theme = useTheme();
  const scale = useSharedValue(0.8);
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (visible) {
      openedAtRef.current = Date.now();
      scale.value = withSpring(1, SPRING_SNAPPY);
    }
    else {
      scale.value = 0.8;
    }
  }, [visible, scale]);

  const handleOverlayPress = () => {
    if (Date.now() - openedAtRef.current < 400) {
      return;
    }
    onClose();
  };

  const animatedToolbar = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!message)
    return null;

  const isMine = typeof currentUserId === "number" && currentUserId === message.userId;

  const actions: { action: MessageAction; Icon: React.ComponentType<IconProps>; label: string; danger?: boolean; ownerOnly?: boolean }[] = [
    { action: "copy", Icon: Copy, label: "复制" },
    { action: "reply", Icon: ArrowBendUpLeft, label: "回复" },
    { action: "edit", Icon: PencilSimple, label: "编辑", ownerOnly: true },
    { action: "multiSelect", Icon: CheckCircle, label: "多选" },
    { action: "delete", Icon: Trash, label: "删除", danger: true, ownerOnly: true },
  ];

  const visibleActions = actions.filter(a => !a.ownerOnly || isMine);

  const screenHeight = Dimensions.get("window").height;
  const showAbove = pressY > screenHeight / 2;
  const topPosition = showAbove
    ? pressY - TOOLBAR_HEIGHT - TOOLBAR_MARGIN
    : pressY + TOOLBAR_MARGIN;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable style={styles.overlay} onPress={handleOverlayPress} />
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={[
            styles.toolbar,
            {
              backgroundColor: theme.surface,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
              top: topPosition,
            },
            animatedToolbar,
          ]}
        >
          {visibleActions.map(item => (
            <Pressable
              key={item.action}
              testID={`message-action-${item.action}`}
              onPress={() => {
                onAction(item.action, message);
                onClose();
              }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && { backgroundColor: theme.backgroundElement },
              ]}
            >
              <item.Icon
                size={18}
                color={item.danger ? theme.danger : theme.text}
              />
              <ThemedText
                style={[
                  styles.actionLabel,
                  { color: item.danger ? theme.danger : theme.textSecondary },
                ]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}
