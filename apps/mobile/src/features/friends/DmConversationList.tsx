import type { DmConversation } from "./useDmInboxQuery";

import { UsersThree } from "phosphor-react-native";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";

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
  emptyText: { fontSize: 12, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl },
  friendsButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
});

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

interface DmConversationListProps {
  conversations: DmConversation[];
  currentContactId: number | null;
  isPending: boolean;
  onOpenFriends: () => void;
  onSelectConversation: (contactId: number) => void;
}

export function DmConversationList({
  conversations,
  currentContactId,
  isPending,
  onOpenFriends,
  onSelectConversation,
}: DmConversationListProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText numberOfLines={1} type="heading" style={{ flex: 1 }}>
          私聊
        </ThemedText>
        <Pressable
          onPress={onOpenFriends}
          style={[styles.friendsButton, { backgroundColor: theme.backgroundElement }]}
        >
          <UsersThree size={16} color={theme.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {isPending ? (
          <ThemedText style={styles.emptyText} themeColor="textSecondary">加载中…</ThemedText>
        ) : conversations.length === 0 ? (
          <ThemedText style={styles.emptyText} themeColor="textSecondary">暂无私聊消息</ThemedText>
        ) : (
          conversations.map((conv) => {
            const active = conv.contactId === currentContactId;
            const avatarUrl = avatarThumbUrl(conv.contactAvatarFileId);
            return (
              <Pressable
                key={conv.contactId}
                onPress={() => onSelectConversation(conv.contactId)}
                style={[styles.row, active ? { backgroundColor: theme.backgroundSelected } : null]}
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
                  <ThemedText numberOfLines={1} type="smallBold">{conv.contactName}</ThemedText>
                  <ThemedText numberOfLines={1} type="caption" themeColor="textSecondary">
                    {conv.lastMessage.content ?? ""}
                  </ThemedText>
                </View>
                {conv.unreadCount > 0 ? (
                  <View style={{ backgroundColor: theme.danger, borderRadius: Radius.full, minWidth: 18, paddingHorizontal: 4, paddingVertical: 1, alignItems: "center" }}>
                    <ThemedText style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      {conv.unreadCount > 99 ? "99+" : String(conv.unreadCount)}
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
