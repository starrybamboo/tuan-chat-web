import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { SharedValue } from "react-native-reanimated";

import { getDiceResultExtra, getDiceTurnExtra, getImageMessageExtra, getSoundMessageExtra } from "@tuanchat/domain/message-extra";
import { getDiceTurnRenderData } from "@tuanchat/domain/message-render-data";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { isSystemRowMessageType } from "@tuanchat/domain/poke-message";
import { isFailedRoomMessage, isOptimisticRoomMessage } from "@tuanchat/query/room-message-lifecycle";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, type GestureResponderEvent, Vibration, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { ArrowClockwise, Warning, XCircle } from "phosphor-react-native";

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
import { MOBILE_AVATAR_DOUBLE_TAP_WINDOW_MS, resolveMobileAvatarTap } from "./mobileAvatarTap";
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
  pokeCard: {
    alignSelf: "center",
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "88%",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  rowHighlight: {
    borderRadius: Radius.sm,
  },
  rowSending: {
    opacity: 0.88,
    transform: [{ translateY: 1 }, { scale: 0.995 }],
  },
  failedActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "flex-end",
    marginTop: Spacing.xs,
  },
  failedActionButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
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
  return getMobileMessageAuthorLabel(message, roomRolesById, {
    unknownRoleLabel: "未选择角色",
  });
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
  dragTranslationY?: SharedValue<number>;
  isCommandRequestConsumed?: (messageId: number) => boolean;
  isGrouped: boolean;
  isMultiSelected?: boolean;
  isSelectedAnchor: boolean;
  isSpaceOwner?: boolean;
  message: Message;
  multiSelectMode?: boolean;
  noRole?: boolean;
  onCancelDragMessage?: () => void;
  onExecuteCommandRequest?: (payload: { command: string; messageId: number }) => void;
  onDragMessage?: (payload: { message: Message; pageY: number }) => void;
  onDropMessage?: (payload: { message: Message; pageY: number }) => void;
  onLongPress: (payload: { message: Message; pageX: number; pageY: number }) => void;
  onOpenAvatarPicker?: () => void;
  onPokeAvatar?: (message: Message) => void;
  onPressReply?: (messageId: number) => void;
  onRemoveFailed?: (message: Message) => void;
  onRetryFailed?: (message: Message) => void;
  onToggleMultiSelect?: (message: Message) => void;
  replyAuthorName?: string | null;
  replyPreviewText?: string | null;
  roomRolesById: RoomRolesById;
};

