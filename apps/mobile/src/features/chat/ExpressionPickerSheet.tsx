import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

const AVATAR_SIZE = 56;
const GRID_GAP = 12;

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "50%",
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: Spacing.xl,
    width: 36,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  item: {
    alignItems: "center",
    gap: 4,
    width: AVATAR_SIZE,
  },
  avatar: {
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    width: AVATAR_SIZE,
  },
  avatarFallback: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    justifyContent: "center",
    width: AVATAR_SIZE,
  },
});

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

interface ExpressionPickerSheetProps {
  onClose: () => void;
  onSelectExpression: (fileId: number, role: UserRole) => void;
  roles: UserRole[];
  visible: boolean;
}

export function ExpressionPickerSheet({
  onClose,
  onSelectExpression,
  roles,
  visible,
}: ExpressionPickerSheetProps) {
  const theme = useTheme();

  const rolesWithAvatars = roles.filter(r => r.avatarFileId && r.avatarFileId > 0);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <ThemedText style={styles.title}>表情 / 角色头像</ThemedText>

          <ScrollView showsVerticalScrollIndicator={false}>
            {rolesWithAvatars.length === 0 ? (
              <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
                <ThemedText themeColor="textSecondary" type="small">当前房间没有可用的角色头像</ThemedText>
              </View>
            ) : (
              <View style={styles.grid}>
                {rolesWithAvatars.map((role) => (
                  <Pressable
                    key={role.roleId}
                    onPress={() => { onSelectExpression(role.avatarFileId!, role); onClose(); }}
                    style={styles.item}
                  >
                    <Image
                      source={{ uri: avatarThumbUrl(role.avatarFileId) }}
                      style={styles.avatar}
                    />
                    <ThemedText numberOfLines={1} style={{ fontSize: 10, textAlign: "center", width: AVATAR_SIZE }} themeColor="textSecondary">
                      {role.roleName ?? ""}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
