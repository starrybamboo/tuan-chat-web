import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";

import { ChatCircle, Trash } from "phosphor-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

const AVATAR_SIZE = 36;
const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

const styles = StyleSheet.create({
  scrollContent: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  friendRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  avatar: { borderRadius: Radius.full, height: AVATAR_SIZE, width: AVATAR_SIZE },
  avatarFallback: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    justifyContent: "center",
    width: AVATAR_SIZE,
  },
  friendInfo: { flex: 1, gap: 2 },
  actions: { flexDirection: "row", gap: Spacing.sm },
  actionBtn: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  emptyText: { fontSize: 13, paddingVertical: Spacing.xl, textAlign: "center" },
});

interface AllFriendsTabProps {
  friends: FriendResponse[];
  isPending: boolean;
  onDeleteFriend: (userId: number) => void;
  onStartChat: (userId: number) => void;
}

export function AllFriendsTab({ friends, isPending, onDeleteFriend, onStartChat }: AllFriendsTabProps) {
  const theme = useTheme();
  const [searchText, setSearchText] = useState("");

  const filteredFriends = searchText.trim()
    ? friends.filter(f =>
        (f.username ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        String(f.userId).includes(searchText),
      )
    : friends;

  const handleDelete = (friend: FriendResponse) => {
    Alert.alert("删除好友", `确定要删除好友 ${friend.username ?? ""} 吗？`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => onDeleteFriend(friend.userId!) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="搜索好友..."
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
        accessibilityLabel="搜索好友"
      />
      {isPending ? (
        <ActivityIndicator color={theme.accent} />
      ) : filteredFriends.length === 0 ? (
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          {searchText ? "未找到匹配的好友" : "暂无好友"}
        </ThemedText>
      ) : (
        filteredFriends.map((friend) => {
          const url = avatarThumbUrl(friend.avatarFileId);
          return (
            <View key={friend.userId} style={[styles.friendRow, { backgroundColor: theme.backgroundElement }]}>
              {url ? (
                <Image source={{ uri: url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: AVATAR_COLORS[(friend.userId ?? 0) % AVATAR_COLORS.length] }]}>
                  <ThemedText style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                    {(friend.username ?? "").slice(0, 1) || "U"}
                  </ThemedText>
                </View>
              )}
              <View style={styles.friendInfo}>
                <ThemedText numberOfLines={1}>{friend.username ?? `用户 #${friend.userId}`}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">ID: {friend.userId}</ThemedText>
              </View>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => onStartChat(friend.userId!)}
                  style={[styles.actionBtn, { backgroundColor: theme.accentMuted }]}
                  accessibilityLabel={`给 ${friend.username} 发消息`}
                  accessibilityRole="button"
                >
                  <ChatCircle size={16} color={theme.accent} />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(friend)}
                  style={[styles.actionBtn, { backgroundColor: theme.dangerMuted }]}
                  accessibilityLabel={`删除好友 ${friend.username}`}
                  accessibilityRole="button"
                >
                  <Trash size={16} color={theme.danger} />
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
