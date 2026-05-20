import { useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";

import type { FriendReqResponse } from "@tuanchat/openapi-client/models/FriendReqResponse";

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
  actions: { flexDirection: "row", gap: Spacing.sm },
  actionBtn: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: { fontSize: 13, paddingVertical: Spacing.xl, textAlign: "center" },
});

function formatRequestTime(createTime?: string | null): string {
  if (!createTime)
    return "";
  const date = new Date(createTime);
  if (Number.isNaN(date.getTime()))
    return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)
    return "刚刚";
  if (diffMin < 60)
    return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24)
    return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7)
    return `${diffDay}天前`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

type PendingRequestsTabProps = {
  embedded?: boolean;
  isPending: boolean;
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
  requests: FriendReqResponse[];
  isAccepting?: boolean;
  isRejecting?: boolean;
  showEmpty?: boolean;
};

export function PendingRequestsTab({
  embedded = false,
  isAccepting,
  isPending,
  isRejecting,
  onAccept,
  onReject,
  requests,
  showEmpty = true,
}: PendingRequestsTabProps) {
  const theme = useTheme();

  const renderRequest = useCallback(({ item: req }: { item: FriendReqResponse }) => {
    const requestId = req.id!;
    const user = req.fromUser;
    const username = user?.username ?? `用户 #${req.fromId}`;
    const avatarUrl = avatarThumbUrl(user?.avatarFileId);
    const timeLabel = formatRequestTime(req.createTime);

    return (
      <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
        {avatarUrl
          ? (
              <CachedImage uri={avatarUrl} style={styles.avatar} />
            )
          : (
              <View style={[styles.avatarFallback, { backgroundColor: AVATAR_COLORS[(req.fromId ?? 0) % AVATAR_COLORS.length] }]}>
                <ThemedText style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                  {username.slice(0, 1) || "U"}
                </ThemedText>
              </View>
            )}
        <View style={styles.info}>
          <ThemedText numberOfLines={1}>{username}</ThemedText>
          {req.verifyMsg
            ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {req.verifyMsg}
                </ThemedText>
              )
            : null}
          {timeLabel
            ? (
                <ThemedText type="caption" themeColor="textSecondary">{timeLabel}</ThemedText>
              )
            : null}
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => onAccept(requestId)}
            disabled={isAccepting}
            style={[styles.actionBtn, { backgroundColor: theme.accentMuted }]}
            accessibilityLabel={`接受 ${username} 的好友请求`}
            accessibilityRole="button"
          >
            <ThemedText style={{ color: theme.accent, fontSize: 12 }}>接受</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => onReject(requestId)}
            disabled={isRejecting}
            style={[styles.actionBtn, { backgroundColor: theme.dangerMuted }]}
            accessibilityLabel={`拒绝 ${username} 的好友请求`}
            accessibilityRole="button"
          >
            <ThemedText style={{ color: theme.danger, fontSize: 12 }}>拒绝</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }, [isAccepting, isRejecting, onAccept, onReject, theme.accent, theme.accentMuted, theme.backgroundElement, theme.danger, theme.dangerMuted]);

  const emptyContent = isPending
    ? (
        <ActivityIndicator color={theme.accent} />
      )
    : requests.length === 0
      ? (
          showEmpty
            ? <ThemedText themeColor="textSecondary" style={styles.emptyText}>暂无待处理请求</ThemedText>
            : null
        )
      : null;

  if (embedded) {
    return (
      <FlatList
        data={isPending ? [] : requests}
        contentContainerStyle={styles.listContent}
        keyExtractor={item => `embedded-request:${item.id ?? item.fromId ?? "unknown"}`}
        renderItem={renderRequest}
        ListEmptyComponent={emptyContent}
        removeClippedSubviews={false}
        scrollEnabled={false}
      />
    );
  }

  return (
    <FlatList
      data={isPending ? [] : requests}
      contentContainerStyle={styles.listContent}
      keyExtractor={item => `request:${item.id ?? item.fromId ?? "unknown"}`}
      renderItem={renderRequest}
      ListEmptyComponent={emptyContent}
      removeClippedSubviews={false}
    />
  );
}
