import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { router } from "expo-router";
import { Check, CheckCircle, DiceSix, MagnifyingGlass, Trash, UserCircle, X } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { useMyRolesQuery } from "@/features/roles/useMyRolesQuery";
import { useDeleteRoleMutation } from "@/features/roles/useRoleMutations";
import { useTheme } from "@/hooks/use-theme";
import { confirmAction } from "@/lib/confirm";
import { avatarThumbUrl } from "@/lib/media-url";

const ROLE_LIST_AVATAR_SIZE = 48;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { gap: Spacing.xl, paddingBottom: 120, paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xxxl },
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  searchToolbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
  },
  searchBox: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
  },
  searchInput: {
    boxShadow: "none",
    flex: 1,
    fontSize: 15,
    outlineColor: "transparent",
    outlineStyle: "solid",
    outlineWidth: 0,
    paddingVertical: Spacing.sm,
  },
  clearSearchButton: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  toolbarActionButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  toolbarActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  roleItem: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  selectionBadge: {
    alignItems: "center",
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
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
  selected = false,
  selectionMode = false,
}: {
  backgroundColor: string;
  borderColor: string;
  onPress: () => void;
  role: UserRole;
  selected?: boolean;
  selectionMode?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selectionMode ? { selected } : undefined}
      onPress={onPress}
      style={[
        styles.roleItem,
        {
          backgroundColor: selected ? theme.accentMuted : backgroundColor,
          borderColor: selected ? theme.accent : borderColor,
        },
      ]}
    >
      {selectionMode
        ? (
            <View
              style={[
                styles.selectionBadge,
                {
                  backgroundColor: selected ? theme.accent : "transparent",
                  borderColor: selected ? theme.accent : theme.textSecondary,
                },
              ]}
            >
              {selected ? <Check color="#fff" size={13} weight="bold" /> : null}
            </View>
          )
        : null}
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

function matchesRoleSearch(role: UserRole, keyword: string) {
  if (!keyword)
    return true;

  return [
    role.roleName,
    role.description,
    typeof role.roleId === "number" ? `#${role.roleId}` : undefined,
    typeof role.roleId === "number" ? String(role.roleId) : undefined,
  ].some(value => (value ?? "").toLocaleLowerCase().includes(keyword));
}

