import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientMetadataBatchQueryKey, loadClientMetadataBatch, seedClientMetadataCaches } from "@tuanchat/query/metadata";
import { getRoomMessageLocalRenderKey, isOptimisticRoomMessage } from "@tuanchat/query/room-message-lifecycle";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  InteractionManager,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { avatarThumbUrl } from "@/lib/media-url";
import { prefetchImages } from "@/lib/mobile-image-cache";

import type { MessageActionMenuAnchor } from "./messageActionMenuLayout";
import type { MessageDropPlacement } from "./messageDragDrop";
import type { ChatMessageListItem } from "./messageListModel";

import { collectChatAvatarThumbUrls, collectChatImageThumbUrls, selectChatMessagePrefetchWindow } from "./chat-avatar-prefetch";
import { buildDeferredChatMetadataRequest, isMessageAvatarCoveredByMetadataRequest } from "./chat-avatar-resolution";
import { buildRoomRolesById, resolveMessageAvatarFileId, resolveMessageAvatarId } from "./chat-avatar-utils";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatNewMessagesPill } from "./ChatNewMessagesPill";
import { getMobileMessageAuthorLabel, isOutOfCharacterMessage } from "./messageAuthorLabel";
import { resolveMessageDropTarget } from "./messageDragDrop";
import {
  buildChatMessageListModel,
  getMessageListItemKey,
  getVisibleMessageListSignature,
  getReplyPreviewText,
} from "./messageListModel";
import { resolveBottomThresholdTransition, resolveVisibleMessageAppendAction, shouldAutoScrollOnContentSizeChange } from "./messageListScrollState";
import { shouldGroupWithPrevious } from "./mobileMessageGrouping";

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingVertical: Spacing.md,
  },
  draggingRow: {
    opacity: 0.72,
  },
  dropMarker: {
    borderRadius: 999,
    height: 3,
    marginHorizontal: Spacing.xxl,
  },
  stateBlock: {
    alignItems: "center",
    gap: Spacing.lg,
    justifyContent: "center",
    paddingVertical: Spacing.huge,
  },
});

const MESSAGE_LIST_MAINTAIN_VISIBLE_POSITION = { minIndexForVisible: 0 };
const MESSAGE_INITIAL_RENDER_COUNT = 10;
const MESSAGE_RENDER_BATCH_SIZE = 8;
const MESSAGE_SCROLL_TO_BOTTOM_ANIMATION_DISTANCE = 600;
const MESSAGE_WINDOW_SIZE = 7;
function getReplyAuthorName(msg: Message, roomRolesById: ReadonlyMap<number, UserRole>): string {
  return getMobileMessageAuthorLabel(msg, roomRolesById, {
    unknownRoleLabel: typeof msg.userId === "number" && msg.userId > 0 ? `用户 #${msg.userId}` : "未知角色",
  });
}

function resolveChatMessageAvatarUrl(
  message: Message,
  roomRolesById: ReadonlyMap<number, UserRole>,
  roleAvatarFileIdByAvatarId: ReadonlyMap<number, number>,
  userAvatarFileIdByUserId: ReadonlyMap<number, number>,
): string | null {
  if (isOutOfCharacterMessage(message) && typeof message.userId === "number" && message.userId > 0) {
    const userAvatarFileId = userAvatarFileIdByUserId.get(message.userId);
    return userAvatarFileId != null ? avatarThumbUrl(userAvatarFileId) : null;
  }

  const directAvatarFileId = resolveMessageAvatarFileId(message, roomRolesById);
  if (directAvatarFileId != null) {
    return avatarThumbUrl(directAvatarFileId);
  }

  const avatarId = resolveMessageAvatarId(message, roomRolesById);
  if (avatarId != null) {
    const resolvedRoleAvatarFileId = roleAvatarFileIdByAvatarId.get(avatarId);
    if (resolvedRoleAvatarFileId != null) {
      return avatarThumbUrl(resolvedRoleAvatarFileId);
    }
  }

  return null;
}

