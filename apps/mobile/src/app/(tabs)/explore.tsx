import { buildAccountInviteRegisterUrl } from "@tuanchat/domain/account-invite";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/use-current-user-query";
import { MOBILE_MESSAGE_ATTACHMENT_KIND, pickMobileMessageAttachments } from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import { useMobileNotificationSession } from "@/features/notifications/mobileNotificationSessionContext";
import { NotificationDeliveryDiagnosticsCard } from "@/features/notifications/NotificationDeliveryDiagnosticsCard";
import { NotificationPreferencesCard } from "@/features/notifications/NotificationPreferencesCard";
import { useNotificationPreferences } from "@/features/notifications/useNotificationPreferences";
import { useUpdateProfileMutation } from "@/features/profile/useUpdateProfileMutation";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { setStringAsync } from "@/lib/clipboard";
import { avatarThumbUrl, mediaFileUrl } from "@/lib/media-url";

const AVATAR_SIZE = 120;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { gap: Spacing.xxl, paddingBottom: 120, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl },
  profileHeader: { alignItems: "center", gap: Spacing.lg },
  avatar: { borderRadius: Radius.full, height: AVATAR_SIZE, width: AVATAR_SIZE },
  avatarFallback: { alignItems: "center", backgroundColor: "#6366f1", borderRadius: Radius.full, height: AVATAR_SIZE, justifyContent: "center", width: AVATAR_SIZE },
  card: { borderRadius: Radius.lg, gap: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
  cardTitle: { marginBottom: Spacing.sm },
  fieldRow: { gap: Spacing.sm },
  fieldLabel: { fontSize: 12 },
  fieldInput: { borderRadius: Radius.md, borderWidth: 1, fontSize: 15, minHeight: 40, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  inviteCodeBox: { borderRadius: Radius.md, borderWidth: 1, gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  inviteCodeText: { fontSize: 24, fontWeight: "700", letterSpacing: 2 },
  saveButton: { alignItems: "center", borderRadius: Radius.md, minHeight: 44, justifyContent: "center", paddingHorizontal: Spacing.xl },
  logoutButton: { alignItems: "center", borderRadius: Radius.md, minHeight: 48, justifyContent: "center" },
});

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, isAuthenticated, isBootstrapping, signOut } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const user = currentUserQuery.data?.data;
  const userId = user?.userId ?? session?.userId ?? null;

  const updateMutation = useUpdateProfileMutation();
  const notifPrefs = useNotificationPreferences();
  const { notificationPermissionStatus, refreshNotificationPermissionStatus } = useMobileNotificationSession();

  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const [inviteShareFeedback, setInviteShareFeedback] = useState("");

  const startEditing = () => {
    setEditUsername(user?.username ?? "");
    setEditDescription(user?.description ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!userId)
      return;
    try {
      await updateMutation.mutateAsync({
        userId,
        username: editUsername.trim() || undefined,
        description: editDescription.trim() || undefined,
      });
      setEditing(false);
    }
    catch (e: any) {
      Alert.alert("保存失败", e?.message ?? "请稍后重试");
    }
  };

  const handlePickAvatar = async () => {
    if (!userId || avatarUploading)
      return;
    setAvatarUploading(true);
    try {
      const [picked] = await pickMobileMessageAttachments(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE);
      if (!picked)
        return;
      const uploaded = await uploadMobileMessageAttachments(mobileApiClient, [picked]);
      const avatarFileId = uploaded.uploadedImages[0]?.fileId;
      if (!avatarFileId) {
        throw new Error("头像上传失败。");
      }
      await updateMutation.mutateAsync({
        userId,
        username: user?.username,
        description: user?.description,
        gender: user?.gender,
        avatarFileId,
      });
      await currentUserQuery.refetch();
    }
    catch (e: any) {
      Alert.alert("更换头像失败", e?.message ?? "请稍后重试");
    }
    finally {
      setAvatarUploading(false);
    }
  };

  const avatarThumbSrc = avatarThumbUrl(user?.avatarFileId);
  const avatarPreviewSrc = user?.avatarFileId ? mediaFileUrl(user.avatarFileId, "image", "original") : "";
  const inviteCode = user?.inviteCode ?? "";
  const inviteRegisterLink = buildAccountInviteRegisterUrl(inviteCode, "https://tuan.chat");

  const showInviteShareFeedback = (message: string) => {
    setInviteShareFeedback(message);
    setTimeout(setInviteShareFeedback, 1800, "");
  };

  const handleShareInviteLink = async () => {
    if (!inviteRegisterLink) {
      Alert.alert("邀请码未生成", "请稍后重试。");
      return;
    }

    try {
      if (Platform.OS === "web") {
        const copied = await setStringAsync(inviteRegisterLink);
        if (!copied) {
          throw new Error("复制失败");
        }
        showInviteShareFeedback("已复制注册链接");
        return;
      }
      await Share.share({
        title: "团剧共创邀请",
        message: `来团剧共创一起创作：${inviteRegisterLink}`,
      });
      showInviteShareFeedback("已打开分享");
    }
    catch (e: any) {
      Alert.alert("分享失败", e?.message ?? "请稍后重试");
    }
  };

  if (isBootstrapping) {
    return (
      <ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xxl }}>
        <ThemedText>请先登录</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Profile Header */}
          <View style={[styles.profileHeader]}>
            <Pressable
              accessibilityLabel="查看头像预览"
              accessibilityRole="button"
              accessibilityState={{ disabled: !avatarThumbSrc }}
              disabled={!avatarThumbSrc}
              onPress={() => avatarThumbSrc && setAvatarPreviewVisible(true)}
            >
              {avatarThumbSrc
                ? (
                    <CachedImage uri={avatarThumbSrc} style={styles.avatar} />
                  )
                : (
                    <View style={styles.avatarFallback}>
                      <ThemedText style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>
                        {(user?.username ?? "U").slice(0, 1).toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
            </Pressable>
            {avatarUploading
              ? (
                  <ThemedText type="caption" themeColor="textSecondary">正在上传头像…</ThemedText>
                )
              : null}
            <ThemedText type="title">{user?.username ?? "加载中…"}</ThemedText>
            {user?.description
              ? (
                  <ThemedText themeColor="textSecondary">{user.description}</ThemedText>
                )
              : null}
          </View>

          {/* Feedback */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>问题反馈</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              遇到问题时可以在这里查看运行日志并分享给开发者
            </ThemedText>
            <Pressable
              onPress={() => router.push("/feedback" as any)}
              style={[styles.saveButton, { backgroundColor: theme.backgroundSelected }]}
            >
              <ThemedText>查看日志 / 反馈问题</ThemedText>
            </Pressable>
          </ThemedView>

          {/* Invite Code */}
          {inviteCode
            ? (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold" style={styles.cardTitle}>邀请码</ThemedText>
                  <View style={[styles.inviteCodeBox, { borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={styles.inviteCodeText}>{inviteCode}</ThemedText>
                  </View>
                  <Pressable
                    onPress={() => void handleShareInviteLink()}
                    style={[styles.saveButton, { backgroundColor: theme.accent }]}
                  >
                    <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                      {inviteShareFeedback || "分享注册链接"}
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              )
            : null}

          {/* Edit Profile */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>个人信息</ThemedText>
            {editing
              ? (
                  <View style={{ gap: Spacing.lg }}>
                    <View style={styles.fieldRow}>
                      <ThemedText themeColor="textSecondary" style={styles.fieldLabel}>用户名</ThemedText>
                      <TextInput
                        accessibilityLabel="用户名"
                        value={editUsername}
                        onChangeText={setEditUsername}
                        style={[styles.fieldInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
                        placeholderTextColor={theme.textSecondary}
                        placeholder="输入用户名"
                      />
                    </View>
                    <View style={styles.fieldRow}>
                      <ThemedText themeColor="textSecondary" style={styles.fieldLabel}>个人简介</ThemedText>
                      <TextInput
                        accessibilityLabel="个人简介"
                        value={editDescription}
                        onChangeText={setEditDescription}
                        style={[styles.fieldInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background, minHeight: 60 }]}
                        placeholderTextColor={theme.textSecondary}
                        placeholder="介绍一下自己"
                        multiline
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: Spacing.md }}>
                      <Pressable
                        accessibilityLabel="取消编辑个人信息"
                        accessibilityRole="button"
                        onPress={() => setEditing(false)}
                        style={[styles.saveButton, { flex: 1, backgroundColor: theme.backgroundSelected }]}
                      >
                        <ThemedText>取消</ThemedText>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="保存个人信息"
                        accessibilityRole="button"
                        accessibilityState={{ busy: updateMutation.isPending, disabled: updateMutation.isPending }}
                        onPress={() => void handleSave()}
                        disabled={updateMutation.isPending}
                        style={[styles.saveButton, { flex: 1, backgroundColor: theme.accent }]}
                      >
                        <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                          {updateMutation.isPending ? "保存中…" : "保存"}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                )
              : (
                  <View style={{ gap: Spacing.md }}>
                    <View style={[styles.saveButton, { backgroundColor: theme.backgroundSelected, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                      <ThemedText themeColor="textSecondary">用户名</ThemedText>
                      <ThemedText>{user?.username ?? "-"}</ThemedText>
                    </View>
                    <View
                      style={[styles.saveButton, { backgroundColor: theme.backgroundSelected, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
                      accessibilityLabel={`简介：${user?.description || "未填写"}`}
                    >
                      <ThemedText themeColor="textSecondary">简介</ThemedText>
                      <ThemedText numberOfLines={1} style={{ flex: 1, textAlign: "right", marginLeft: Spacing.md }}>{user?.description || "未填写"}</ThemedText>
                    </View>
                    <Pressable
                      onPress={startEditing}
                      style={[styles.saveButton, { backgroundColor: theme.backgroundSelected }]}
                    >
                      <ThemedText>编辑</ThemedText>
                    </Pressable>
                  </View>
              )}
          </ThemedView>

          <NotificationPreferencesCard
            onRefreshPermissionStatus={refreshNotificationPermissionStatus}
            prefs={notifPrefs.prefs}
            permissionStatus={notificationPermissionStatus}
            onUpdate={patch => void notifPrefs.update(patch)}
          />

          <NotificationDeliveryDiagnosticsCard
            onRefreshPermissionStatus={refreshNotificationPermissionStatus}
            permissionStatus={notificationPermissionStatus}
          />

          {/* Account Security */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>账号安全</ThemedText>
            <View style={{ gap: Spacing.md }}>
              <View style={[styles.saveButton, { backgroundColor: theme.backgroundSelected, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                <ThemedText themeColor="textSecondary">账号ID</ThemedText>
                <ThemedText>{userId ?? "-"}</ThemedText>
              </View>
              {user?.email
                ? (
                    <View style={[styles.saveButton, { backgroundColor: theme.backgroundSelected, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                      <ThemedText themeColor="textSecondary">邮箱</ThemedText>
                      <ThemedText>{user.email}</ThemedText>
                    </View>
                  )
                : (
                    <Pressable
                      onPress={() => Alert.alert("绑定邮箱", "请在网页端完成邮箱绑定操作。")}
                      style={[styles.saveButton, { backgroundColor: theme.backgroundSelected }]}
                    >
                      <ThemedText>绑定邮箱</ThemedText>
                    </Pressable>
                  )}
              <Pressable
                onPress={() => Alert.alert("修改密码", "请在网页端完成密码修改操作。")}
                style={[styles.saveButton, { backgroundColor: theme.backgroundSelected }]}
              >
                <ThemedText>修改密码</ThemedText>
              </Pressable>
            </View>
          </ThemedView>

          {/* Logout */}
          <Pressable onPress={() => void signOut()} style={[styles.logoutButton, { backgroundColor: theme.dangerMuted }]}>
            <ThemedText style={{ color: theme.danger, fontWeight: "600" }}>退出登录</ThemedText>
          </Pressable>
        </ScrollView>

        {/* Avatar Preview Modal */}
        <Modal
          visible={avatarPreviewVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAvatarPreviewVisible(false)}
        >
          <Pressable
            accessibilityLabel="关闭头像预览"
            accessibilityRole="button"
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center", justifyContent: "center" }}
            onPress={() => setAvatarPreviewVisible(false)}
          >
            {avatarPreviewSrc
              ? (
                  <CachedImage
                    accessibilityLabel="当前头像预览"
                    uri={avatarPreviewSrc}
                    style={{ width: 280, height: 280, borderRadius: Radius.lg }}
                    contentFit="cover"
                  />
                )
              : null}
            <Pressable
              accessibilityLabel="更换头像"
              accessibilityRole="button"
              onPress={() => { setAvatarPreviewVisible(false); void handlePickAvatar(); }}
              style={[styles.saveButton, { borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", backgroundColor: "transparent", marginTop: Spacing.xxl, paddingHorizontal: Spacing.xxl }]}
            >
              <ThemedText style={{ color: "rgba(255,255,255,0.8)" }}>更换头像</ThemedText>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}
