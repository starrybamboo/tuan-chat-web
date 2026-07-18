import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";
import type { SharedValue } from "react-native-reanimated";

import { FlashList } from "@shopify/flash-list";
import { Prohibit, Trash } from "phosphor-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";

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

type FriendSwipeableRowProps = {
  friend: FriendResponse;
  isBlocking: boolean;
  onBlockFriend: (userId: number) => void;
  onDeleteFriend: (userId: number) => void;
  onStartChat: (userId: number) => void;
  onSwipeableClose: (swipeable: SwipeableMethods | null) => void;
  onSwipeableWillOpen: (swipeable: SwipeableMethods | null) => void;
};

function FriendSwipeableRow({
  friend,
  isBlocking,
  onBlockFriend,
  onDeleteFriend,
  onStartChat,
  onSwipeableClose,
  onSwipeableWillOpen,
}: FriendSwipeableRowProps) {
  const theme = useTheme();
  const swipeableRef = useRef<SwipeableMethods | null>(null);
  const userId = friend.userId;
  const avatarUrl = avatarThumbUrl(friend.avatarFileId);

  const handleDelete = useCallback((swipeable: SwipeableMethods) => {
    swipeable.close();
    if (typeof userId !== "number") {
      return;
    }
    Alert.alert("删除好友", `确定要删除好友 ${friend.username ?? ""} 吗？`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => onDeleteFriend(userId) },
    ]);
  }, [friend.username, onDeleteFriend, userId]);

  const handleBlock = useCallback((swipeable: SwipeableMethods) => {
    swipeable.close();
    if (typeof userId !== "number") {
      return;
    }
    Alert.alert("拉黑好友", `确定要拉黑「${friend.username ?? userId}」吗？拉黑后将自动解除好友关系。`, [
      { text: "取消", style: "cancel" },
      { text: "拉黑", style: "destructive", onPress: () => onBlockFriend(userId) },
    ]);
  }, [friend.username, onBlockFriend, userId]);

  const renderRightActions = useCallback((
    _progress: SharedValue<number>,
    _translation: SharedValue<number>,
    swipeable: SwipeableMethods,
  ) => (
    <View style={styles.swipeActions}>
      <Pressable
        accessibilityLabel="拉黑"
        accessibilityRole="button"
        disabled={isBlocking || typeof userId !== "number"}
        onPress={() => handleBlock(swipeable)}
        style={[styles.swipeBtn, { backgroundColor: theme.textSecondary, opacity: isBlocking ? 0.5 : 1 }]}
      >
        <Prohibit size={20} color="#fff" />
        <ThemedText style={{ color: "#fff", fontSize: 11, marginTop: 2 }}>拉黑</ThemedText>
      </Pressable>
      <Pressable
        accessibilityLabel={`删除好友 ${friend.username ?? ""}`}
        accessibilityRole="button"
        disabled={typeof userId !== "number"}
        onPress={() => handleDelete(swipeable)}
        style={[
          styles.swipeBtn,
          { backgroundColor: theme.danger, opacity: typeof userId === "number" ? 1 : 0.5 },
        ]}
      >
        <Trash size={20} color="#fff" />
        <ThemedText style={{ color: "#fff", fontSize: 11, marginTop: 2 }}>删除</ThemedText>
      </Pressable>
    </View>
  ), [friend.username, handleBlock, handleDelete, isBlocking, theme.danger, theme.textSecondary, userId]);

  const handlePress = useCallback(() => {
    if (typeof userId === "number") {
      onStartChat(userId);
    }
  }, [onStartChat, userId]);

  const handleSwipeableWillOpen = useCallback(() => {
    onSwipeableWillOpen(swipeableRef.current);
  }, [onSwipeableWillOpen]);

  const handleSwipeableClose = useCallback(() => {
    onSwipeableClose(swipeableRef.current);
  }, [onSwipeableClose]);

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      enabled={typeof userId === "number"}
      onSwipeableClose={handleSwipeableClose}
      onSwipeableWillOpen={handleSwipeableWillOpen}
      overshootRight={false}
      renderRightActions={renderRightActions}
    >
      <Pressable
        accessibilityLabel={`和 ${friend.username ?? `用户 #${userId ?? "-"}`} 聊天`}
        accessibilityRole="button"
        disabled={typeof userId !== "number"}
        onPress={handlePress}
        style={[styles.friendRow, { backgroundColor: theme.backgroundElement }]}
      >
        <ContactListAvatar
          colorSeed={userId}
          displayName={friend.username}
          labelFontSize={13}
          size={AVATAR_SIZE}
          uri={avatarUrl}
        />
        <View style={styles.friendInfo}>
          <ThemedText numberOfLines={1}>{friend.username ?? `用户 #${userId ?? "-"}`}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            ID:
            {" "}
            {userId ?? "-"}
          </ThemedText>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

export function AllFriendsTab({ friends, isPending, onDeleteFriend, onBlockFriend, isBlocking, onStartChat }: AllFriendsTabProps) {
  const theme = useTheme();
  const [searchText, setSearchText] = useState("");
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

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

  const handleSwipeableWillOpen = useCallback((swipeable: SwipeableMethods | null) => {
    if (!swipeable) {
      return;
    }
    if (openSwipeableRef.current && openSwipeableRef.current !== swipeable) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = swipeable;
  }, []);

  const handleSwipeableClose = useCallback((swipeable: SwipeableMethods | null) => {
    if (openSwipeableRef.current === swipeable) {
      openSwipeableRef.current = null;
    }
  }, []);

  const renderFriend = useCallback(({ item: friend }: { item: FriendResponse }) => {
    return (
      <FriendSwipeableRow
        friend={friend}
        isBlocking={isBlocking ?? false}
        onBlockFriend={onBlockFriend}
        onDeleteFriend={onDeleteFriend}
        onStartChat={onStartChat}
        onSwipeableClose={handleSwipeableClose}
        onSwipeableWillOpen={handleSwipeableWillOpen}
      />
    );
  }, [handleSwipeableClose, handleSwipeableWillOpen, isBlocking, onBlockFriend, onDeleteFriend, onStartChat]);

  return (
    <FlashList
      data={isPending ? [] : filteredFriends}
      contentContainerStyle={styles.listContent}
      keyExtractor={(friend, index) => `friend:${friend.userId ?? friend.username ?? index}`}
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
