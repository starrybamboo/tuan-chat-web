import type { GestureType } from "react-native-gesture-handler";

import { getMessagePreviewText } from "@tuanchat/domain/message-preview";
import { buildMessageSearchText } from "@tuanchat/domain/message-search";
import { ArrowLeft, MagnifyingGlass, X } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Message } from "@tuanchat/openapi-client/models/Message";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getMessageAuthorLabel } from "@tuanchat/domain/display-labels";

import type { RoomRolesById } from "./chat-avatar-utils";

import { getMobileMessageAuthorLabel, isNarratorMessage } from "./messageAuthorLabel";
import { MessageAvatar } from "./MessageAvatar";
import { formatMessageDateTime } from "./mobileChatUtils";

type MessageItem = {
  message: Message;
};

function getSearchAuthorLabel(message: Message, roomRolesById?: RoomRolesById): string {
  const fallbackLabel = isNarratorMessage(message) ? undefined : getMessageAuthorLabel(message);
  return getMobileMessageAuthorLabel(message, roomRolesById, { unknownRoleLabel: fallbackLabel });
}

type ChatSearchPageProps = {
  messages: MessageItem[];
  nativeScrollGesture?: GestureType;
  onClose: () => void;
  onScrollToMessage: (messageId: number) => void;
  roomRolesById?: RoomRolesById;
};

export function ChatSearchPage({ messages, nativeScrollGesture, onClose, onScrollToMessage, roomRolesById }: ChatSearchPageProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const filteredMessages = useMemo(() => {
    const trimmed = query.trim().toLocaleLowerCase("zh-CN");
    if (!trimmed)
      return [];
    return messages.filter((item) => {
      const authorLabel = getSearchAuthorLabel(item.message, roomRolesById);
      return `${buildMessageSearchText(item.message)} ${authorLabel}`.toLocaleLowerCase("zh-CN").includes(trimmed);
    });
  }, [messages, query, roomRolesById]);

  const handleClose = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  const handleSelect = useCallback((messageId: number) => {
    setQuery("");
    onClose();
    onScrollToMessage(messageId);
  }, [onClose, onScrollToMessage]);

  const renderItem = useCallback(({ item }: { item: MessageItem }) => {
    const msg = item.message;
    const authorLabel = getSearchAuthorLabel(msg, roomRolesById);
    const preview = getMessagePreviewText(msg);
    const time = msg.createTime ? formatMessageDateTime(msg.createTime) : "";

    return (
      <Pressable
        onPress={() => msg.messageId && handleSelect(msg.messageId)}
        style={({ pressed }) => [
          styles.resultItem,
          { borderBottomColor: theme.border },
          pressed && { backgroundColor: theme.surface },
        ]}
      >
        <MessageAvatar
          avatarFileId={msg.avatarFileId}
          displayName={authorLabel}
          roleId={msg.roleId}
          roomRolesById={roomRolesById}
          size={36}
          userId={msg.userId}
        />
        <View style={styles.resultContent}>
          <View style={styles.resultHeader}>
            <ThemedText numberOfLines={1} style={[styles.authorText, { color: theme.text }]}>
              {authorLabel}
            </ThemedText>
            {time ? (
              <ThemedText style={[styles.timeText, { color: theme.textSecondary }]}>
                {time}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText numberOfLines={2} style={[styles.previewText, { color: theme.textSecondary }]}>
            {preview}
          </ThemedText>
        </View>
      </Pressable>
    );
  }, [handleSelect, roomRolesById, theme]);

  const keyExtractor = useCallback((item: MessageItem) => String(item.message.messageId ?? 0), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={handleClose} style={styles.backButton} accessibilityLabel="返回">
          <ArrowLeft size={22} color={theme.text} weight="bold" />
        </Pressable>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.surface }]}>
          <MagnifyingGlass size={16} color={theme.textSecondary} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="搜索聊天记录..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <X size={14} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {query.trim() ? (
        <>
          <View style={[styles.resultCountBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <ThemedText style={[styles.resultCountText, { color: theme.textSecondary }]}>
              找到
              {" "}
              {filteredMessages.length}
              {" "}
              条相关记录
            </ThemedText>
          </View>
          {filteredMessages.length > 0 ? (
            nativeScrollGesture ? (
              <GestureDetector gesture={nativeScrollGesture}>
                <FlatList
                  data={filteredMessages}
                  keyExtractor={keyExtractor}
                  renderItem={renderItem}
                  contentContainerStyle={{ paddingBottom: insets.bottom }}
                  keyboardShouldPersistTaps="handled"
                />
              </GestureDetector>
            ) : (
              <FlatList
                data={filteredMessages}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: insets.bottom }}
                keyboardShouldPersistTaps="handled"
              />
            )
          ) : (
            <View style={styles.emptyState}>
              <MagnifyingGlass size={48} color={theme.textSecondary} weight="thin" />
              <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
                没有找到匹配的聊天记录
              </ThemedText>
              <ThemedText style={[styles.emptyHint, { color: theme.textSecondary }]}>
                尝试使用不同的关键词搜索
              </ThemedText>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <MagnifyingGlass size={48} color={theme.textSecondary} weight="thin" />
          <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
            搜索消息
          </ThemedText>
          <ThemedText style={[styles.emptyHint, { color: theme.textSecondary }]}>
            输入关键词搜索消息内容或角色名
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  searchInputContainer: {
    alignItems: "center",
    borderRadius: Radius.xl,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    height: 36,
    paddingHorizontal: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 36,
    padding: 0,
  },
  resultCountBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  resultCountText: {
    fontSize: 13,
  },
  resultItem: {
    alignItems: "flex-start",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  resultContent: {
    flex: 1,
    gap: 4,
  },
  resultHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
  },
  authorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  timeText: {
    fontSize: 11,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: Spacing.lg,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: "center",
  },
});
