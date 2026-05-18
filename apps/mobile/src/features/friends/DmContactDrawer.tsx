import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useGetUserProfileQuery } from "@tuanchat/query/users";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { avatarThumbUrl } from "@/lib/media-url";

const AVATAR_SIZE = 72;

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
  content: { alignItems: "center", gap: Spacing.lg, paddingTop: Spacing.xxxl, paddingHorizontal: Spacing.xl },
  avatar: { borderRadius: Radius.full, height: AVATAR_SIZE, width: AVATAR_SIZE },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: "#6366f1",
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    justifyContent: "center",
    width: AVATAR_SIZE,
  },
  infoRow: { alignItems: "center", gap: Spacing.sm, marginTop: Spacing.lg, width: "100%" },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 14 },
});

interface DmContactDrawerProps {
  contactId: number;
  contactName: string;
  contactAvatarFileId?: number;
  onClose: () => void;
}

export function DmContactDrawer({ contactId, contactName, contactAvatarFileId, onClose }: DmContactDrawerProps) {
  const theme = useTheme();
  const profileQuery = useGetUserProfileQuery(mobileApiClient, contactId, {
    enabled: contactId > 0,
  });
  const profile = profileQuery.data?.data;
  const displayName = profile?.username ?? contactName;
  const displayAvatarFileId = profile?.avatarFileId ?? contactAvatarFileId;
  const avatarUrl = avatarThumbUrl(displayAvatarFileId);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText type="heading" style={{ flex: 1 }}>个人资料</ThemedText>
        <Pressable onPress={onClose}>
          <ThemedText themeColor="accent">关闭</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <ThemedText style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>
              {displayName.slice(0, 1).toUpperCase()}
            </ThemedText>
          </View>
        )}

        <ThemedText type="title">{displayName}</ThemedText>

        <View style={styles.infoRow}>
          <ThemedText style={styles.infoLabel} themeColor="textSecondary">用户 ID</ThemedText>
          <ThemedText style={styles.infoValue}>{contactId}</ThemedText>
        </View>

        {profile?.description ? (
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel} themeColor="textSecondary">简介</ThemedText>
            <ThemedText style={[styles.infoValue, { textAlign: "center" }]}>{profile.description}</ThemedText>
          </View>
        ) : null}

        {profile?.gender ? (
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel} themeColor="textSecondary">性别</ThemedText>
            <ThemedText style={styles.infoValue}>{profile.gender}</ThemedText>
          </View>
        ) : null}

        {profileQuery.isPending ? (
          <ThemedText type="caption" themeColor="textSecondary">加载中…</ThemedText>
        ) : null}
      </ScrollView>
    </View>
  );
}
