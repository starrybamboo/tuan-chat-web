import type { Message } from "@tuanchat/openapi-client/models/Message";
import { getImageMessageExtra } from "@tuanchat/domain/message-extra";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { Image } from "expo-image";
import { memo } from "react";

import { StyleSheet, Vibration, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { TextEnhanceRenderer } from "@/components/TextEnhanceRenderer";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { MobileMessageMediaPreview } from "@/features/messages/MobileMessageMediaPreview";

import { useTheme } from "@/hooks/use-theme";
import { mediaFileUrl } from "@/lib/media-url";

import { getMessagePreview } from "./mobileChatUtils";
import { MessageAvatar } from "./MessageAvatar";
import { type RoomRolesById } from "./chat-avatar-utils";

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.lg,
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  rowFull: {
    paddingTop: Spacing.xl,
  },
  rowGrouped: {
    paddingLeft: 40 + Spacing.xl + Spacing.lg,
    paddingRight: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  rowNarrator: {
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.xxl,
    paddingVertical: Spacing.md,
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
    marginVertical: Spacing.md,
    paddingLeft: AVATAR_SIZE + Spacing.lg,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.md,
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

function isNarrator(message: Message): boolean {
  return !message.roleId || message.roleId <= 0;
}

function isOutOfCharacterSpeech(content?: string | null): boolean {
  if (typeof content !== "string" || content.length === 0)
    return false;
  const trimmedEnd = content.trimEnd();
  if (trimmedEnd.length === 0)
    return false;
  const openBrackets = new Set(["(", "（"]);
  const closeBrackets = new Set([")", "）"]);
  return openBrackets.has(content[0]) && closeBrackets.has(trimmedEnd[trimmedEnd.length - 1]);
}

function getDisplayRoleName(message: Message, roomRolesById: RoomRolesById): string {
  if (isNarrator(message))
    return "";

  const customName = (message.customRoleName ?? "").trim();
  if (customName)
    return customName;

  const role = typeof message.roleId === "number" ? roomRolesById.get(message.roleId) : undefined;
  const roleName = (role?.roleName ?? "").trim();
  if (roleName)
    return roleName;

  return "未选择角色";
}

interface ChatMessageItemProps {
  isGrouped: boolean;
  isMultiSelected?: boolean;
  isSelectedAnchor: boolean;
  message: Message;
  multiSelectMode?: boolean;
  onLongPress: (message: Message) => void;
  onToggleMultiSelect?: (message: Message) => void;
  replyAuthorName?: string | null;
  replyPreviewText?: string | null;
  roomRolesById: RoomRolesById;
}

export const ChatMessageItem = memo(({
  isGrouped,
  isMultiSelected,
  isSelectedAnchor,
  message,
  multiSelectMode,
  onLongPress,
  onToggleMultiSelect,
  replyAuthorName,
  replyPreviewText,
  roomRolesById,
}: ChatMessageItemProps) => {
  const theme = useTheme();
  const narrator = isNarrator(message);
  const displayName = getDisplayRoleName(message, roomRolesById);
  const isOOC = !narrator && message.messageType === 1 && isOutOfCharacterSpeech(message.content);

  const renderAvatar = () => {
    if (narrator) {
      return (
        <View style={styles.narratorAvatar}>
          <ThemedText style={{ fontSize: 16 }}>N</ThemedText>
        </View>
      );
    }
    return (
      <MessageAvatar
        avatarFileId={message.avatarFileId}
        displayName={displayName}
        roleId={message.roleId}
        roomRolesById={roomRolesById}
        size={AVATAR_SIZE}
        userId={message.userId}
      />
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
          {isMultiSelected
            ? (
                <ThemedText style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✓</ThemedText>
              )
            : null}
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
              {message.messageType === MESSAGE_TYPE.IMG
                ? (() => {
                    const img = getImageMessageExtra(message.extra);
                    const thumbUri = img?.fileId ? mediaFileUrl(img.fileId, "image", "low") : null;
                    return thumbUri
                      ? <Image source={{ uri: thumbUri }} style={{ borderRadius: Radius.sm, height: 40, width: 40 }} />
                      : <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>[图片]</ThemedText>;
                  })()
                : message.messageType === MESSAGE_TYPE.VIDEO
                  ? <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>[视频]</ThemedText>
                  : (
                      <TextEnhanceRenderer
                        content={getMessagePreview(message)}
                        style={[
                          styles.content,
                          { color: narrator ? theme.textSecondary : theme.text },
                        ]}
                        numberOfLines={2}
                      />
                    )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      delayLongPress={500}
      onLongPress={() => {
        Vibration.vibrate(10);
        onLongPress(message);
      }}
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
        {!isGrouped && !narrator
          ? (
              <View style={styles.authorRow}>
                {displayName
                  ? (
                      <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                        {displayName}
                      </ThemedText>
                    )
                  : null}
                {isOOC
                  ? (
                      <ThemedText style={{ fontSize: 10, color: theme.textSecondary, fontWeight: "500" }}>
                        场外
                      </ThemedText>
                    )
                  : null}
              </View>
            )
          : null}
        {replyPreviewText
          ? (
              <View style={[styles.replyPreview, { borderLeftColor: theme.accent, backgroundColor: theme.accentMuted }]}>
                <ThemedText style={{ fontSize: 12, color: theme.textSecondary }} numberOfLines={1}>
                  回复
                  {" "}
                  {replyAuthorName ?? ""}
                  :
                  {" "}
                  {replyPreviewText}
                </ThemedText>
              </View>
            )
          : null}
        {message.messageType !== MESSAGE_TYPE.IMG && message.messageType !== MESSAGE_TYPE.VIDEO
          ? (
              <TextEnhanceRenderer
                content={getMessagePreview(message)}
                style={[
                  styles.content,
                  { color: narrator ? theme.textSecondary : isOOC ? theme.textSecondary : theme.text },
                  isOOC && { fontStyle: "italic" },
                ]}
              />
            )
          : null}
        <MobileMessageMediaPreview
          content={message.content}
          extra={message.extra}
          messageType={message.messageType}
        />
        {(message.messageType === 6 || message.messageType === 5)
          ? (
              <View style={{ borderColor: theme.border, borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 4, paddingHorizontal: 12, paddingVertical: 8 }}>
                <ThemedText style={{ fontSize: 16 }}>{message.messageType === 6 ? "🎲" : "↗️"}</ThemedText>
                <View style={{ flex: 1 }}>
                  <ThemedText numberOfLines={2} style={{ fontSize: 13 }}>
                    {message.content?.trim() || (message.messageType === 6 ? "骰子结果" : "转发消息")}
                  </ThemedText>
                </View>
              </View>
            )
          : null}
        {message.messageType === 1003
          ? (
              <View style={{ borderColor: theme.accent, borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 4, paddingHorizontal: 12, paddingVertical: 8 }}>
                <ThemedText style={{ fontSize: 14 }}>🔗</ThemedText>
                <ThemedText style={{ color: theme.accent, fontSize: 13 }}>
                  {message.content?.trim() || "跳转到房间"}
                </ThemedText>
              </View>
            )
          : null}
      </View>
    </Pressable>
  );
});
