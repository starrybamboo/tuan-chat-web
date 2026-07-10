import { UsersThree } from "phosphor-react-native";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

import type { DmConversation } from "./useDmInboxQuery";

import { ContactListAvatar } from "./ContactListAvatar";
import { normalizeDmConversations } from "./dmConversationListModel";

const AVATAR_SIZE = 40;
const CONVERSATION_INITIAL_RENDER_COUNT = 12;
const CONVERSATION_RENDER_BATCH_SIZE = 8;
const CONVERSATION_WINDOW_SIZE = 7;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 44,
    paddingHorizontal: Spacing.lg,
  },
  list: { flex: 1 },
  listContent: { gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg },
  row: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  info: { flex: 1, gap: 2 },
  infoTop: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  rightColumn: { alignItems: "flex-end", gap: 4 },
  emptyText: { fontSize: 12, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl },
  friendsButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  badge: {
    alignItems: "center",
    borderRadius: Radius.full,
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});

function formatConversationTime(createTime?: string | null): string {
  if (!createTime)
    return "";
  const date = new Date(createTime);
  if (Number.isNaN(date.getTime()))
    return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - target.getTime();
  const dayMs = 86400000;

  if (diff < 0 || diff < dayMs) {
    return date.toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" });
  }
  if (diff < dayMs * 2)
    return "昨天";
  if (diff < dayMs * 7) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return weekdays[date.getDay()];
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

type DmConversationListProps = {
  conversations: DmConversation[];
  currentContactId: number | null;
  hideHeader?: boolean;
  isPending: boolean;
  onOpenFriends?: () => void;
  onRefresh?: () => void;
  onSelectConversation: (contactId: number) => void;
  isRefreshing?: boolean;
};

function DmConversationListInner({
  conversations,
  currentContactId,
  hideHeader = false,
  isPending,
  onOpenFriends,
  onRefresh,
  onSelectConversation,
  isRefreshing = false,
}: DmConversationListProps) {
  const theme = useTheme();

  const onSelectRef = useRef(onSelectConversation);
  useEffect(() => { onSelectRef.current = onSelectConversation; });

  const sortedConversations = useMemo(() => normalizeDmConversations(conversations), [conversations]);

  const renderItem = useCallback(({ item: conv }: { item: DmConversation }) => {
    const active = conv.contactId === currentContactId;
    const avatarUrl = avatarThumbUrl(conv.contactAvatarFileId);
    const timeLabel = formatConversationTime(conv.lastMessage.createTime);

    return (
      <Pressable
        onPress={() => onSelectRef.current(conv.contactId)}
        style={[styles.row, active ? { backgroundColor: theme.backgroundSelected } : null]}
        accessibilityLabel={`与 ${conv.contactName} 的对话${conv.lastMessage.content ? `：${conv.lastMessage.content}` : ""}${conv.unreadCount > 0 ? `，${conv.unreadCount} 条未读` : ""}`}
        accessibilityRole="button"
      >
        <ContactListAvatar
          colorSeed={conv.contactId}
          displayName={conv.contactName}
          labelFontSize={14}
          size={AVATAR_SIZE}
          uri={avatarUrl}
        />
        <View style={styles.info}>
          <View style={styles.infoTop}>
            <ThemedText numberOfLines={1} type="smallBold" style={{ flex: 1 }}>{conv.contactName}</ThemedText>
          </View>
          <ThemedText numberOfLines={1} type="caption" themeColor="textSecondary">
            {conv.lastMessage.content ?? ""}
          </ThemedText>
        </View>
        <View style={styles.rightColumn}>
          <ThemedText type="caption" themeColor="textSecondary" style={{ fontSize: 11 }}>
            {timeLabel}
          </ThemedText>
          {conv.unreadCount > 0
            ? (
                <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                  <ThemedText style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                    {conv.unreadCount > 99 ? "99+" : String(conv.unreadCount)}
                  </ThemedText>
                </View>
              )
            : null}
        </View>
      </Pressable>
    );
  }, [currentContactId, theme]);

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <ThemedText numberOfLines={1} type="heading" style={{ flex: 1 }}>
            私聊
          </ThemedText>
          {onOpenFriends && (
            <Pressable
              onPress={onOpenFriends}
              style={[styles.friendsButton, { backgroundColor: theme.backgroundElement }]}
              accessibilityLabel="好友管理"
              accessibilityRole="button"
            >
              <UsersThree size={16} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      )}

      <FlatList
        data={sortedConversations}
        keyExtractor={item => String(item.contactId)}
        renderItem={renderItem}
        initialNumToRender={CONVERSATION_INITIAL_RENDER_COUNT}
        maxToRenderPerBatch={CONVERSATION_RENDER_BATCH_SIZE}
        updateCellsBatchingPeriod={50}
        windowSize={CONVERSATION_WINDOW_SIZE}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        refreshControl={
          onRefresh
            ? (
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.accent}
                  colors={[theme.accent]}
                />
              )
            : undefined
        }
        ListEmptyComponent={
          isPending
            ? (
                <ThemedText style={styles.emptyText} themeColor="textSecondary">加载中…</ThemedText>
              )
            : (
                <ThemedText style={styles.emptyText} themeColor="textSecondary">暂无私聊消息</ThemedText>
              )
        }
      />
    </View>
  );
}

export const DmConversationList = memo(DmConversationListInner);
