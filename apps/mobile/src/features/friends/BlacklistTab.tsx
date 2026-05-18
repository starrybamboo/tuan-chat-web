import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";

import { Image } from "expo-image";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

const AVATAR_SIZE = 36;
const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

const styles = StyleSheet.create({
  scrollContent: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
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

interface BlacklistTabProps {
  blacklist: FriendResponse[];
  isPending: boolean;
  onUnblock: (userId: number) => void;
  isUnblocking?: boolean;
}

export function BlacklistTab({ blacklist, isPending, onUnblock, isUnblocking }: BlacklistTabProps) {
  const theme = useTheme();

  const handleUnblock = (item: FriendResponse) => {
    Alert.alert("解除拉黑", `确定要解除对 ${item.username ?? ""} 的拉黑吗？`, [
      { text: "取消", style: "cancel" },
      { text: "解除", onPress: () => onUnblock(item.userId!) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {isPending ? (
        <ActivityIndicator color={theme.accent} />
      ) : blacklist.length === 0 ? (
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>黑名单为空</ThemedText>
      ) : (
        blacklist.map((item) => {
          const url = avatarThumbUrl(item.avatarFileId);
          return (
            <View key={item.userId} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              {url ? (
                <Image source={{ uri: url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: AVATAR_COLORS[(item.userId ?? 0) % AVATAR_COLORS.length] }]}>
                  <ThemedText style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                    {(item.username ?? "").slice(0, 1) || "U"}
                  </ThemedText>
                </View>
              )}
              <View style={styles.info}>
                <ThemedText numberOfLines={1}>{item.username ?? `用户 #${item.userId}`}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">ID: {item.userId}</ThemedText>
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
        })
      )}
    </ScrollView>
  );
}
