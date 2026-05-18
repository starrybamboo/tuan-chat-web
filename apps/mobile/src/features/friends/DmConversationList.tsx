import type { DmConversation } from "./useDmInboxQuery";

import { UsersThree } from "phosphor-react-native";
import { useCallback } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";

import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

const AVATAR_SIZE = 40;

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
  avatar: {
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    width: AVATAR_SIZE,
  },
  avatarFallback: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    justifyContent: "center",
    width: AVATAR_SIZE,
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

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

function formatConversationTime(createTime?: string | null): string {
  if (!createTime) return "";
  const date = new Date(createTime);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - target.getTime();
  const dayMs = 86400000;

  if (diff < 0 || diff < dayMs) {
    return date.toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" });
  }
  if (diff < dayMs * 2) return "昨天";
  if (diff < dayMs * 7) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return weekdays[date.getDay()];
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

interface DmConversationListProps {
  conversations: DmConversation[];
  currentContactId: number | null;
  isPending: boolean;
  onOpenFriends: () => void;
  onRefresh?: () => void;
  onSelectConversation: (contactId: number) => void;
  isRefreshing?: boolean;
}

export function DmConversationList({
  conversations,
  currentContactId,
  isPending,
  onOpenFriends,
  onRefresh,
  onSelectConversation,
  isRefreshing = false,
}: DmConversationListProps) {
  const theme = useTheme();

  const sortedConversations = [...conversations].sort((a, b) => {
    const timeA = a.lastMessage.createTime ? new Date(a.lastMessage.createTime).getTime() : 0;
    const timeB = b.lastMessage.createTime ? new Date(b.lastMessage.createTime).getTime() : 0;
    return timeB - timeA;
  });

  const renderItem = useCallback(({ item: conv }: { item: DmConversation }) => {
    const active = conv.contactId === currentContactId;
    const avatarUrl = avatarThumbUrl(conv.contactAvatarFileId);
    const timeLabel = formatConversationTime(conv.lastMessage.createTime);

    return (
      <Pressable
        onPress={() => onSelectConversation(conv.contactId)}
        style={[styles.row, active ? { backgroundColor: theme.backgroundSelected } : null]}
        accessibilityLabel={`与 ${conv.contactName} 的对话${conv.unreadCount > 0 ? `，${conv.unreadCount} 条未读` : ""}`}
        accessibilityRole="button"
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: AVATAR_COLORS[conv.contactId % AVATAR_COLORS.length] }]}>
            <ThemedText style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
              {(conv.contactName ?? "").slice(0, 1) || "U"}
            </ThemedText>
          </View>
        )}
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
          {conv.unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.danger }]}>
              <ThemedText style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                {conv.unreadCount > 99 ? "99+" : String(conv.unreadCount)}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  }, [currentContactId, onSelectConversation, theme]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText numberOfLines={1} type="heading" style={{ flex: 1 }}>
          私聊
        </ThemedText>
        <Pressable
          onPress={onOpenFriends}
          style={[styles.friendsButton, { backgroundColor: theme.backgroundElement }]}
          accessibilityLabel="好友管理"
          accessibilityRole="button"
        >
          <UsersThree size={16} color={theme.textSecondary} />
        </Pressable>
      </View>

      <FlatList
        data={sortedConversations}
        keyExtractor={(item) => String(item.contactId)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          ) : undefined
        }
        ListEmptyComponent={
          isPending ? (
            <ThemedText style={styles.emptyText} themeColor="textSecondary">加载中…</ThemedText>
          ) : (
            <ThemedText style={styles.emptyText} themeColor="textSecondary">暂无私聊消息</ThemedText>
          )
        }
      />
    </View>
  );
}
