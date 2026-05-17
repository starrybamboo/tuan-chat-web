import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import { memo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { TextEnhanceRenderer } from "@/components/TextEnhanceRenderer";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";

import { MobileMessageMediaPreview } from "@/features/messages/MobileMessageMediaPreview";

import { formatMessageTime, getMessagePreview } from "./mobileChatUtils";

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  rowFull: {
    paddingTop: Spacing.lg,
  },
  rowGrouped: {
    paddingLeft: 40 + Spacing.xl + Spacing.lg,
    paddingTop: Spacing.md,
  },
  rowNarrator: {
    paddingLeft: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  rowHighlight: {
    borderRadius: Radius.sm,
  },
  rowOOC: {
    borderColor: "rgba(150, 150, 150, 0.2)",
    borderRadius: Radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    marginHorizontal: Spacing.xl,
    paddingLeft: AVATAR_SIZE + Spacing.lg,
    paddingRight: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  avatar: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    justifyContent: "center",
    width: AVATAR_SIZE,
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  narratorAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(139, 148, 158, 0.15)",
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    justifyContent: "center",
    width: AVATAR_SIZE,
  },
  body: {
    flex: 1,
    gap: Spacing.xs,
  },
  authorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
  },
  replyPreview: {
    borderLeftWidth: 2,
    borderRadius: 2,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
});

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

