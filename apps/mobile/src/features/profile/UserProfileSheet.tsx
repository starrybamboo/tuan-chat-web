import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { avatarThumbUrl, mediaFileUrl } from "@/lib/media-url";
import { useGetUserProfileQuery } from "@tuanchat/query/users";

const AVATAR_SIZE = 64;

const styles = StyleSheet.create({
  overlay: { backgroundColor: "rgba(0,0,0,0.5)", flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxxl, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  handle: { alignSelf: "center", borderRadius: 2, height: 4, marginBottom: Spacing.xl, width: 36 },
  profileSection: { alignItems: "center", gap: Spacing.lg, paddingVertical: Spacing.xl },
  avatar: { borderRadius: Radius.full, height: AVATAR_SIZE, width: AVATAR_SIZE },
  avatarFallback: { alignItems: "center", backgroundColor: "#6366f1", borderRadius: Radius.full, height: AVATAR_SIZE, justifyContent: "center", width: AVATAR_SIZE },
  avatarPreviewOverlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.9)", flex: 1, justifyContent: "center" },
  avatarPreviewImage: { borderRadius: Radius.lg, height: 280, width: 280 },
  closeBtn: { alignItems: "center", borderRadius: Radius.md, minHeight: 44, justifyContent: "center", marginTop: Spacing.xl },
});

type UserProfileSheetProps = {
  avatarFileId?: number | null;
  onClose: () => void;
  userId: number | null;
  username: string | null;
  visible: boolean;
};

export function UserProfileSheet({ avatarFileId, onClose, userId, username, visible }: UserProfileSheetProps) {
  const theme = useTheme();
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const profileQuery = useGetUserProfileQuery(mobileApiClient, userId ?? -1, {
    enabled: visible && typeof userId === "number" && userId > 0,
  });
  const profile = profileQuery.data?.data;
  const displayName = profile?.username ?? username ?? "未知用户";
  const displayUserId = profile?.userId ?? userId;
  const displayAvatarFileId = profile?.avatarFileId ?? avatarFileId;
  const avatarUrl = avatarThumbUrl(displayAvatarFileId);
  const avatarPreviewUrl = displayAvatarFileId ? mediaFileUrl(displayAvatarFileId, "image", "original") : "";

  return (
    <>
      <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={[styles.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <View style={styles.profileSection}>
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
                        <ThemedText style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>
                          {displayName.slice(0, 1).toUpperCase()}
                        </ThemedText>
                      </View>
                    )}
              </Pressable>
              <ThemedText type="title">{displayName}</ThemedText>
              <ThemedText themeColor="textSecondary">
                用户 ID:
                {displayUserId ?? "-"}
              </ThemedText>
              {profile?.description
                ? (
                    <ThemedText style={{ textAlign: "center" }} themeColor="textSecondary">
                      {profile.description}
                    </ThemedText>
                  )
                : null}
              {profile?.gender
                ? (
                    <ThemedText themeColor="textSecondary">
                      性别：
                      {profile.gender}
                    </ThemedText>
                  )
                : null}
              {profileQuery.isPending && visible
                ? (
                    <ThemedText type="caption" themeColor="textSecondary">正在加载完整资料…</ThemedText>
                  )
                : null}
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText>关闭</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <Modal
        visible={visible && avatarPreviewVisible}
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
    </>
  );
}