type ChatMessageListProps = {
  allowDeferredMetadataQueries?: boolean;
  currentRoleId?: number;
  error: unknown;
  isCommandRequestConsumed?: (messageId: number) => boolean;
  isError: boolean;
  isPending: boolean;
  isSpaceOwner?: boolean;
  messages: ChatMessageListItem[];
  multiSelectMode?: boolean;
  multiSelectedIds?: Set<number>;
  noRole?: boolean;
  onExecuteCommandRequest?: (payload: { command: string; messageId: number }) => void;
  onDropMessage?: (payload: { message: Message; placement: MessageDropPlacement; targetMessage: Message }) => void;
  onLongPressMessage: (payload: { anchor: MessageActionMenuAnchor; message: Message }) => void;
  onPokeAvatar?: (message: Message) => void;
  onRetry?: () => void;
  onToggleMultiSelect?: (message: Message) => void;
  roomRoles: UserRole[];
  roomMembers?: Array<{
    avatarFileId?: number;
    userId?: number;
  }>;
  selectedAnchorId: number | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim())
    return error.message.trim();
  return fallback;
}

function getOptimisticMessageRenderKeys(messages: readonly ChatMessageListItem[]): Set<string> {
  const keys = new Set<string>();
  for (const item of messages) {
    if (!isOptimisticRoomMessage(item.message)) {
      continue;
    }

    const renderKey = getRoomMessageLocalRenderKey(item.message);
    if (renderKey) {
      keys.add(renderKey);
      continue;
    }

    const messageId = item.message.messageId;
    if (typeof messageId === "number" && Number.isFinite(messageId)) {
      keys.add(`message:${messageId}`);
    }
  }
  return keys;
}

