import { Prohibit, Trash } from "phosphor-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

import { ContactListAvatar } from "./ContactListAvatar";

const AVATAR_SIZE = 36;
const ACTION_WIDTH = 64;

const styles = StyleSheet.create({
  listContent: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
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
  friendInfo: { flex: 1, gap: 2 },
  emptyText: { fontSize: 13, paddingVertical: Spacing.xl, textAlign: "center" },
  swipeActions: { flexDirection: "row" },
  swipeBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: ACTION_WIDTH,
  },
});

type AllFriendsTabProps = {
  friends: FriendResponse[];
  isPending: boolean;
  onDeleteFriend: (userId: number) => void;
  onBlockFriend: (userId: number) => void;
  isBlocking?: boolean;
  onStartChat: (userId: number) => void;
};

export function AllFriendsTab({ friends, isPending, onDeleteFriend, onBlockFriend, isBlocking, onStartChat }: AllFriendsTabProps) {
  const theme = useTheme();
  const [searchText, setSearchText] = useState("");
  const openSwipeableRef = useRef<Swipeable | null>(null);

  const filteredFriends = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return friends;
    }

    return friends.filter(f =>
      (f.username ?? "").toLowerCase().includes(query)
      || String(f.userId).includes(query),
    );
  }, [friends, searchText]);

  const handleDelete = useCallback((friend: FriendResponse) => {
    openSwipeableRef.current?.close();
    Alert.alert("删除好友", `确定要删除好友 ${friend.username ?? ""} 吗？`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => onDeleteFriend(friend.userId!) },
    ]);
  }, [onDeleteFriend]);

  const handleBlock = useCallback((friend: FriendResponse) => {
    openSwipeableRef.current?.close();
    Alert.alert("拉黑好友", `确定要拉黑「${friend.username ?? friend.userId}」吗？拉黑后将自动解除好友关系。`, [
      { text: "取消", style: "cancel" },
      { text: "拉黑", style: "destructive", onPress: () => onBlockFriend(friend.userId!) },
    ]);
  }, [onBlockFriend]);

  const renderRightActions = useCallback((friend: FriendResponse) => (
    <View style={styles.swipeActions}>
      <Pressable
        onPress={() => handleBlock(friend)}
        disabled={isBlocking}
        style={[styles.swipeBtn, { backgroundColor: theme.textSecondary, opacity: isBlocking ? 0.5 : 1 }]}
        accessibilityLabel="拉黑"
        accessibilityRole="button"
      >
        <Prohibit size={20} color="#fff" />
        <ThemedText style={{ color: "#fff", fontSize: 11, marginTop: 2 }}>拉黑</ThemedText>
      </Pressable>
      <Pressable
        onPress={() => handleDelete(friend)}
        style={[styles.swipeBtn, { backgroundColor: theme.danger }]}
        accessibilityLabel={`删除好友 ${friend.username}`}
        accessibilityRole="button"
      >
        <Trash size={20} color="#fff" />
        <ThemedText style={{ color: "#fff", fontSize: 11, marginTop: 2 }}>删除</ThemedText>
      </Pressable>
    </View>
  ), [handleBlock, handleDelete, isBlocking, theme.danger, theme.textSecondary]);

  const renderFriend = useCallback(({ item: friend }: { item: FriendResponse }) => {
    const url = avatarThumbUrl(friend.avatarFileId);
    return (
      <Swipeable
        renderRightActions={() => renderRightActions(friend)}
        overshootRight={false}
        onSwipeableOpen={() => { openSwipeableRef.current?.close(); }}
        ref={(ref) => {
          if (ref) {
            openSwipeableRef.current = ref;
          }
        }}
      >
        <Pressable
          onPress={() => onStartChat(friend.userId!)}
          style={[styles.friendRow, { backgroundColor: theme.backgroundElement }]}
          accessibilityLabel={`和 ${friend.username} 聊天`}
          accessibilityRole="button"
        >
          <ContactListAvatar
            colorSeed={friend.userId}
            displayName={friend.username}
            labelFontSize={13}
            size={AVATAR_SIZE}
            uri={url}
          />
          <View style={styles.friendInfo}>
            <ThemedText numberOfLines={1}>{friend.username ?? `用户 #${friend.userId}`}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ID:
              {" "}
              {friend.userId}
            </ThemedText>
          </View>
        </Pressable>
      </Swipeable>
    );
  }, [onStartChat, renderRightActions, theme.backgroundElement]);

  return (
    <FlatList
      data={isPending ? [] : filteredFriends}
      contentContainerStyle={styles.listContent}
      keyExtractor={friend => `friend:${friend.userId ?? friend.username ?? "unknown"}`}
      renderItem={renderFriend}
      ListHeaderComponent={(
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="搜索好友..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
          accessibilityLabel="搜索好友"
        />
      )}
      ListEmptyComponent={isPending
        ? (
            <ActivityIndicator color={theme.accent} />
          )
        : (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {searchText ? "未找到匹配的好友" : "暂无好友"}
            </ThemedText>
          )}
    />
  );
}
