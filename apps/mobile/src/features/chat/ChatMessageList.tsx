import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useQueries } from "@tanstack/react-query";
import { getRoomMessageLocalRenderKey, isOptimisticRoomMessage } from "@tuanchat/query/room-message-lifecycle";
import { getUserInfoQueryKey, USER_INFO_STALE_TIME_MS } from "@tuanchat/query/users";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import type { ChatMessageListItem } from "./messageListModel";

import { collectChatAvatarThumbUrls, collectChatImageThumbUrls, selectChatMessagePrefetchWindow } from "./chat-avatar-prefetch";
import { buildRoomRolesById, resolveMessageAvatarFileId, resolveMessageAvatarId } from "./chat-avatar-utils";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatNewMessagesPill } from "./ChatNewMessagesPill";
import { getMobileMessageAuthorLabel, isOutOfCharacterMessage } from "./messageAuthorLabel";
import {
  buildChatMessageListModel,
  getMessageListItemKey,
  getVisibleMessageListSignature,
  getReplyPreviewText,
} from "./messageListModel";
import { resolveBottomThresholdTransition, resolveVisibleMessageAppendAction, shouldAutoScrollOnContentSizeChange } from "./messageListScrollState";

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingVertical: Spacing.md,
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
const ROLE_AVATAR_STALE_TIME_MS = 24 * 60 * 60_000;

function getReplyAuthorName(msg: Message, roomRolesById: ReadonlyMap<number, UserRole>): string {
  return getMobileMessageAuthorLabel(msg, roomRolesById, {
    unknownRoleLabel: typeof msg.userId === "number" && msg.userId > 0 ? `用户 #${msg.userId}` : "未知角色",
  });
}

function shouldGroupWithPrevious(current: Message, previous: Message | undefined): boolean {
  if (!previous)
    return false;
  if (current.userId !== previous.userId)
    return false;
  if ((current.roleId ?? 0) !== (previous.roleId ?? 0))
    return false;
  if ((current.avatarId ?? 0) !== (previous.avatarId ?? 0))
    return false;
  if ((current.avatarFileId ?? 0) !== (previous.avatarFileId ?? 0))
    return false;
  return true;
}

function readPositiveAvatarFileId(value: unknown): number | null {
  const avatarFileId = (value as { avatarFileId?: unknown } | null)?.avatarFileId;
  return typeof avatarFileId === "number" && Number.isFinite(avatarFileId) && avatarFileId > 0
    ? avatarFileId
    : null;
}

function collectUnresolvedRoleAvatarIds(messages: readonly Message[], roomRolesById: ReadonlyMap<number, UserRole>): number[] {
  const avatarIds = new Set<number>();
  for (const message of messages) {
    if (isOutOfCharacterMessage(message)) {
      continue;
    }
    if (resolveMessageAvatarFileId(message, roomRolesById) != null) {
      continue;
    }
    const avatarId = resolveMessageAvatarId(message, roomRolesById);
    if (avatarId != null) {
      avatarIds.add(avatarId);
    }
  }
  return [...avatarIds].sort((left, right) => left - right);
}