function ChatMessageListInner({
  allowDeferredMetadataQueries = true,
  currentRoleId,
  error,
  isCommandRequestConsumed,
  isError,
  isPending,
  isSpaceOwner,
  messages,
  multiSelectMode,
  multiSelectedIds,
  noRole,
  onExecuteCommandRequest,
  onDropMessage,
  onLongPressMessage,
  onPokeAvatar,
  onRetry,
  onToggleMultiSelect,
  roomMembers = [],
  roomRoles,
  selectedAnchorId,
}: ChatMessageListProps) {
  const theme = useTheme();
  const flatListRef = useRef<FlatList<ChatMessageListItem>>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const currentScrollOffsetYRef = useRef(0);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const pendingScrollToBottomRef = useRef(false);
  const didAnchorInitialMessagesRef = useRef(false);
  const didInitializeMessageTrackingRef = useRef(false);
  const scrollToBottomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollToBottomTaskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  const rowLayoutsRef = useRef(new Map<number, { height: number; pageY: number }>());
  const rowRefsRef = useRef(new Map<number, View>());
  const rowMeasureVersionRef = useRef(0);
  const draggingMessageIdRef = useRef<number | null>(null);
  const latestDragPageYRef = useRef(0);
  const dragTranslationY = useRef(new Animated.Value(0)).current;
  const [draggingMessageId, setDraggingMessageId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ messageId: number; placement: MessageDropPlacement } | null>(null);
  const roomRolesById = useMemo(() => buildRoomRolesById(roomRoles), [roomRoles]);
  const messageListModel = useMemo(
    () => buildChatMessageListModel(messages),
    [messages],
  );
  const prevLengthRef = useRef(messageListModel.visibleMessages.length);
  const prevOptimisticMessageRenderKeysRef = useRef<Set<string>>(getOptimisticMessageRenderKeys(messageListModel.visibleMessages));
  const visibleMessageSignature = useMemo(
    () => getVisibleMessageListSignature(messageListModel.visibleMessages),
    [messageListModel.visibleMessages],
  );

  const prefetchCandidateMessages = useMemo(
    () => selectChatMessagePrefetchWindow(messageListModel.visibleChatMessages),
    [messageListModel.visibleChatMessages],
  );

  const roomMemberAvatarFileIdByUserId = useMemo(() => {
    const map = new Map<number, number>();
    roomMembers.forEach((member) => {
      const userId = member.userId;
      const avatarFileId = member.avatarFileId;
      if (typeof userId === "number" && userId > 0 && typeof avatarFileId === "number" && avatarFileId > 0) {
        map.set(userId, avatarFileId);
      }
    });
    return map;
  }, [roomMembers]);
  const knownOocAvatarUserIds = useMemo(
    () => new Set(roomMemberAvatarFileIdByUserId.keys()),
    [roomMemberAvatarFileIdByUserId],
  );
  const metadataRequest = useMemo(
    () => buildDeferredChatMetadataRequest(prefetchCandidateMessages, roomRolesById, knownOocAvatarUserIds),
    [knownOocAvatarUserIds, prefetchCandidateMessages, roomRolesById],
  );
  const roleAvatarIds = metadataRequest.avatarIds;
  const oocUserIds = metadataRequest.userIds;
  const metadataAvatarIdSet = useMemo(() => new Set(roleAvatarIds), [roleAvatarIds]);
  const metadataUserIdSet = useMemo(() => new Set(oocUserIds), [oocUserIds]);
  const queryClient = useQueryClient();
  const metadataQuery = useQuery({
    enabled: allowDeferredMetadataQueries && (roleAvatarIds.length > 0 || oocUserIds.length > 0),
    queryFn: () => loadClientMetadataBatch(mobileApiClient, metadataRequest),
    queryKey: clientMetadataBatchQueryKey(metadataRequest, mobileApiClient),
    staleTime: 600_000,
  });
  useEffect(() => {
    if (metadataQuery.data) {
      seedClientMetadataCaches(queryClient, metadataQuery.data);
    }
  }, [metadataQuery.data, queryClient]);
  const roleAvatarFileIdByAvatarId = useMemo(() => {
    const map = new Map<number, number>();
    Object.values(metadataQuery.data?.avatars ?? {}).forEach((avatar) => {
      if (avatar.avatarId && avatar.avatarFileId) {
        map.set(avatar.avatarId, avatar.avatarFileId);
      }
    });
    return map;
  }, [metadataQuery.data?.avatars]);
  const userAvatarFileIdByUserId = useMemo(() => {
    const map = new Map(roomMemberAvatarFileIdByUserId);
    Object.values(metadataQuery.data?.users ?? {}).forEach((user) => {
      if (user.userId && user.avatarFileId) {
        map.set(user.userId, user.avatarFileId);
      }
    });
    return map;
  }, [metadataQuery.data?.users, roomMemberAvatarFileIdByUserId]);

  const avatarThumbUrls = useMemo(
    () => collectChatAvatarThumbUrls(prefetchCandidateMessages, roomRolesById),
    [prefetchCandidateMessages, roomRolesById],
  );
  const messageImageThumbUrls = useMemo(
    () => collectChatImageThumbUrls(prefetchCandidateMessages),
    [prefetchCandidateMessages],
  );
  const prefetchUrls = useMemo(
    () => [...avatarThumbUrls, ...messageImageThumbUrls],
    [avatarThumbUrls, messageImageThumbUrls],
  );

  const cancelScheduledScrollToBottom = useCallback(() => {
    if (scrollToBottomTimerRef.current) {
      clearTimeout(scrollToBottomTimerRef.current);
      scrollToBottomTimerRef.current = null;
    }
    if (scrollToBottomTaskRef.current) {
      scrollToBottomTaskRef.current.cancel();
      scrollToBottomTaskRef.current = null;
    }
  }, []);

  const commitBottomState = useCallback((nextIsAtBottom: boolean) => {
    if (isAtBottomRef.current === nextIsAtBottom) {
      return;
    }

    isAtBottomRef.current = nextIsAtBottom;
    setIsAtBottom(nextIsAtBottom);
    if (nextIsAtBottom) {
      pendingScrollToBottomRef.current = false;
      setNewMessageCount(0);
    }
  }, []);

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    currentScrollOffsetYRef.current = offsetY;
    rowMeasureVersionRef.current += 1;
    rowLayoutsRef.current.clear();
    const transition = resolveBottomThresholdTransition(isAtBottomRef.current, offsetY);
    if (transition.changed) {
      commitBottomState(transition.isAtBottom);
    }
  }, [commitBottomState]);

  const handleScrollBeginDrag = useCallback(() => {
    pendingScrollToBottomRef.current = false;
    cancelScheduledScrollToBottom();
  }, [cancelScheduledScrollToBottom]);

  const scheduleScrollToBottom = useCallback((animated: boolean) => {
    pendingScrollToBottomRef.current = true;
    cancelScheduledScrollToBottom();
    scrollToBottomTaskRef.current = InteractionManager.runAfterInteractions(() => {
      scrollToBottomTaskRef.current = null;
      scrollToBottomTimerRef.current = setTimeout(() => {
        scrollToBottomTimerRef.current = null;
        flatListRef.current?.scrollToOffset({ offset: 0, animated });
        pendingScrollToBottomRef.current = false;
        isAtBottomRef.current = true;
        setIsAtBottom(true);
        setNewMessageCount(0);
      }, 30);
    });
  }, [cancelScheduledScrollToBottom]);

  const handleContentSizeChange = useCallback(() => {
    if (!shouldAutoScrollOnContentSizeChange({
      hasPendingScrollToBottom: pendingScrollToBottomRef.current,
      isAtBottom: isAtBottomRef.current,
    })) {
      return;
    }

    scheduleScrollToBottom(false);
  }, [scheduleScrollToBottom]);

  useEffect(() => {
    return () => {
      cancelScheduledScrollToBottom();
      rowMeasureVersionRef.current += 1;
    };
  }, [cancelScheduledScrollToBottom]);

  useEffect(() => {
    if (didAnchorInitialMessagesRef.current || isPending || messageListModel.visibleMessages.length === 0) {
      return;
    }

    didAnchorInitialMessagesRef.current = true;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setNewMessageCount(0);
    scheduleScrollToBottom(false);
  }, [isPending, messageListModel.visibleMessages.length, scheduleScrollToBottom]);

  useEffect(() => {
    const visibleMessages = messageListModel.visibleMessages;
    const optimisticMessageRenderKeys = getOptimisticMessageRenderKeys(visibleMessages);
    if (!didInitializeMessageTrackingRef.current) {
      if (isPending) {
        return;
      }

      didInitializeMessageTrackingRef.current = true;
      prevLengthRef.current = visibleMessages.length;
      prevOptimisticMessageRenderKeysRef.current = optimisticMessageRenderKeys;
      return;
    }

    const previousLength = prevLengthRef.current;
    const hasNewOptimisticMessage = [...optimisticMessageRenderKeys]
      .some(key => !prevOptimisticMessageRenderKeysRef.current.has(key));
    const appendAction = resolveVisibleMessageAppendAction({
      isAtBottom: isAtBottomRef.current,
      nextLength: visibleMessages.length,
      previousLength,
      shouldForceScrollToBottom: hasNewOptimisticMessage,
    });
    if (appendAction.shouldCountNewMessages) {
      setNewMessageCount(count => count + appendAction.addedCount);
    }
    if (appendAction.shouldScrollToBottom) {
      scheduleScrollToBottom(!isAtBottomRef.current && hasNewOptimisticMessage);
    }
    prevLengthRef.current = visibleMessages.length;
    prevOptimisticMessageRenderKeysRef.current = optimisticMessageRenderKeys;
  }, [isPending, messageListModel.visibleMessages, scheduleScrollToBottom, visibleMessageSignature]);

  useEffect(() => {
    if (prefetchUrls.length === 0)
      return;
    void prefetchImages(prefetchUrls);
  }, [prefetchUrls]);

  const scrollToBottom = useCallback(() => {
    pendingScrollToBottomRef.current = true;
    cancelScheduledScrollToBottom();
    const shouldAnimate = currentScrollOffsetYRef.current <= MESSAGE_SCROLL_TO_BOTTOM_ANIMATION_DISTANCE;
    flatListRef.current?.scrollToOffset({ offset: 0, animated: shouldAnimate });
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setNewMessageCount(0);
  }, [cancelScheduledScrollToBottom]);

  const measureMountedRowLayouts = useCallback((onComplete: () => void) => {
    const entries = [...rowRefsRef.current.entries()];
    const measureVersion = rowMeasureVersionRef.current + 1;
    rowMeasureVersionRef.current = measureVersion;
    if (entries.length === 0) {
      rowLayoutsRef.current.clear();
      onComplete();
      return;
    }

    const measuredLayouts = new Map<number, { height: number; pageY: number }>();
    let remaining = entries.length;
    const completeMeasurement = () => {
      remaining -= 1;
      if (remaining === 0 && rowMeasureVersionRef.current === measureVersion) {
        rowLayoutsRef.current = measuredLayouts;
        onComplete();
      }
    };

    entries.forEach(([messageId, rowRef]) => {
      rowRef.measureInWindow((_x, pageY, _width, height) => {
        if (height > 0) {
          measuredLayouts.set(messageId, { height, pageY });
        }
        completeMeasurement();
      });
    });
  }, []);

  const resolveDropTargetMessage = useCallback((pageY: number, draggingId: number) => {
    return resolveMessageDropTarget({
      candidates: messageListModel.visibleMessages.flatMap((candidate) => {
        const messageId = candidate.message.messageId;
        const layout = typeof messageId === "number" ? rowLayoutsRef.current.get(messageId) : undefined;
        return layout ? [{ ...layout, message: candidate.message }] : [];
      }),
      draggingMessageId: draggingId,
      pointerPageY: pageY,
    });
  }, [messageListModel.visibleMessages]);

  const updateDropTarget = useCallback((pageY: number, draggingId: number) => {
    const target = resolveDropTargetMessage(pageY, draggingId);
    const targetMessageId = target?.message.messageId;
    setDropTarget(target && typeof targetMessageId === "number"
      ? { messageId: targetMessageId, placement: target.placement }
      : null);
  }, [resolveDropTargetMessage]);

  const handleDragMessage = useCallback(({ message, pageY, translationY }: { message: Message; pageY: number; translationY: number }) => {
    const messageId = message.messageId;
    if (typeof messageId !== "number") {
      return;
    }
    latestDragPageYRef.current = pageY;
    dragTranslationY.setValue(translationY);
    if (draggingMessageIdRef.current !== messageId) {
      draggingMessageIdRef.current = messageId;
      setDraggingMessageId(messageId);
      setDropTarget(null);
      measureMountedRowLayouts(() => {
        if (draggingMessageIdRef.current === messageId) {
          updateDropTarget(latestDragPageYRef.current, messageId);
        }
      });
      return;
    }
    updateDropTarget(pageY, messageId);
  }, [dragTranslationY, measureMountedRowLayouts, updateDropTarget]);

  const handleDropMessage = useCallback(({ message, pageY }: { message: Message; pageY: number }) => {
    const messageId = message.messageId;
    if (typeof messageId !== "number") {
      draggingMessageIdRef.current = null;
      setDraggingMessageId(null);
      dragTranslationY.setValue(0);
      setDropTarget(null);
      return;
    }
    measureMountedRowLayouts(() => {
      const target = resolveDropTargetMessage(pageY, messageId);
      draggingMessageIdRef.current = null;
      setDraggingMessageId(null);
      dragTranslationY.setValue(0);
      setDropTarget(null);
      if (target) {
        onDropMessage?.({ message, placement: target.placement, targetMessage: target.message });
      }
    });
  }, [dragTranslationY, measureMountedRowLayouts, onDropMessage, resolveDropTargetMessage]);

  const handleCancelDragMessage = useCallback(() => {
    rowMeasureVersionRef.current += 1;
    draggingMessageIdRef.current = null;
    setDraggingMessageId(null);
    dragTranslationY.setValue(0);
    setDropTarget(null);
  }, [dragTranslationY]);

  const handleLongPressMessage = useCallback(({ message, pageX, pageY }: { message: Message; pageX: number; pageY: number }) => {
    const messageId = message.messageId;
    const rowRef = typeof messageId === "number" ? rowRefsRef.current.get(messageId) : undefined;
    if (!rowRef) {
      onLongPressMessage({ anchor: { bottom: pageY, top: pageY, x: pageX }, message });
      return;
    }

    rowRef.measureInWindow((rowX, rowY, width, height) => {
      onLongPressMessage({
        anchor: {
          bottom: rowY + height,
          top: rowY,
          x: Number.isFinite(pageX) && pageX > 0 ? pageX : rowX + width / 2,
        },
        message,
      });
    });
  }, [onLongPressMessage]);

  const renderItem = useCallback(({ item, index }: { item: ChatMessageListItem; index: number }) => {
    const nextItem = messageListModel.invertedData[index + 1];
    const isGrouped = shouldGroupWithPrevious(item.message, nextItem?.message);
    const messageId = item.message.messageId;
    const isDragging = typeof messageId === "number" && draggingMessageId === messageId;
    const isDropTarget = typeof messageId === "number" && dropTarget?.messageId === messageId;
    const replyId = item.message.replyMessageId;
    const replyMsg = replyId ? messageListModel.messageMap.get(replyId) : undefined;
    const replyPreviewText = getReplyPreviewText(messageListModel.messageMap, replyId);
    const replyAuthorName = replyMsg ? getReplyAuthorName(replyMsg, roomRolesById) : null;
    const resolvedAvatarUrl = resolveChatMessageAvatarUrl(
      item.message,
      roomRolesById,
      roleAvatarFileIdByAvatarId,
      userAvatarFileIdByUserId,
    );
    const metadataBatchOwnsAvatar = isMessageAvatarCoveredByMetadataRequest(
      item.message,
      roomRolesById,
      metadataAvatarIdSet,
      metadataUserIdSet,
    );
    // 当前批次负责的头像等待聚合结果，窗口外消息保留单项缓存兜底。
    const avatarUrl = resolvedAvatarUrl
      ?? (metadataBatchOwnsAvatar && !metadataQuery.isError ? null : undefined);
    return (
      <View
        collapsable={false}
        ref={(row) => {
          if (typeof messageId !== "number") {
            return;
          }
          if (row) {
            rowRefsRef.current.set(messageId, row);
          }
          else {
            rowRefsRef.current.delete(messageId);
            rowLayoutsRef.current.delete(messageId);
          }
        }}
      >
        <Animated.View style={isDragging ? [styles.draggingRow, { transform: [{ translateY: dragTranslationY }] }] : undefined}>
          {isDropTarget && dropTarget.placement === "before" ? <View style={[styles.dropMarker, { backgroundColor: theme.accent }]} /> : null}
          <ChatMessageItem
            avatarUrl={avatarUrl}
            currentRoleId={currentRoleId}
            isCommandRequestConsumed={isCommandRequestConsumed}
            isGrouped={isGrouped}
            isMultiSelected={item.message.messageId != null && multiSelectedIds?.has(item.message.messageId)}
            isSelectedAnchor={selectedAnchorId === item.message.messageId}
            isSpaceOwner={isSpaceOwner}
            message={item.message}
            multiSelectMode={multiSelectMode}
            noRole={noRole}
            onCancelDragMessage={handleCancelDragMessage}
            onDragMessage={handleDragMessage}
            onDropMessage={handleDropMessage}
            onExecuteCommandRequest={onExecuteCommandRequest}
            onLongPress={handleLongPressMessage}
            onPokeAvatar={onPokeAvatar}
            onToggleMultiSelect={onToggleMultiSelect}
            replyAuthorName={replyAuthorName}
            replyPreviewText={replyPreviewText}
            roomRolesById={roomRolesById}
            shouldFetchMissingAvatar={allowDeferredMetadataQueries}
          />
          {isDropTarget && dropTarget.placement === "after" ? <View style={[styles.dropMarker, { backgroundColor: theme.accent }]} /> : null}
        </Animated.View>
      </View>
    );
  }, [allowDeferredMetadataQueries, currentRoleId, dragTranslationY, draggingMessageId, dropTarget, handleCancelDragMessage, handleDragMessage, handleDropMessage, handleLongPressMessage, isCommandRequestConsumed, isSpaceOwner, messageListModel.invertedData, messageListModel.messageMap, metadataAvatarIdSet, metadataQuery.isError, metadataUserIdSet, multiSelectMode, multiSelectedIds, noRole, onExecuteCommandRequest, onPokeAvatar, onToggleMultiSelect, roleAvatarFileIdByAvatarId, roomRolesById, selectedAnchorId, theme.accent, userAvatarFileIdByUserId]);

  const keyExtractor = useCallback((item: ChatMessageListItem, index: number) => getMessageListItemKey(item.message, index), []);

  if (isPending && messageListModel.visibleMessages.length === 0) {
    return (
      <View style={[styles.container, styles.stateBlock]}>
        <ActivityIndicator color={theme.accent} />
        <ThemedText themeColor="textSecondary">加载消息…</ThemedText>
      </View>
    );
  }

  if (isError && messageListModel.visibleMessages.length === 0) {
    return (
      <View style={[styles.container, styles.stateBlock]}>
        <ThemedText style={{ color: theme.danger, fontSize: 13 }}>
          {getErrorMessage(error, "加载消息失败。")}
        </ThemedText>
        {onRetry
          ? (
              <Pressable
                accessibilityHint="重新加载当前消息"
                accessibilityLabel="重试"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onRetry}
              >
                <ThemedText themeColor="accent" type="small">重试</ThemedText>
              </Pressable>
            )
          : null}
      </View>
    );
  }

  if (messageListModel.visibleMessages.length === 0) {
    return (
      <View style={[styles.container, styles.stateBlock]}>
        <ThemedText themeColor="textSecondary">发第一条消息开始对话</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messageListModel.invertedData}
        inverted
        keyboardDismissMode="interactive"
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        extraData={visibleMessageSignature}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        scrollEnabled={draggingMessageId === null}
        scrollEventThrottle={16}
        initialNumToRender={MESSAGE_INITIAL_RENDER_COUNT}
        maxToRenderPerBatch={MESSAGE_RENDER_BATCH_SIZE}
        maintainVisibleContentPosition={MESSAGE_LIST_MAINTAIN_VISIBLE_POSITION}
        // 倒置长聊天流里快速滚动时优先稳定，避免 Android 裁剪回收触发原生崩溃。
        removeClippedSubviews={false}
        updateCellsBatchingPeriod={80}
        windowSize={MESSAGE_WINDOW_SIZE}
      />
      <ChatNewMessagesPill
        count={newMessageCount}
        visible={!isAtBottom}
        onPress={scrollToBottom}
      />
    </View>
  );
}

export const ChatMessageList = memo(ChatMessageListInner);
