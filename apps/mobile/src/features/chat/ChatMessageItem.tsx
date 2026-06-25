import type { Message } from "@tuanchat/openapi-client/models/Message";

import { getDiceResultExtra, getDiceTurnExtra, getImageMessageExtra, getSoundMessageExtra } from "@tuanchat/domain/message-extra";
import { getDiceTurnRenderData } from "@tuanchat/domain/message-render-data";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { memo } from "react";
import { Pressable, StyleSheet, Vibration, View } from "react-native";

import { CachedImage } from "@/components/CachedImage";
import { TextEnhanceRenderer } from "@/components/TextEnhanceRenderer";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { resolveMessageMediaUrl } from "@/features/messages/messageMediaSource";
import { MobileMessageMediaPreview } from "@/features/messages/MobileMessageMediaPreview";
import { useTheme } from "@/hooks/use-theme";

import type { RoomRolesById } from "./chat-avatar-utils";

import { CommandRequestCard, getCommandRequestDisableReason } from "./CommandRequestCard";
import { getMobileMessageAuthorLabel, isNarratorMessage, isOutOfCharacterMessage } from "./messageAuthorLabel";
import { MessageAvatar } from "./MessageAvatar";
import { getMessagePreview } from "./mobileChatUtils";
import {
  ClueCard,
  DocCard,
  ForwardMessageCard,
  IntroTextCard,
  RoomJumpCard,
  shouldRenderMobileMessageTextPreview,
  StateEventCard,
  WebgalChooseCard,
} from "./MobileMessageCards";

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
    alignItems: "flex-start",
    borderColor: "rgba(150, 150, 150, 0.2)",
    borderRadius: Radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  narratorAvatar: {
    alignItems: "center",
    backgroundColor: "#6366f1",
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    justifyContent: "center",
    width: AVATAR_SIZE,
  },
  narratorAvatarText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
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
  diceCommand: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  diceLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  diceReply: {
    gap: 2,
  },
  diceReplyList: {
    borderLeftWidth: 2,
    gap: Spacing.sm,
    paddingLeft: Spacing.md,
  },
  diceTurn: {
    gap: Spacing.sm,
  },
});

function getDisplayRoleName(message: Message, roomRolesById: RoomRolesById): string {
  return getMobileMessageAuthorLabel(message, roomRolesById, { unknownRoleLabel: "未选择角色" });
}

function getDiceDisplayText(message: Message, canViewHiddenReply = false): string {
  if (getDiceTurnExtra(message.extra)) {
    return getDiceTurnRenderData(message.extra, message.content ?? "", canViewHiddenReply).summary;
  }
  const result = getDiceResultExtra(message.extra)?.result;
  if (typeof result === "string" && result.trim())
    return result;
  return message.content?.trim() || "骰子结果";
}

function getDiceReplyDisplayName(
  reply: ReturnType<typeof getDiceTurnRenderData>["replies"][number],
  roomRolesById: RoomRolesById,
): string {
  if (reply.customRoleName)
    return reply.customRoleName;
  if (reply.roleId) {
    const roleName = roomRolesById.get(reply.roleId)?.roleName?.trim();
    return roleName || `角色 #${reply.roleId}`;
  }
  return "骰娘";
}

function getCompactMediaText(message: Message): string {
  if (message.messageType === MESSAGE_TYPE.SOUND) {
    const sound = getSoundMessageExtra(message.extra);
    return sound?.fileName?.trim() || message.content?.trim() || "音频消息";
  }
  return getMessagePreview(message);
}

type ChatMessageItemProps = {
  avatarUrl?: string | null;
  currentRoleId?: number;
  isCommandRequestConsumed?: (messageId: number) => boolean;
  isGrouped: boolean;
  isMultiSelected?: boolean;
  isSelectedAnchor: boolean;
  isSpaceOwner?: boolean;
  message: Message;
  multiSelectMode?: boolean;
  noRole?: boolean;
  onExecuteCommandRequest?: (payload: { command: string; messageId: number }) => void;
  onLongPress: (message: Message) => void;
  onToggleMultiSelect?: (message: Message) => void;
  replyAuthorName?: string | null;
  replyPreviewText?: string | null;
  roomRolesById: RoomRolesById;
};