export default function RoleScreen() {
  const theme = useTheme();
  const { session } = useAuthSession();
  const userId = session?.userId ?? null;
  const myRolesQuery = useMyRolesQuery(userId);
  const deleteRoleMutation = useDeleteRoleMutation();
  const roleCardBackground = theme.backgroundElement;
  const diceCardBackground = theme.surface;

  const allRoles = useMemo(() => myRolesQuery.data ?? [], [myRolesQuery.data]);
  const [searchText, setSearchText] = useState("");
  const searchKeyword = searchText.trim().toLocaleLowerCase();
  const isSearching = searchKeyword.length > 0;
  const normalRoles = useMemo(
    () => sortByTimeDesc(allRoles.filter(r => r.type === 0 && r.state !== 1 && matchesRoleSearch(r, searchKeyword))),
    [allRoles, searchKeyword],
  );
  const diceRoles = useMemo(
    () => sortByTimeDesc(allRoles.filter(r => r.type === 1 && r.state !== 1 && matchesRoleSearch(r, searchKeyword))),
    [allRoles, searchKeyword],
  );
  const hasDiceRoles = allRoles.some(r => r.type === 1 && r.state !== 1);

  const [rolesCollapsed, setRolesCollapsed] = useState(false);
  const [diceCollapsed, setDiceCollapsed] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(() => new Set());
  const selectedRoleCount = selectedRoleIds.size;

  const handleOpenCreate = () => {
    router.push("/role-edit");
  };

  const handleOpenTrash = () => {
    router.push("/role-trash" as any);
  };

  const toggleRoleSelection = useCallback((roleId: number) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      }
      else {
        next.add(roleId);
      }
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedRoleIds(new Set());
  }, []);

  const handleOpenEdit = useCallback((role: UserRole) => {
    if (selectionMode) {
      toggleRoleSelection(role.roleId);
      return;
    }
    router.push({ pathname: "/role-edit", params: { roleId: String(role.roleId) } });
  }, [selectionMode, toggleRoleSelection]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedRoleCount === 0 || deleteRoleMutation.isPending) {
      return;
    }

    const roleIds = Array.from(selectedRoleIds);
    const confirmed = await confirmAction({
      confirmText: "删除",
      destructive: true,
      message: `确定要删除选中的 ${roleIds.length} 个角色吗？删除后会进入回收站。`,
      title: "删除角色",
    });
    if (!confirmed) {
      return;
    }

    try {
      await deleteRoleMutation.mutateAsync(roleIds);
      exitSelectionMode();
    }
    catch (error: any) {
      Alert.alert("删除失败", error?.message ?? "请稍后重试");
    }
  }, [deleteRoleMutation, exitSelectionMode, selectedRoleCount, selectedRoleIds]);

  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, []);

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

          <View style={styles.searchToolbar}>
            <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <MagnifyingGlass color={theme.textSecondary} size={18} weight="bold" />
              <TextInput
                onChangeText={setSearchText}
                placeholder="搜索角色、骰娘"
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text }]}
                value={searchText}
              />
              {searchText.length > 0
                ? (
                    <Pressable
                      accessibilityLabel="清空搜索"
                      accessibilityRole="button"
                      onPress={() => setSearchText("")}
                      style={styles.clearSearchButton}
                    >
                      <X color={theme.textSecondary} size={16} weight="bold" />
                    </Pressable>
                  )
                : null}
            </View>
            {selectionMode
              ? (
                  <View style={styles.toolbarActions}>
                    <Pressable
                      accessibilityLabel="删除选中角色"
                      accessibilityRole="button"
                      disabled={selectedRoleCount === 0 || deleteRoleMutation.isPending}
                      onPress={handleBatchDelete}
                      style={[
                        styles.toolbarActionButton,
                        {
                          backgroundColor: selectedRoleCount === 0 || deleteRoleMutation.isPending ? theme.backgroundElement : theme.dangerMuted,
                          borderColor: selectedRoleCount === 0 || deleteRoleMutation.isPending ? theme.border : theme.danger,
                          opacity: selectedRoleCount === 0 || deleteRoleMutation.isPending ? 0.5 : 1,
                        },
                      ]}
                    >
                      {deleteRoleMutation.isPending
                        ? <ActivityIndicator color={theme.danger} size="small" />
                        : <Trash color={selectedRoleCount === 0 ? theme.textSecondary : theme.danger} size={20} weight="bold" />}
                    </Pressable>
                    <Pressable
                      accessibilityLabel="退出选择模式"
                      accessibilityRole="button"
                      onPress={exitSelectionMode}
                      style={[styles.toolbarActionButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                    >
                      <X color={theme.text} size={20} weight="bold" />
                    </Pressable>
                  </View>
                )
              : (
                  <View style={styles.toolbarActions}>
                    <Pressable
                      accessibilityLabel="打开角色回收站"
                      accessibilityRole="button"
                      onPress={handleOpenTrash}
                      style={[styles.toolbarActionButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                    >
                      <Trash color={theme.textSecondary} size={20} weight="bold" />
                    </Pressable>
                    <Pressable
                      accessibilityLabel="进入选择模式"
                      accessibilityRole="button"
                      onPress={enterSelectionMode}
                      style={[styles.toolbarActionButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                    >
                      <CheckCircle color={theme.text} size={24} weight="bold" />
                    </Pressable>
                  </View>
                )}
          </View>

          {myRolesQuery.isPending
            ? (
                <View style={styles.stateBlock}>
                  <ActivityIndicator color={theme.accent} />
                </View>
              )
            : (
                <>
                  {hasDiceRoles
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
                          {(!diceCollapsed || isSearching) && (
                            diceRoles.length === 0
                              ? (
                                  <View style={[styles.emptyCard, { backgroundColor: diceCardBackground, borderColor: theme.border }]}>
                                    <ThemedText themeColor="textSecondary" type="small">无匹配骰娘</ThemedText>
                                  </View>
                                )
                              : (
                                  diceRoles.map(role => (
                                    <RoleListItem
                                      key={role.roleId}
                                      backgroundColor={diceCardBackground}
                                      borderColor={theme.border}
                                      selected={selectedRoleIds.has(role.roleId)}
                                      selectionMode={selectionMode}
                                      role={role}
                                      onPress={() => handleOpenEdit(role)}
                                    />
                                  ))
                                )
                          )}
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
                    {(!rolesCollapsed || isSearching) && (
                      normalRoles.length === 0
                        ? (
                            <View style={[styles.emptyCard, { backgroundColor: roleCardBackground, borderColor: theme.border }]}>
                              <ThemedText themeColor="textSecondary" type="small">{isSearching ? "无匹配角色" : "暂无角色"}</ThemedText>
                            </View>
                          )
                        : (
                            normalRoles.map(role => (
                              <RoleListItem
                                key={role.roleId}
                                backgroundColor={roleCardBackground}
                                borderColor={theme.border}
                                selected={selectedRoleIds.has(role.roleId)}
                                selectionMode={selectionMode}
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
