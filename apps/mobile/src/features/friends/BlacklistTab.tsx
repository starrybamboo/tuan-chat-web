import { useCallback } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from "react-native";

import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

const AVATAR_SIZE = 36;
const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

const styles = StyleSheet.create({
  listContent: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
  row: {
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
  info: { flex: 1, gap: 2 },
  actionBtn: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: { fontSize: 13, paddingVertical: Spacing.xl, textAlign: "center" },
});

type BlacklistTabProps = {
  blacklist: FriendResponse[];
  isPending: boolean;
  onUnblock: (userId: number) => void;
  isUnblocking?: boolean;
};

export function BlacklistTab({ blacklist, isPending, onUnblock, isUnblocking }: BlacklistTabProps) {
  const theme = useTheme();

  const handleUnblock = useCallback((item: FriendResponse) => {
    Alert.alert("解除拉黑", `确定要解除对 ${item.username ?? ""} 的拉黑吗？`, [
      { text: "取消", style: "cancel" },
      { text: "解除", onPress: () => onUnblock(item.userId!) },
    ]);
  }, [onUnblock]);

  const renderBlacklistItem = useCallback(({ item }: { item: FriendResponse }) => {
    const url = avatarThumbUrl(item.avatarFileId);
    return (
      <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
        {url
          ? (
              <CachedImage uri={url} style={styles.avatar} />
            )
          : (
              <View style={[styles.avatarFallback, { backgroundColor: AVATAR_COLORS[(item.userId ?? 0) % AVATAR_COLORS.length] }]}>
                <ThemedText style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                  {(item.username ?? "").slice(0, 1) || "U"}
                </ThemedText>
              </View>
            )}
        <View style={styles.info}>
          <ThemedText numberOfLines={1}>{item.username ?? `用户 #${item.userId}`}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            ID:
            {" "}
            {item.userId}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => handleUnblock(item)}
          disabled={isUnblocking}
          style={[styles.actionBtn, { backgroundColor: theme.accentMuted }]}
          accessibilityLabel={`解除拉黑 ${item.username}`}
          accessibilityRole="button"
        >
          <ThemedText style={{ color: theme.accent, fontSize: 12 }}>解除</ThemedText>
        </Pressable>
      </View>
    );
  }, [handleUnblock, isUnblocking, theme.accent, theme.accentMuted, theme.backgroundElement]);

  return (
    <FlatList
      data={isPending ? [] : blacklist}
      contentContainerStyle={styles.listContent}
      keyExtractor={item => `blacklist:${item.userId ?? item.username ?? "unknown"}`}
      renderItem={renderBlacklistItem}
      ListEmptyComponent={isPending
        ? (
            <ActivityIndicator color={theme.accent} />
          )
        : (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>黑名单为空</ThemedText>
          )}
      removeClippedSubviews={false}
    />
  );
}
