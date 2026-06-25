import { useGetUserProfileQuery } from "@tuanchat/query/users";
import { Trash } from "phosphor-react-native";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { confirmAction } from "@/lib/confirm";
import { avatarThumbUrl, mediaFileUrl } from "@/lib/media-url";

import { useDeleteFriendMutation } from "./useFriendMutations";

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.xl },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  content: { alignItems: "center", paddingTop: Spacing.xxxl, paddingBottom: Spacing.xxl, paddingHorizontal: Spacing.xl },
  avatar: { borderRadius: Radius.full, height: AVATAR_SIZE, width: AVATAR_SIZE },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: "#6366f1",
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    justifyContent: "center",
    width: AVATAR_SIZE,
  },
  name: { marginTop: Spacing.lg },
  description: { marginTop: Spacing.md, textAlign: "center", lineHeight: 20 },
  card: {
    borderRadius: Radius.lg,
    marginTop: Spacing.xxl,
    paddingVertical: Spacing.md,
    width: "100%",
  },
  cardRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.xl,
  },
  actionBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
  },
  avatarPreviewOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.9)",
    flex: 1,
    justifyContent: "center",
  },
  avatarPreviewImage: {
    borderRadius: Radius.lg,
    height: 280,
    width: 280,
  },
});

type DmContactDrawerProps = {
  contactId: number;
  contactName: string;
  contactAvatarFileId?: number;
  onClose: () => void;
  onDeleted?: () => void;
};

export function DmContactDrawer({ contactId, contactName, contactAvatarFileId, onClose, onDeleted }: DmContactDrawerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const profileQuery = useGetUserProfileQuery(mobileApiClient, contactId, {
    enabled: contactId > 0,
  });
  const profile = profileQuery.data?.data;
  const displayName = profile?.username ?? contactName;
  const displayAvatarFileId = profile?.avatarFileId ?? contactAvatarFileId;
  const avatarUrl = avatarThumbUrl(displayAvatarFileId);
  const avatarPreviewUrl = displayAvatarFileId ? mediaFileUrl(displayAvatarFileId, "image", "original") : "";

  const deleteMutation = useDeleteFriendMutation();

  const handleDelete = async () => {
    const confirmed = await confirmAction({
      title: "删除好友",
      message: `确定要删除好友「${displayName}」吗？`,
      confirmText: "删除",
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(contactId);
      Alert.alert("已删除", `已将「${displayName}」从好友列表移除`);
      onDeleted?.();
      onClose();
    }
    catch {
      Alert.alert("操作失败", "删除失败，请稍后重试");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText type="heading" style={{ flex: 1 }}>个人资料</ThemedText>
        <Pressable onPress={onClose}>
          <ThemedText themeColor="accent">关闭</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1, paddingBottom: Spacing.xxl + insets.bottom }]}>
        <Pressable
          onPress={() => avatarUrl && setAvatarPreviewVisible(true)}
          accessibilityLabel="查看用户头像"
          accessibilityRole="imagebutton"
        >
          {avatarUrl
            ? (
                <CachedImage uri={avatarUrl} style={styles.avatar} />
              )
            : (
                <View style={styles.avatarFallback}>
                  <ThemedText style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>
                    {displayName.slice(0, 1).toUpperCase()}
                  </ThemedText>
                </View>
              )}
        </Pressable>

        <ThemedText type="title" style={styles.name}>{displayName}</ThemedText>

        <ThemedText style={styles.description} themeColor="textSecondary">
          {profile?.description || "这个人就是个杂鱼，什么也不愿意写喵~"}
        </ThemedText>

        <View style={{ flex: 1 }} />

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.cardRow}>
            <ThemedText themeColor="textSecondary" style={{ fontSize: 14 }}>用户ID</ThemedText>
            <ThemedText style={{ fontSize: 14, fontFamily: "monospace" }}>{contactId}</ThemedText>
          </View>
          <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />
          <Pressable
            onPress={() => void handleDelete()}
            disabled={deleteMutation.isPending}
            style={[styles.actionBtn, { opacity: deleteMutation.isPending ? 0.5 : 1 }]}
            accessibilityLabel="删除好友"
            accessibilityRole="button"
          >
            <Trash size={18} color={theme.danger} />
            <ThemedText style={{ color: theme.danger }}>删除好友</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
      <Modal
        visible={avatarPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarPreviewVisible(false)}
      >
        <Pressable
          style={styles.avatarPreviewOverlay}
          onPress={() => setAvatarPreviewVisible(false)}
        >
          {avatarPreviewUrl
            ? (
                <CachedImage
                  uri={avatarPreviewUrl}
                  style={styles.avatarPreviewImage}
                  contentFit="cover"
                />
              )
            : null}
        </Pressable>
      </Modal>
    </View>
  );
}
