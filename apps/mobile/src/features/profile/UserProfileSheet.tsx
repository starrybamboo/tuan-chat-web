import { Galeria } from "@nandorojo/galeria";
import { useGetUserProfileQuery } from "@tuanchat/query/users";
import { Pressable, StyleSheet, View } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { avatarThumbUrl, mediaFileUrl } from "@/lib/media-url";

const AVATAR_SIZE = 64;

const styles = StyleSheet.create({
  profileSection: { alignItems: "center", gap: Spacing.lg, paddingVertical: Spacing.xl },
  avatar: { borderRadius: Radius.full, height: AVATAR_SIZE, width: AVATAR_SIZE },
  avatarFallback: { alignItems: "center", backgroundColor: "#6366f1", borderRadius: Radius.full, height: AVATAR_SIZE, justifyContent: "center", width: AVATAR_SIZE },
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
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      onClose={onClose}
      visible={visible}
    >
        <View style={styles.profileSection}>
          {avatarUrl && avatarPreviewUrl
            ? (
                <Galeria urls={[avatarPreviewUrl]}>
                  <Galeria.Image>
                    <View accessible accessibilityLabel="查看用户头像" accessibilityRole="imagebutton">
                      <CachedImage uri={avatarUrl} style={styles.avatar} />
                    </View>
                  </Galeria.Image>
                </Galeria>
              )
            : (
                <View style={styles.avatarFallback}>
                  <ThemedText style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>
                    {displayName.slice(0, 1).toUpperCase()}
                  </ThemedText>
                </View>
              )}
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
        <Pressable
          accessibilityLabel="关闭用户资料"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={[styles.closeBtn, { backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText>关闭</ThemedText>
        </Pressable>
    </BottomSheetModal>
  );
}