export const ChatMessageItem = memo(({
  avatarUrl,
  currentRoleId = 0,
  isCommandRequestConsumed,
  isGrouped,
  isMultiSelected,
  isSelectedAnchor,
  isSpaceOwner = false,
  message,
  multiSelectMode,
  noRole = false,
  onExecuteCommandRequest,
  onLongPress,
  onToggleMultiSelect,
  replyAuthorName,
  replyPreviewText,
  roomRolesById,
}: ChatMessageItemProps) => {
  const theme = useTheme();
  const isOOC = isOutOfCharacterMessage(message);
  const narrator = isNarratorMessage(message);
  const isStateEvent = message.messageType === MESSAGE_TYPE.STATE_EVENT;
  const usesSystemRow = narrator || isStateEvent;
  const displayName = getDisplayRoleName(message, roomRolesById);
  const shouldRenderTextPreview = shouldRenderMobileMessageTextPreview(message.messageType);
  const canViewHiddenDiceReply = isSpaceOwner || (currentRoleId > 0 && currentRoleId === message.roleId);
  const renderDiceTurnContent = (numberOfLines?: number) => {
    const diceTurn = getDiceTurnExtra(message.extra);
    if (!diceTurn) {
      return (
        <TextEnhanceRenderer
          content={getDiceDisplayText(message, canViewHiddenDiceReply)}
          style={[
            styles.content,
            { color: usesSystemRow ? theme.textSecondary : isOOC ? theme.textSecondary : theme.text },
            isOOC && { fontStyle: "italic" },
          ]}
          numberOfLines={numberOfLines}
        />
      );
    }

    const diceTurnData = getDiceTurnRenderData(message.extra, message.content ?? "", canViewHiddenDiceReply);
    return (
      <View style={styles.diceTurn}>
        {diceTurnData.command
          ? (
              <View style={[styles.diceCommand, { backgroundColor: theme.accentMuted }]}>
                <ThemedText style={[styles.diceLabel, { color: theme.textSecondary }]}>指令</ThemedText>
                <TextEnhanceRenderer
                  content={diceTurnData.command}
                  style={[styles.content, { color: theme.text }]}
                  numberOfLines={numberOfLines}
                />
              </View>
            )
          : null}
        <View style={[styles.diceReplyList, { borderLeftColor: theme.accent }]}>
          {diceTurnData.replies.length > 0
            ? diceTurnData.replies.map((reply, index) => (
                <View key={`${reply.roleId ?? "dicer"}:${index}`} style={styles.diceReply}>
                  <ThemedText style={[styles.diceLabel, { color: theme.textSecondary }]}>
                    {getDiceReplyDisplayName(reply, roomRolesById)}
                    {reply.hidden ? " · 暗骰" : ""}
                  </ThemedText>
                  <TextEnhanceRenderer
                    content={reply.content || "骰子结果"}
                    style={[
                      styles.content,
                      { color: reply.hidden && !canViewHiddenDiceReply ? theme.textSecondary : theme.text },
                      reply.hidden && !canViewHiddenDiceReply && { fontStyle: "italic" },
                    ]}
                    numberOfLines={numberOfLines}
                  />
                </View>
              ))
            : (
                <ThemedText style={[styles.content, { color: theme.textSecondary }]}>骰子结果</ThemedText>
              )}
        </View>
      </View>
    );
  };
  const shouldRenderAvatar = !isGrouped && !isStateEvent;
  const messageRowStyle = isStateEvent
    ? styles.rowNarrator
    : isOOC
      ? styles.rowOOC
      : isGrouped ? styles.rowGrouped : styles.row;

  const renderAvatar = () => {
    if (narrator) {
      return (
        <View style={styles.narratorAvatar}>
          <ThemedText style={styles.narratorAvatarText}>旁</ThemedText>
        </View>
      );
    }
    return (
      <MessageAvatar
        avatarFileId={message.avatarFileId}
        avatarId={message.avatarId}
        avatarUrl={avatarUrl}
        displayName={displayName}
        preferUserAvatar={isOOC}
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
              messageRowStyle,
              shouldRenderAvatar && styles.rowFull,
              isOOC && { backgroundColor: "rgba(150, 150, 150, 0.05)" },
            ]}
          >
            {shouldRenderAvatar ? renderAvatar() : null}
            <View style={styles.body}>
              {message.messageType === MESSAGE_TYPE.IMG
                ? (() => {
                    const img = getImageMessageExtra(message.extra);
                    const thumbUri = resolveMessageMediaUrl(img, "medium", "image");
                    return thumbUri
                      ? <CachedImage uri={thumbUri} style={{ borderRadius: Radius.sm, height: 40, width: 40 }} />
                      : <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>[图片]</ThemedText>;
                  })()
                : message.messageType === MESSAGE_TYPE.VIDEO
                  ? <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>[视频]</ThemedText>
                  : message.messageType === MESSAGE_TYPE.SOUND
                    ? <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>{getCompactMediaText(message)}</ThemedText>
                    : message.messageType === MESSAGE_TYPE.DICE
                      ? renderDiceTurnContent(2)
                      : (
                          <TextEnhanceRenderer
                            content={getMessagePreview(message)}
                            style={[
                              styles.content,
                              { color: usesSystemRow ? theme.textSecondary : theme.text },
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
    >
      <View
        style={[
          messageRowStyle,
          shouldRenderAvatar && styles.rowFull,
          isSelectedAnchor && styles.rowHighlight,
          isSelectedAnchor && { backgroundColor: theme.accentMuted },
          isOOC && { backgroundColor: "rgba(150, 150, 150, 0.05)" },
        ]}
      >
        {shouldRenderAvatar ? renderAvatar() : null}
        <View style={styles.body}>
          {!isGrouped && !isStateEvent
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
          {shouldRenderTextPreview
            ? message.messageType === MESSAGE_TYPE.DICE
              ? renderDiceTurnContent()
              : (
                  <TextEnhanceRenderer
                    content={getMessagePreview(message)}
                    style={[
                      styles.content,
                      { color: usesSystemRow ? theme.textSecondary : isOOC ? theme.textSecondary : theme.text },
                      isOOC && { fontStyle: "italic" },
                    ]}
                  />
                )
            : null}
          {message.messageType === MESSAGE_TYPE.INTRO_TEXT
            ? <IntroTextCard content={message.content} />
            : null}
          <MobileMessageMediaPreview
            content={message.content}
            deferPlayableMedia
            extra={message.extra}
            messageType={message.messageType}
          />
          {message.messageType === MESSAGE_TYPE.FORWARD
            ? (
                <ForwardMessageCard extra={message.extra} />
              )
            : null}
          {message.messageType === MESSAGE_TYPE.STATE_EVENT
            ? <StateEventCard message={message} roomRolesById={roomRolesById} />
            : null}
          {message.messageType === MESSAGE_TYPE.WEBGAL_CHOOSE
            ? <WebgalChooseCard content={message.content} extra={message.extra} />
            : null}
          {message.messageType === MESSAGE_TYPE.DOC_CARD
            ? <DocCard content={message.content} extra={message.extra} />
            : null}
          {message.messageType === MESSAGE_TYPE.CLUE_CARD
            ? <ClueCard content={message.content} extra={message.extra} />
            : null}
          {message.messageType === MESSAGE_TYPE.ROOM_JUMP
            ? <RoomJumpCard content={message.content} extra={message.extra} />
            : null}
          {message.messageType === MESSAGE_TYPE.COMMAND_REQUEST && onExecuteCommandRequest
            ? (() => {
                const extra = message.extra as { commandRequest?: { command?: string; allowAll?: boolean; allowedRoleIds?: number[] } } | undefined;
                const cr = extra?.commandRequest;
                const command = cr?.command ?? message.content?.trim() ?? "";
                const allowedRoleIds = cr?.allowedRoleIds;
                const isConsumed = isCommandRequestConsumed?.(message.messageId!) ?? false;
                const disableReason = getCommandRequestDisableReason({
                  command,
                  isConsumed,
                  isSpaceOwner,
                  noRole,
                  currentRoleId,
                  allowedRoleIds,
                });
                return (
                  <CommandRequestCard
                    command={command}
                    disableReason={disableReason}
                    isAllowAll={cr?.allowAll ?? false}
                    isConsumed={isConsumed}
                    messageId={message.messageId!}
                    onExecute={onExecuteCommandRequest}
                  />
                );
              })()
            : null}
        </View>
      </View>
    </Pressable>
  );
});
