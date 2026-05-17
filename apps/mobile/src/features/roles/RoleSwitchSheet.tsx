import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

const AVATAR_SIZE = 36;

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "60%",
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
  customNameInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  roleItem: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    minHeight: 52,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  avatar: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    justifyContent: "center",
    width: AVATAR_SIZE,
  },
  avatarText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  roleInfo: {
    flex: 1,
    gap: 2,
  },
  selectedDot: {
    borderRadius: Radius.full,
    height: 8,
    width: 8,
  },
  narratorItem: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    minHeight: 52,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
});

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

function getRoleColor(roleId: number) {
  return AVATAR_COLORS[roleId % AVATAR_COLORS.length];
}

function getRoleTypeLabel(type: number): string {
  switch (type) {
    case 0: return "角色";
    case 1: return "骰娘";
    case 2: return "NPC";
    default: return "";
  }
}

interface RoleSwitchSheetProps {
  currentRoleId: number | undefined;
  customRoleName?: string;
  canSelectNarrator?: boolean;
  onChangeCustomRoleName?: (name: string) => void;
  onClose: () => void;
  onSelectRole: (roleId: number | undefined) => void;
  roles: UserRole[];
  visible: boolean;
}

export function RoleSwitchSheet({
  currentRoleId,
  customRoleName,
  canSelectNarrator = false,
  onChangeCustomRoleName,
  onClose,
  onSelectRole,
  roles,
  visible,
}: RoleSwitchSheetProps) {
  const theme = useTheme();

  const myRoles = roles.filter(r => r.state !== 1);
  const isNarrator = currentRoleId === undefined || currentRoleId === -1;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <ThemedText style={styles.title}>选择角色</ThemedText>

          {onChangeCustomRoleName != null ? (
            <TextInput
              onChangeText={onChangeCustomRoleName}
              placeholder="自定义角色名（可选）"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.customNameInput,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={customRoleName ?? ""}
            />
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false}>
            {canSelectNarrator ? (
              <Pressable
                onPress={() => { onSelectRole(undefined); onClose(); }}
                style={({ pressed }) => [styles.narratorItem, pressed && { backgroundColor: theme.backgroundElement }]}
              >
                <View style={[styles.avatar, { backgroundColor: "#6366f1" }]}>
                  <ThemedText style={styles.avatarText}>旁</ThemedText>
                </View>
                <View style={styles.roleInfo}>
                  <ThemedText type="smallBold">旁白</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">主持旁白发言</ThemedText>
                </View>
                {isNarrator ? <View style={[styles.selectedDot, { backgroundColor: theme.accent }]} /> : null}
              </Pressable>
            ) : null}

            {myRoles.map((role) => {
              const isSelected = currentRoleId === role.roleId;
              return (
                <Pressable
                  key={role.roleId}
                  onPress={() => { onSelectRole(role.roleId); onClose(); }}
                  style={({ pressed }) => [styles.roleItem, pressed && { backgroundColor: theme.backgroundElement }]}
                >
                  {role.avatarFileId ? (
                    <Image source={{ uri: avatarThumbUrl(role.avatarFileId) }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: getRoleColor(role.roleId) }]}>
                      <ThemedText style={styles.avatarText}>
                        {(role.roleName ?? "").slice(0, 1) || "R"}
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.roleInfo}>
                    <ThemedText type="smallBold">{role.roleName ?? `角色 #${role.roleId}`}</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">{getRoleTypeLabel(role.type)}</ThemedText>
                  </View>
                  {isSelected ? <View style={[styles.selectedDot, { backgroundColor: theme.accent }]} /> : null}
                </Pressable>
              );
            })}

            {myRoles.length === 0 ? (
              <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
                <ThemedText themeColor="textSecondary" type="small">当前房间没有可用角色</ThemedText>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
