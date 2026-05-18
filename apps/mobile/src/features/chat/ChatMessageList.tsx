import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { ChatMessageItem } from "./ChatMessageItem";
import { ChatNewMessagesPill } from "./ChatNewMessagesPill";

interface MessageItem {
  message: Message;
}

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

function getReplyAuthorName(msg: Message, roles: UserRole[]): string {
  if (!msg.roleId || msg.roleId <= 0) return "旁白";
  const custom = (msg.customRoleName ?? "").trim();
  if (custom) return custom;
  const role = roles.find(r => r.roleId === msg.roleId);
  return (role?.roleName ?? "").trim() || "未知角色";
}

function shouldGroupWithPrevious(current: Message, previous: Message | undefined): boolean {
  if (!previous)
    return false;
  if (current.userId !== previous.userId)
    return false;
  if ((current.roleId ?? 0) !== (previous.roleId ?? 0))
    return false;
  if ((current.avatarFileId ?? 0) !== (previous.avatarFileId ?? 0))
    return false;
  return true;
}

interface ChatMessageListProps {
  error: unknown;
  isError: boolean;
  isPending: boolean;
  messages: MessageItem[];
  multiSelectMode?: boolean;
  multiSelectedIds?: Set<number>;
  onLongPressMessage: (message: Message) => void;
  onToggleMultiSelect?: (message: Message) => void;
  roomRoles: UserRole[];
  selectedAnchorId: number | null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim())
    return error.message.trim();
  return fallback;
}

export function ChatMessageList({
  error,
  isError,
  isPending,
  messages,
  multiSelectMode,
  multiSelectedIds,
  onLongPressMessage,
  onToggleMultiSelect,
  roomRoles,
  selectedAnchorId,
}: ChatMessageListProps) {
  const theme = useTheme();
  const flatListRef = useRef<FlatList<MessageItem>>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const prevLengthRef = useRef(messages.length);

  const invertedData = useMemo(
    () => messages.filter(item => item.message.messageType !== MESSAGE_TYPE.EFFECT).reverse(),
    [messages],
  );

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const atBottom = e.nativeEvent.contentOffset.y < 50;
    setIsAtBottom(atBottom);
    if (atBottom)
      setNewMessageCount(0);
  }, []);

  useEffect(() => {
    const previousLength = prevLengthRef.current;
    if (messages.length > previousLength && !isAtBottom) {
      setNewMessageCount(count => count + (messages.length - previousLength));
    }
    prevLengthRef.current = messages.length;
  }, [isAtBottom, messages.length]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setNewMessageCount(0);
  }, []);

  const messageMap = useMemo(() => {
    const map = new Map<number, Message>();
    for (const item of messages) {
      if (item.message.messageId)
        map.set(item.message.messageId, item.message);
    }
    return map;
  }, [messages]);

  const renderItem = useCallback(({ item, index }: { item: MessageItem; index: number }) => {
    const nextItem = invertedData[index + 1];
    const isGrouped = shouldGroupWithPrevious(item.message, nextItem?.message);
    const replyId = item.message.replyMessageId;
    const replyMsg = replyId ? messageMap.get(replyId) : undefined;
    const replyPreviewText = replyMsg?.content?.trim().slice(0, 60) ?? null;
    const replyAuthorName = replyMsg ? getReplyAuthorName(replyMsg, roomRoles) : null;

    return (
      <ChatMessageItem
        isGrouped={isGrouped}
        isMultiSelected={item.message.messageId != null && multiSelectedIds?.has(item.message.messageId)}
        isSelectedAnchor={selectedAnchorId === item.message.messageId}
        message={item.message}
        multiSelectMode={multiSelectMode}
        onLongPress={onLongPressMessage}
        onToggleMultiSelect={onToggleMultiSelect}
        replyAuthorName={replyAuthorName}
        replyPreviewText={replyPreviewText}
        roomRoles={roomRoles}
      />
    );
  }, [invertedData, messageMap, multiSelectMode, multiSelectedIds, onLongPressMessage, onToggleMultiSelect, roomRoles, selectedAnchorId]);

  const keyExtractor = useCallback((item: MessageItem) => String(item.message.messageId), []);

  if (isPending && messages.length === 0) {
    return (
      <View style={[styles.container, styles.stateBlock]}>
        <ActivityIndicator color={theme.accent} />
        <ThemedText themeColor="textSecondary">加载消息…</ThemedText>
      </View>
    );
  }

  if (isError && messages.length === 0) {
    return (
      <View style={[styles.container, styles.stateBlock]}>
        <ThemedText style={{ color: theme.danger, fontSize: 13 }}>
          {getErrorMessage(error, "加载消息失败。")}
        </ThemedText>
      </View>
    );
  }

  if (messages.length === 0) {
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
        windowSize={10}
        maxToRenderPerBatch={15}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />
      <ChatNewMessagesPill
        count={newMessageCount}
        visible={!isAtBottom}
        onPress={scrollToBottom}
      />
    </View>
  );
}
