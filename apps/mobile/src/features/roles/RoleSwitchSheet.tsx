import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

import { useRoleAvatarsQuery } from "./useRoleAvatarsQuery";

const AVATAR_SIZE = 36;
const AVATAR_GRID_SIZE = 52;

const styles = StyleSheet.create({
  sheet: {
    maxHeight: "70%",
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
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  avatarGridItem: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 2,
    height: AVATAR_GRID_SIZE,
    justifyContent: "center",
    width: AVATAR_GRID_SIZE,
  },
  avatarGridImage: {
    borderRadius: Radius.sm,
    height: AVATAR_GRID_SIZE - 6,
    width: AVATAR_GRID_SIZE - 6,
  },
  avatarSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xl,
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

function groupAvatarsByCategory(avatars: RoleAvatar[]): Map<string, RoleAvatar[]> {
  const map = new Map<string, RoleAvatar[]>();
  for (const avatar of avatars) {
    const cat = avatar.category ?? "默认";
    const list = map.get(cat);
    if (list)
      list.push(avatar);
    else map.set(cat, [avatar]);
  }
  return map;
}

interface RoleSwitchSheetProps {
  currentAvatarId: number | undefined;
  currentRoleId: number | undefined;
  customRoleName?: string;
  canSelectNarrator?: boolean;
  onChangeCustomRoleName?: (name: string) => void;
  onClose: () => void;
  onSelectAvatar: (avatarId: number | undefined, avatarFileId: number | undefined) => void;
  onSelectRole: (roleId: number | undefined) => void;
  roles: UserRole[];
  visible: boolean;
}

export function RoleSwitchSheet({
  currentAvatarId,
  currentRoleId,
  customRoleName,
  canSelectNarrator = false,
  onChangeCustomRoleName,
  onClose,
  onSelectAvatar,
  onSelectRole,
  roles,
  visible,
}: RoleSwitchSheetProps) {
  const theme = useTheme();
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);

  const myRoles = roles.filter(r => r.state !== 1);
  const isNarrator = currentRoleId === undefined || currentRoleId === -1;

  const activeExpandedRoleId = expandedRoleId ?? (currentRoleId && currentRoleId > 0 ? currentRoleId : null);
  const roleAvatarsQuery = useRoleAvatarsQuery(activeExpandedRoleId);
  const roleAvatars = useMemo(() => roleAvatarsQuery.data ?? [], [roleAvatarsQuery.data]);
  const groupedAvatars = useMemo(() => groupAvatarsByCategory(roleAvatars), [roleAvatars]);

  const handleSelectRole = (roleId: number) => {
    if (currentRoleId === roleId) {
      setExpandedRoleId(prev => prev === roleId ? null : roleId);
    }
    else {
      onSelectRole(roleId);
      onSelectAvatar(undefined, undefined);
      setExpandedRoleId(roleId);
    }
  };

  const handleSelectAvatar = (avatarId: number, avatarFileId: number | undefined) => {
    onSelectAvatar(avatarId, avatarFileId);
    onClose();
  };

  const handleSelectNarrator = () => {
    onSelectRole(undefined);
    onSelectAvatar(undefined, undefined);
    onClose();
  };

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="70%"
      onClose={onClose}
      sheetStyle={styles.sheet}
      visible={visible}
    >
      <ThemedText style={styles.title}>选择角色</ThemedText>

      {onChangeCustomRoleName != null
        ? (
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
          )
        : null}

      <ScrollView showsVerticalScrollIndicator={false}>
        {canSelectNarrator
          ? (
              <Pressable
                onPress={handleSelectNarrator}
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
            )
          : null}

        {myRoles.map((role) => {
          const isSelected = currentRoleId === role.roleId;
          const isExpanded = activeExpandedRoleId === role.roleId;
          return (
            <View key={role.roleId}>
              <Pressable
                onPress={() => handleSelectRole(role.roleId)}
                style={({ pressed }) => [styles.roleItem, pressed && { backgroundColor: theme.backgroundElement }]}
              >
                {role.avatarFileId
                  ? (
                      <Image source={{ uri: avatarThumbUrl(role.avatarFileId) }} style={styles.avatar} />
                    )
                  : (
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

              {isSelected && isExpanded
                ? (
                    <View>
                      {roleAvatarsQuery.isPending
                        ? (
                            <ActivityIndicator style={{ marginVertical: Spacing.md }} size="small" />
                          )
                        : roleAvatars.length === 0
                          ? (
                              <ThemedText type="caption" themeColor="textSecondary" style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm }}>
                                该角色暂无可选头像
                              </ThemedText>
                            )
                          : (
                              Array.from(groupedAvatars.entries()).map(([category, avatars]) => (
                                <View key={category}>
                                  {groupedAvatars.size > 1
                                    ? (
                                        <View style={styles.avatarSectionHeader}>
                                          <ThemedText type="caption" themeColor="textSecondary">{category}</ThemedText>
                                        </View>
                                      )
                                    : null}
                                  <View style={styles.avatarGrid}>
                                    {avatars.map((avatar) => {
                                      const isAvatarSelected = currentAvatarId === avatar.avatarId;
                                      return (
                                        <Pressable
                                          key={avatar.avatarId}
                                          onPress={() => handleSelectAvatar(avatar.avatarId!, avatar.avatarFileId)}
                                          style={[
                                            styles.avatarGridItem,
                                            { borderColor: isAvatarSelected ? theme.accent : "transparent" },
                                          ]}
                                        >
                                          <Image
                                            source={{ uri: avatarThumbUrl(avatar.avatarFileId) }}
                                            style={styles.avatarGridImage}
                                          />
                                        </Pressable>
                                      );
                                    })}
                                  </View>
                                </View>
                              ))
                            )}
                    </View>
                  )
                : null}
            </View>
          );
        })}

        {myRoles.length === 0
          ? (
              <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
                <ThemedText themeColor="textSecondary" type="small">当前房间没有可用角色</ThemedText>
              </View>
            )
          : null}
      </ScrollView>
    </BottomSheetModal>
  );
}