export const ChatMessageItem = memo(({
  avatarUrl,
  currentRoleId = 0,
  dragTranslationY,
  isCommandRequestConsumed,
  isGrouped,
  isMultiSelected,
  isSelectedAnchor,
  isSpaceOwner = false,
  message,
  multiSelectMode,
  noRole = false,
  onCancelDragMessage,
  onExecuteCommandRequest,
  onDragMessage,
  onDropMessage,
  onLongPress,
  onOpenAvatarPicker,
  onPokeAvatar,
  onPressReply,
  onRemoveFailed,
  onRetryFailed,
  onToggleMultiSelect,
  replyAuthorName,
  replyPreviewText,
  roomRolesById,
}: ChatMessageItemProps) => {
  const theme = useTheme();
  const isOOC = isOutOfCharacterMessage(message);
  const narrator = isNarratorMessage(message);
  const usesSystemRow = narrator || isSystemRowMessageType(message.messageType);
  const isSending = isOptimisticRoomMessage(message);
  const isFailed = isFailedRoomMessage(message);
  const displayName = getDisplayRoleName(message, roomRolesById);
  const shouldRenderTextPreview = shouldRenderMobileMessageTextPreview(message.messageType);
  const canViewHiddenDiceReply = isSpaceOwner || (currentRoleId > 0 && currentRoleId === message.roleId);
  const handleReplyPress = useCallback(() => {
    if (typeof message.replyMessageId === "number") {
      onPressReply?.(message.replyMessageId);
    }
  }, [message.replyMessageId, onPressReply]);
  const longPressActiveRef = useRef(false);
  const hasDraggedAfterLongPressRef = useRef(false);
  const lastLongPressPointRef = useRef<{ pageX: number; pageY: number } | null>(null);
  const openLongPressMenu = useCallback(() => {
    const lastPoint = lastLongPressPointRef.current;
    if (!lastPoint) {
      return;
    }
    onLongPress({ message, pageX: lastPoint.pageX, pageY: lastPoint.pageY });
  }, [message, onLongPress]);
  const handleMessageGestureStart = useCallback((pageX: number, pageY: number) => {
    Vibration.vibrate(10);
    longPressActiveRef.current = true;
    hasDraggedAfterLongPressRef.current = false;
    lastLongPressPointRef.current = { pageX, pageY };
  }, []);
  const handleMessageGestureUpdate = useCallback((pageY: number, translationY: number) => {
    if (!longPressActiveRef.current || Math.abs(translationY) < 8) {
      return;
    }
    hasDraggedAfterLongPressRef.current = true;
    onDragMessage?.({ message, pageY });
  }, [message, onDragMessage]);
  const handleMessageGestureEnd = useCallback((pageY: number) => {
    const lastPoint = lastLongPressPointRef.current;
    longPressActiveRef.current = false;
    if (hasDraggedAfterLongPressRef.current) {
      onDropMessage?.({ message, pageY: pageY || lastPoint?.pageY || 0 });
    }
    else if (lastPoint) {
      openLongPressMenu();
    }
    hasDraggedAfterLongPressRef.current = false;
    lastLongPressPointRef.current = null;
  }, [message, onDropMessage, openLongPressMenu]);
  const handleMessageGestureCancel = useCallback(() => {
    if (longPressActiveRef.current) {
      longPressActiveRef.current = false;
      hasDraggedAfterLongPressRef.current = false;
      lastLongPressPointRef.current = null;
      onCancelDragMessage?.();
    }
  }, [onCancelDragMessage]);
  const messageGesture = useMemo(() => Gesture.Pan()
    .activateAfterLongPress(500)
    .onStart((event) => {
      scheduleOnRN(handleMessageGestureStart, event.absoluteX, event.absoluteY);
    })
    .onUpdate((event) => {
      if (Math.abs(event.translationY) >= 8) {
        dragTranslationY?.set(event.translationY);
      }
      scheduleOnRN(handleMessageGestureUpdate, event.absoluteY, event.translationY);
    })
    .onEnd((event) => {
      scheduleOnRN(handleMessageGestureEnd, event.absoluteY);
    })
    .onFinalize((_event, success) => {
      if (!success) {
        scheduleOnRN(handleMessageGestureCancel);
      }
    }), [dragTranslationY, handleMessageGestureCancel, handleMessageGestureEnd, handleMessageGestureStart, handleMessageGestureUpdate]);
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
  const shouldRenderAvatar = !isGrouped && !usesSystemRow;
  const messageRowStyle = usesSystemRow
    ? styles.rowNarrator
    : isOOC
      ? styles.rowOOC
      : isGrouped ? styles.rowGrouped : styles.row;

  const avatarTapRef = useRef<{ roleId: number; timestamp: number } | null>(null);
  const avatarSingleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (avatarSingleTapTimerRef.current) {
      clearTimeout(avatarSingleTapTimerRef.current);
    }
  }, []);
  const handleAvatarPress = useCallback(() => {
    const roleId = message.roleId ?? -1;
    if (!(roleId > 0) || !onOpenAvatarPicker || multiSelectMode) {
      return;
    }
    const tapResult = resolveMobileAvatarTap(avatarTapRef.current, roleId, Date.now());
    avatarTapRef.current = tapResult.next;
    if (tapResult.matchedDoubleTap) {
      if (avatarSingleTapTimerRef.current) {
        clearTimeout(avatarSingleTapTimerRef.current);
        avatarSingleTapTimerRef.current = null;
      }
      Vibration.vibrate(10);
      onPokeAvatar?.(message);
      return;
    }
    if (avatarSingleTapTimerRef.current) {
      clearTimeout(avatarSingleTapTimerRef.current);
    }
    avatarSingleTapTimerRef.current = setTimeout(() => {
      avatarSingleTapTimerRef.current = null;
      onOpenAvatarPicker();
    }, MOBILE_AVATAR_DOUBLE_TAP_WINDOW_MS);
  }, [message, multiSelectMode, onOpenAvatarPicker, onPokeAvatar]);
  const handleAvatarLongPress = useCallback((event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    Vibration.vibrate(10);
    onLongPress({ message, pageX, pageY });
  }, [message, onLongPress]);

  const avatar = (
    <MessageAvatar
      avatarFileId={message.avatarFileId}
      avatarUrl={avatarUrl}
      displayName={displayName}
      preferUserAvatar={isOOC}
      roleId={message.roleId}
      roomRolesById={roomRolesById}
      size={AVATAR_SIZE}
      userId={message.userId}
    />
  );
  const renderAvatar = () => {
    if (!onOpenAvatarPicker || !(message.roleId && message.roleId > 0) || multiSelectMode) {
      return avatar;
    }
    return (
      <Pressable
        accessibilityLabel="选择发言头像"
        accessibilityRole="button"
        delayLongPress={500}
        onLongPress={handleAvatarLongPress}
        onPress={handleAvatarPress}
      >
        {avatar}
      </Pressable>
    );
  };

  if (multiSelectMode) {
    return (
      <Pressable
        onPress={() => onToggleMultiSelect?.(message)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isMultiSelected }}
        accessibilityLabel={`${displayName}：${getMessagePreview(message)}`}
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
              isSending && styles.rowSending,
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
                      : message.messageType === MESSAGE_TYPE.POKE
                        ? (
                            <View style={[styles.pokeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                              <TextEnhanceRenderer
                                content={message.content ?? ""}
                                numberOfLines={2}
                                style={[styles.content, { color: theme.textSecondary, textAlign: "center" }]}
                              />
                            </View>
                          )
                      : (
                          <TextEnhanceRenderer
                            content={message.messageType === MESSAGE_TYPE.POKE ? message.content ?? "" : getMessagePreview(message)}
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
    <GestureDetector gesture={messageGesture}>
      <View
        collapsable={false}
        accessibilityActions={[{ label: "打开消息操作", name: "activate" }]}
        accessibilityLabel={`${displayName}：${getMessagePreview(message)}${replyPreviewText ? `，回复${replyAuthorName ? ` ${replyAuthorName}` : ""}：${replyPreviewText}` : ""}`}
        accessibilityHint="长按打开消息操作；长按后上下拖动可调整消息顺序"
        accessibilityRole="button"
        onAccessibilityAction={() => onLongPress({ message, pageX: 0, pageY: 0 })}
      >
        <View
          style={[
            messageRowStyle,
            shouldRenderAvatar && styles.rowFull,
            isSending && styles.rowSending,
            isSelectedAnchor && styles.rowHighlight,
            isSelectedAnchor && { backgroundColor: theme.accentMuted },
            isOOC && { backgroundColor: "rgba(150, 150, 150, 0.05)" },
          ]}
        >
          {shouldRenderAvatar ? renderAvatar() : null}
          <View style={styles.body}>
          {!isGrouped && !usesSystemRow
            ? (
                <View style={styles.authorRow}>
                  {displayName
                    ? (
                        <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                          {displayName}
                        </ThemedText>
                      )
                    : null}
                </View>
              )
            : null}
          {replyPreviewText
            ? (
                <Pressable
                  accessibilityHint="跳转到被回复的消息"
                  accessibilityLabel={`回复 ${replyAuthorName ?? "未知成员"}：${replyPreviewText}`}
                  accessibilityRole="button"
                  onPress={handleReplyPress}
                  style={[styles.replyPreview, { borderLeftColor: theme.accent, backgroundColor: theme.accentMuted }]}
                >
                  <ThemedText style={{ fontSize: 12, color: theme.textSecondary }} numberOfLines={1}>
                    回复
                    {" "}
                    {replyAuthorName ?? ""}
                    :
                    {" "}
                    {replyPreviewText}
                  </ThemedText>
                </Pressable>
              )
            : null}
          {shouldRenderTextPreview
            ? message.messageType === MESSAGE_TYPE.DICE
              ? renderDiceTurnContent()
              : message.messageType === MESSAGE_TYPE.POKE
                ? (
                    <View style={[styles.pokeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                      <TextEnhanceRenderer
                        content={message.content ?? ""}
                        style={[styles.content, { color: theme.textSecondary, textAlign: "center" }]}
                      />
                    </View>
                  )
              : (
                  <TextEnhanceRenderer
                    content={message.messageType === MESSAGE_TYPE.POKE ? message.content ?? "" : getMessagePreview(message)}
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
          {isFailed
            ? (
                <View style={styles.failedActions}>
                  <Warning size={12} color={theme.danger} weight="fill" />
                  <ThemedText style={{ color: theme.danger, fontSize: 11, fontWeight: "600" }}>发送失败</ThemedText>
                  <Pressable
                    accessibilityLabel="重新发送失败消息"
                    accessibilityRole="button"
                    hitSlop={6}
                    onPress={() => onRetryFailed?.(message)}
                    style={styles.failedActionButton}
                  >
                    <ArrowClockwise size={13} color={theme.danger} weight="bold" />
                    <ThemedText style={{ color: theme.danger, fontSize: 11 }}>重试</ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="删除失败消息"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => onRemoveFailed?.(message)}
                    style={styles.failedActionButton}
                  >
                    <XCircle size={13} color={theme.textSecondary} weight="fill" />
                  </Pressable>
                </View>
              )
            : null}
          </View>
        </View>
      </View>
    </GestureDetector>
  );
});
