import { router } from "expo-router";
import { DiceSix, UserCircle } from "phosphor-react-native";
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

const ROLE_LIST_AVATAR_SIZE = 48;

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
    height: ROLE_LIST_AVATAR_SIZE,
    justifyContent: "center",
    width: ROLE_LIST_AVATAR_SIZE,
  },
  avatarText: {
    color: "#fff",
    fontSize: 15,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingVertical: Spacing.lg,
  },
  sectionHeaderLabel: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  sectionHeaderIcon: {
    flexShrink: 0,
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
  collapsed,
  count,
  Icon,
  dividerColor,
  iconColor,
  onPress,
  title,
}: {
  collapsed: boolean;
  count: number;
  Icon: typeof UserCircle;
  dividerColor: string;
  iconColor: string;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.sectionHeader, { borderBottomColor: dividerColor }]}>
      <View style={styles.sectionHeaderLabel}>
        <Icon color={iconColor} size={20} weight="fill" style={styles.sectionHeaderIcon} />
        <ThemedText type="heading">
          {`${title} (${count})`}
        </ThemedText>
      </View>
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
  const [diceCollapsed, setDiceCollapsed] = useState(true);

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
                  {diceRoles.length > 0
                    ? (
                        <View style={styles.roleSection}>
                          <RoleSectionHeader
                            collapsed={diceCollapsed}
                            count={diceRoles.length}
                            Icon={DiceSix}
                            dividerColor={theme.border}
                            iconColor={theme.textSecondary}
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

                  <View style={styles.roleSection}>
                    <RoleSectionHeader
                      collapsed={rolesCollapsed}
                      count={normalRoles.length}
                      Icon={UserCircle}
                      dividerColor={theme.border}
                      iconColor={theme.textSecondary}
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
                </>
              )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
