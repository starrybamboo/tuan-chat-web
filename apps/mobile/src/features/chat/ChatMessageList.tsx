import type { StateEventMessageSummary } from "@tuanchat/domain/state-runtime";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { prefetchImages } from "@/lib/mobile-image-cache";

import type { ChatMessageListItem } from "./messageListModel";

import { collectChatAvatarThumbUrls, collectChatImageThumbUrls, selectChatMessagePrefetchWindow } from "./chat-avatar-prefetch";
import { buildRoomRolesById } from "./chat-avatar-utils";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatNewMessagesPill } from "./ChatNewMessagesPill";
import { getMobileMessageAuthorLabel } from "./messageAuthorLabel";
import {
  buildVisibleMessageMap,
  getMessageListItemKey,
  getReplyPreviewText,
  getVisibleMessageItems,
} from "./messageListModel";
import { resolveBottomThresholdTransition } from "./messageListScrollState";

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
const MESSAGE_RENDER_BATCH_SIZE = 10;
const MESSAGE_WINDOW_SIZE = 9;

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
  stateEventSummariesByMessageId?: Record<number, StateEventMessageSummary>;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim())
    return error.message.trim();
  return fallback;
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
  stateEventSummariesByMessageId,
}: ChatMessageListProps) {
  const theme = useTheme();
  const flatListRef = useRef<FlatList<ChatMessageListItem>>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const prevLengthRef = useRef(getVisibleMessageItems(messages).length);
  const roomRolesById = useMemo(() => buildRoomRolesById(roomRoles), [roomRoles]);

  const visibleMessages = useMemo(
    () => getVisibleMessageItems(messages),
    [messages],
  );
  const visibleChatMessages = useMemo(
    () => visibleMessages.map(item => item.message),
    [visibleMessages],
  );
  const prefetchCandidateMessages = useMemo(
    () => selectChatMessagePrefetchWindow(visibleChatMessages),
    [visibleChatMessages],
  );
  const invertedData = useMemo(
    () => [...visibleMessages].reverse(),
    [visibleMessages],
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

  const commitBottomState = useCallback((nextIsAtBottom: boolean) => {
    if (isAtBottomRef.current === nextIsAtBottom) {
      return;
    }

    isAtBottomRef.current = nextIsAtBottom;
    setIsAtBottom(nextIsAtBottom);
    if (nextIsAtBottom)
      setNewMessageCount(0);
  }, []);

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const transition = resolveBottomThresholdTransition(isAtBottomRef.current, e.nativeEvent.contentOffset.y);
    if (transition.changed) {
      commitBottomState(transition.isAtBottom);
    }
  }, [commitBottomState]);

  useEffect(() => {
    const previousLength = prevLengthRef.current;
    if (visibleMessages.length > previousLength && !isAtBottomRef.current) {
      setNewMessageCount(count => count + (visibleMessages.length - previousLength));
    }
    prevLengthRef.current = visibleMessages.length;
  }, [visibleMessages.length]);

  useEffect(() => {
    if (prefetchUrls.length === 0)
      return;
    void prefetchImages(prefetchUrls);
  }, [prefetchUrls]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setNewMessageCount(0);
  }, []);

  const messageMap = useMemo(() => buildVisibleMessageMap(messages), [messages]);

  const renderItem = useCallback(({ item, index }: { item: ChatMessageListItem; index: number }) => {
    const nextItem = invertedData[index + 1];
    const isGrouped = shouldGroupWithPrevious(item.message, nextItem?.message);
    const replyId = item.message.replyMessageId;
    const replyMsg = replyId ? messageMap.get(replyId) : undefined;
    const replyPreviewText = getReplyPreviewText(messageMap, replyId);
    const replyAuthorName = replyMsg ? getReplyAuthorName(replyMsg, roomRolesById) : null;
    const stateEventSummary = typeof item.message.messageId === "number"
      ? stateEventSummariesByMessageId?.[item.message.messageId]
      : undefined;

    return (
      <ChatMessageItem
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
        stateEventSummary={stateEventSummary}
      />
    );
  }, [currentRoleId, invertedData, isCommandRequestConsumed, isSpaceOwner, messageMap, multiSelectMode, multiSelectedIds, noRole, onExecuteCommandRequest, onLongPressMessage, onToggleMultiSelect, roomRolesById, selectedAnchorId, stateEventSummariesByMessageId]);

  const keyExtractor = useCallback((item: ChatMessageListItem, index: number) => getMessageListItemKey(item.message, index), []);

  if (isPending && visibleMessages.length === 0) {
    return (
      <View style={[styles.container, styles.stateBlock]}>
        <ActivityIndicator color={theme.accent} />
        <ThemedText themeColor="textSecondary">加载消息…</ThemedText>
      </View>
    );
  }

  if (isError && visibleMessages.length === 0) {
    return (
      <View style={[styles.container, styles.stateBlock]}>
        <ThemedText style={{ color: theme.danger, fontSize: 13 }}>
          {getErrorMessage(error, "加载消息失败。")}
        </ThemedText>
        {onRetry
          ? (
              <Pressable onPress={onRetry}>
                <ThemedText themeColor="accent" type="small">重试</ThemedText>
              </Pressable>
            )
          : null}
      </View>
    );
  }

  if (visibleMessages.length === 0) {
    return (
      <View style={[styles.container, styles.stateBlock]}>
        <ThemedText themeColor="textSecondary">暂无消息</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={invertedData}
        inverted
        keyboardDismissMode="interactive"
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialNumToRender={MESSAGE_INITIAL_RENDER_COUNT}
        maxToRenderPerBatch={MESSAGE_RENDER_BATCH_SIZE}
        maintainVisibleContentPosition={MESSAGE_LIST_MAINTAIN_VISIBLE_POSITION}
        // 倒置消息流依赖 anchored rows 保持阅读位置，Android 裁剪回收会放大跳动风险。
        removeClippedSubviews={false}
        updateCellsBatchingPeriod={50}
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