function getAvatarColor(userId: number | undefined) {
  if (!userId) return AVATAR_COLORS[0];
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function isNarrator(message: Message): boolean {
  return !message.roleId || message.roleId <= 0;
}

function isOutOfCharacterSpeech(content?: string | null): boolean {
  if (typeof content !== "string" || content.length === 0) return false;
  const trimmedEnd = content.trimEnd();
  if (trimmedEnd.length === 0) return false;
  const openBrackets = new Set(["(", "（"]);
  const closeBrackets = new Set([")", "）"]);
  return openBrackets.has(content[0]) && closeBrackets.has(trimmedEnd[trimmedEnd.length - 1]);
}

function isMessageEdited(message: Message): boolean {
  if (!message.createTime || !message.updateTime) return false;
  const create = new Date(message.createTime).getTime();
  const update = new Date(message.updateTime).getTime();
  if (Number.isNaN(create) || Number.isNaN(update)) return false;
  return update > create;
}

function getDisplayRoleName(message: Message, roomRoles: UserRole[]): string {
  if (isNarrator(message)) return "";

  const customName = (message.customRoleName ?? "").trim();
  if (customName) return customName;

  const role = roomRoles.find(r => r.roleId === message.roleId);
  const roleName = (role?.roleName ?? "").trim();
  if (roleName) return roleName;

  return "未选择角色";
}

function getAvatarInitial(displayName: string) {
  if (displayName) return displayName.slice(0, 1);
  return "?";
}

interface ChatMessageItemProps {
  isGrouped: boolean;
  isMultiSelected?: boolean;
  isSelectedAnchor: boolean;
  message: Message;
  multiSelectMode?: boolean;
  onLongPress: (message: Message, pageY: number) => void;
  onToggleMultiSelect?: (message: Message) => void;
  replyPreviewText?: string | null;
  roomRoles: UserRole[];
}

export const ChatMessageItem = memo(function ChatMessageItem({
  isGrouped,
  isMultiSelected,
  isSelectedAnchor,
  message,
  multiSelectMode,
  onLongPress,
  onToggleMultiSelect,
  replyPreviewText,
  roomRoles,
}: ChatMessageItemProps) {
  const theme = useTheme();
  const narrator = isNarrator(message);
  const displayName = getDisplayRoleName(message, roomRoles);
  const isOOC = !narrator && message.messageType === 1 && isOutOfCharacterSpeech(message.content);
  const edited = isMessageEdited(message);
  const timestamp = formatMessageTime(edited ? message.updateTime : message.createTime);

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onEnd((e, success) => {
      if (success) {
        runOnJS(onLongPress)(message, e.absoluteY);
      }
    });

  const renderAvatar = () => {
    if (narrator) {
      return (
        <View style={styles.narratorAvatar}>
          <ThemedText style={{ fontSize: 16 }}>N</ThemedText>
        </View>
      );
    }
    if (message.avatarFileId) {
      return (
        <Image
          source={{ uri: avatarThumbUrl(message.avatarFileId) }}
          style={styles.avatar}
        />
      );
    }
    return (
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(message.userId) }]}>
        <ThemedText style={styles.avatarText}>{getAvatarInitial(displayName)}</ThemedText>
      </View>
    );
  };

  if (multiSelectMode) {
    return (
      <Pressable
        onPress={() => onToggleMultiSelect?.(message)}
        style={[
          {
            alignItems: "center",
            flexDirection: "row",
            paddingLeft: Spacing.md,
          },
          isMultiSelected && { backgroundColor: theme.accentMuted },
        ]}
      >
        <View
          style={{
            alignItems: "center",
            borderColor: isMultiSelected ? theme.accent : theme.border,
            borderRadius: Radius.full,
            borderWidth: 2,
            height: 22,
            justifyContent: "center",
            marginRight: Spacing.sm,
            width: 22,
            backgroundColor: isMultiSelected ? theme.accent : "transparent",
          }}
        >
          {isMultiSelected ? (
            <ThemedText style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✓</ThemedText>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={[
              narrator
                ? styles.rowNarrator
                : isOOC
                  ? styles.rowOOC
                  : isGrouped ? styles.rowGrouped : styles.row,
              !isGrouped && !narrator && !isOOC && styles.rowFull,
              isOOC && { backgroundColor: "rgba(150, 150, 150, 0.05)" },
            ]}
          >
            {!isGrouped && !narrator && !isOOC ? renderAvatar() : null}
            <View style={styles.body}>
              {message.messageType !== MESSAGE_TYPE.IMG && message.messageType !== MESSAGE_TYPE.VIDEO ? (
                <TextEnhanceRenderer
                  content={getMessagePreview(message)}
                  style={[
                    styles.content,
                    { color: narrator ? theme.textSecondary : theme.text },
                  ]}
                  numberOfLines={2}
                />
              ) : (
                <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>[媒体消息]</ThemedText>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <GestureDetector gesture={longPressGesture}>
      <View
        style={[
          narrator
            ? styles.rowNarrator
            : isOOC
              ? styles.rowOOC
              : isGrouped ? styles.rowGrouped : styles.row,
          !isGrouped && !narrator && !isOOC && styles.rowFull,
          isSelectedAnchor && styles.rowHighlight,
          isSelectedAnchor && { backgroundColor: theme.accentMuted },
          isOOC && { backgroundColor: "rgba(150, 150, 150, 0.05)" },
        ]}
      >
          {!isGrouped && !narrator && !isOOC ? renderAvatar() : null}
          <View style={styles.body}>
            {!isGrouped && !narrator ? (
              <View style={styles.authorRow}>
                {displayName ? (
                  <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                    {displayName}
                  </ThemedText>
                ) : null}
                {isOOC ? (
                  <ThemedText style={{ fontSize: 10, color: theme.textSecondary, fontWeight: "500" }}>
                    场外
                  </ThemedText>
                ) : null}
                <ThemedText style={{ fontSize: 11, color: theme.textSecondary, marginLeft: "auto" }}>
                  {edited ? <ThemedText style={{ fontSize: 11, color: theme.warning }}>(已编辑) </ThemedText> : null}
                  {timestamp}
                </ThemedText>
              </View>
            ) : null}
            {replyPreviewText ? (
              <View style={[styles.replyPreview, { borderLeftColor: theme.accent, backgroundColor: theme.accentMuted }]}>
                <ThemedText style={{ fontSize: 12, color: theme.textSecondary }} numberOfLines={1}>
                  回复: {replyPreviewText}
                </ThemedText>
              </View>
            ) : null}
            {message.messageType !== MESSAGE_TYPE.IMG && message.messageType !== MESSAGE_TYPE.VIDEO ? (
              <TextEnhanceRenderer
                content={getMessagePreview(message)}
                style={[
                  styles.content,
                  { color: narrator ? theme.textSecondary : isOOC ? theme.textSecondary : theme.text },
                  isOOC && { fontStyle: "italic" },
                ]}
              />
            ) : null}
            <MobileMessageMediaPreview
              content={message.content}
              extra={message.extra}
              messageType={message.messageType}
            />
            {(message.messageType === 6 || message.messageType === 5) ? (
              <View style={{ borderColor: theme.border, borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 4, paddingHorizontal: 12, paddingVertical: 8 }}>
                <ThemedText style={{ fontSize: 16 }}>{message.messageType === 6 ? "🎲" : "↗️"}</ThemedText>
                <View style={{ flex: 1 }}>
                  <ThemedText numberOfLines={2} style={{ fontSize: 13 }}>
                    {message.content?.trim() || (message.messageType === 6 ? "骰子结果" : "转发消息")}
                  </ThemedText>
                </View>
              </View>
            ) : null}
            {message.messageType === 1003 ? (
              <View style={{ borderColor: theme.accent, borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 4, paddingHorizontal: 12, paddingVertical: 8 }}>
                <ThemedText style={{ fontSize: 14 }}>🔗</ThemedText>
                <ThemedText style={{ color: theme.accent, fontSize: 13 }}>
                  {message.content?.trim() || "跳转到房间"}
                </ThemedText>
              </View>
            ) : null}
          </View>
      </View>
    </GestureDetector>
  );
});
