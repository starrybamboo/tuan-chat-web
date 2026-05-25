import { router } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { useMyRolesQuery } from "@/features/roles/useMyRolesQuery";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { gap: Spacing.xl, paddingBottom: 120, paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xxxl },
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roleItem: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  roleAvatar: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  stateBlock: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  createButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  sectionHeader: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  roleSection: {
    gap: Spacing.md,
  },
  collapseArrow: {
    fontSize: 12,
    paddingHorizontal: Spacing.sm,
  },
  emptyCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
});

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

function getRoleColor(roleId: number) {
  return AVATAR_COLORS[roleId % AVATAR_COLORS.length];
}

function RoleListItem({
  backgroundColor,
  borderColor,
  onPress,
  role,
}: {
  backgroundColor: string;
  borderColor: string;
  onPress: () => void;
  role: UserRole;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.roleItem, { backgroundColor, borderColor }]}>
      {role.avatarFileId
        ? (
            <CachedImage uri={avatarThumbUrl(role.avatarFileId)} style={styles.roleAvatar} />
          )
        : (
            <View style={[styles.roleAvatar, { backgroundColor: getRoleColor(role.roleId) }]}>
              <ThemedText style={styles.avatarText}>
                {(role.roleName ?? "").slice(0, 1) || "R"}
              </ThemedText>
            </View>
          )}
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold">{role.roleName ?? `角色 #${role.roleId}`}</ThemedText>
        {role.description
          ? (
              <ThemedText themeColor="textSecondary" type="caption" numberOfLines={1}>
                {role.description}
              </ThemedText>
            )
          : null}
      </View>
    </Pressable>
  );
}

function RoleSectionHeader({
  accentColor,
  backgroundColor,
  borderColor,
  collapsed,
  count,
  onPress,
  title,
}: {
  accentColor: string;
  backgroundColor: string;
  borderColor: string;
  collapsed: boolean;
  count: number;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.sectionHeader, { backgroundColor, borderColor }]}>
      <ThemedText type="heading" style={{ color: accentColor }}>
        {`${title} (${count})`}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.collapseArrow}>
        {collapsed ? "▶" : "▼"}
      </ThemedText>
    </Pressable>
  );
}

function sortByTimeDesc(roles: UserRole[]) {
  return [...roles].sort((a, b) => {
    const ta = a.createTime ?? "";
    const tb = b.createTime ?? "";
    return tb.localeCompare(ta);
  });
}

export default function RoleScreen() {
  const theme = useTheme();
  const { session } = useAuthSession();
  const userId = session?.userId ?? null;
  const myRolesQuery = useMyRolesQuery(userId);
  const roleCardBackground = theme.backgroundElement;
  const diceCardBackground = theme.surface;

  const allRoles = myRolesQuery.data ?? [];
  const normalRoles = sortByTimeDesc(allRoles.filter(r => r.type === 0 && r.state !== 1));
  const diceRoles = sortByTimeDesc(allRoles.filter(r => r.type === 1 && r.state !== 1));

  const [rolesCollapsed, setRolesCollapsed] = useState(false);
  const [diceCollapsed, setDiceCollapsed] = useState(false);

  const handleOpenCreate = () => {
    router.push("/role-edit");
  };

  const handleOpenEdit = (role: UserRole) => {
    router.push({ pathname: "/role-edit", params: { roleId: String(role.roleId) } });
  };

  const toggleRoles = useCallback(() => setRolesCollapsed(v => !v), []);
  const toggleDice = useCallback(() => setDiceCollapsed(v => !v), []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View>
              <ThemedText type="title">角色</ThemedText>
              <ThemedText themeColor="textSecondary">我创建的所有角色</ThemedText>
            </View>
            <Pressable onPress={handleOpenCreate} style={[styles.createButton, { borderColor: theme.accent }]}>
              <ThemedText themeColor="accent" type="small">+ 创建</ThemedText>
            </Pressable>
          </View>

          {myRolesQuery.isPending
            ? (
                <View style={styles.stateBlock}>
                  <ActivityIndicator color={theme.accent} />
                </View>
              )
            : (
                <>
                  <View style={styles.roleSection}>
                    <RoleSectionHeader
                      accentColor={theme.accent}
                      backgroundColor={theme.accentMuted}
                      borderColor={theme.accent}
                      collapsed={rolesCollapsed}
                      count={normalRoles.length}
                      onPress={toggleRoles}
                      title="角色"
                    />
                    {!rolesCollapsed && (
                      normalRoles.length === 0
                        ? (
                            <View style={[styles.emptyCard, { backgroundColor: roleCardBackground, borderColor: theme.border }]}>
                              <ThemedText themeColor="textSecondary" type="small">暂无角色</ThemedText>
                            </View>
                          )
                        : (
                            normalRoles.map(role => (
                              <RoleListItem
                                key={role.roleId}
                                backgroundColor={roleCardBackground}
                                borderColor={theme.border}
                                role={role}
                                onPress={() => handleOpenEdit(role)}
                              />
                            ))
                          )
                    )}
                  </View>

                  {diceRoles.length > 0
                    ? (
                        <View style={styles.roleSection}>
                          <RoleSectionHeader
                            accentColor={theme.success}
                            backgroundColor={theme.successMuted}
                            borderColor={theme.success}
                            collapsed={diceCollapsed}
                            count={diceRoles.length}
                            onPress={toggleDice}
                            title="骰娘"
                          />
                          {!diceCollapsed && diceRoles.map(role => (
                            <RoleListItem
                              key={role.roleId}
                              backgroundColor={diceCardBackground}
                              borderColor={theme.border}
                              role={role}
                              onPress={() => handleOpenEdit(role)}
                            />
                          ))}
                        </View>
                      )
                    : null}
                </>
              )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