function collectUnresolvedOocUserIds(messages: readonly Message[], roomRolesById: ReadonlyMap<number, UserRole>): number[] {
  const userIds = new Set<number>();
  for (const message of messages) {
    if (!isOutOfCharacterMessage(message)) {
      continue;
    }
    if (typeof message.userId === "number" && message.userId > 0) {
      userIds.add(message.userId);
    }
  }
  return [...userIds].sort((left, right) => left - right);
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
  onLongPressMessage: (message: Message) => void;
  onRetry?: () => void;
  onToggleMultiSelect?: (message: Message) => void;
  roomRoles: UserRole[];
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
  onLongPressMessage,
  onRetry,
  onToggleMultiSelect,
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

  const roleAvatarIds = useMemo(
    () => collectUnresolvedRoleAvatarIds(messageListModel.visibleChatMessages, roomRolesById),
    [messageListModel.visibleChatMessages, roomRolesById],
  );
  const roleAvatarQueryOptions = useMemo(() => roleAvatarIds.map(avatarId => ({
    enabled: avatarId > 0,
    queryFn: async () => {
      const response = await mobileApiClient.avatarController.getRoleAvatar(avatarId);
      return response.data ?? null;
    },
    queryKey: ["getRoleAvatar", avatarId] as const,
    staleTime: ROLE_AVATAR_STALE_TIME_MS,
  })), [roleAvatarIds]);
  const roleAvatarQueries = useQueries({ queries: roleAvatarQueryOptions });
  const roleAvatarFileIdByAvatarId = useMemo(() => {
    const map = new Map<number, number>();
    roleAvatarIds.forEach((avatarId, index) => {
      const avatarFileId = readPositiveAvatarFileId(roleAvatarQueries[index]?.data);
      if (avatarFileId != null) {
        map.set(avatarId, avatarFileId);
      }
    });
    return map;
  }, [roleAvatarIds, roleAvatarQueries]);

  const oocUserIds = useMemo(
    () => collectUnresolvedOocUserIds(messageListModel.visibleChatMessages, roomRolesById),
    [messageListModel.visibleChatMessages, roomRolesById],
  );
  const userInfoQueryOptions = useMemo(() => oocUserIds.map(userId => ({
    enabled: userId > 0,
    queryFn: async () => {
      const response = await mobileApiClient.userController.getUserInfo(userId);
      return response.data ?? null;
    },
    queryKey: getUserInfoQueryKey(userId),
    staleTime: USER_INFO_STALE_TIME_MS,
  })), [oocUserIds]);
  const userInfoQueries = useQueries({ queries: userInfoQueryOptions });
  const userAvatarFileIdByUserId = useMemo(() => {
    const map = new Map<number, number>();
    oocUserIds.forEach((userId, index) => {
      const avatarFileId = readPositiveAvatarFileId(userInfoQueries[index]?.data);
      if (avatarFileId != null) {
        map.set(userId, avatarFileId);
      }
    });
    return map;
  }, [oocUserIds, userInfoQueries]);

  const prefetchCandidateMessages = useMemo(
    () => selectChatMessagePrefetchWindow(messageListModel.visibleChatMessages),
    [messageListModel.visibleChatMessages],
  );
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

  const renderItem = useCallback(({ item, index }: { item: ChatMessageListItem; index: number }) => {
    const nextItem = messageListModel.invertedData[index + 1];
    const isGrouped = shouldGroupWithPrevious(item.message, nextItem?.message);
    const replyId = item.message.replyMessageId;
    const replyMsg = replyId ? messageListModel.messageMap.get(replyId) : undefined;
    const replyPreviewText = getReplyPreviewText(messageListModel.messageMap, replyId);
    const replyAuthorName = replyMsg ? getReplyAuthorName(replyMsg, roomRolesById) : null;
    const avatarUrl = resolveChatMessageAvatarUrl(
      item.message,
      roomRolesById,
      roleAvatarFileIdByAvatarId,
      userAvatarFileIdByUserId,
    );
    return (
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
        onExecuteCommandRequest={onExecuteCommandRequest}
        onLongPress={onLongPressMessage}
        onToggleMultiSelect={onToggleMultiSelect}
        replyAuthorName={replyAuthorName}
        replyPreviewText={replyPreviewText}
        roomRolesById={roomRolesById}
      />
    );
  }, [currentRoleId, isCommandRequestConsumed, isSpaceOwner, messageListModel.invertedData, messageListModel.messageMap, multiSelectMode, multiSelectedIds, noRole, onExecuteCommandRequest, onLongPressMessage, onToggleMultiSelect, roleAvatarFileIdByAvatarId, roomRolesById, selectedAnchorId, userAvatarFileIdByUserId]);

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
