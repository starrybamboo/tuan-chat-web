import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { router } from "expo-router";
import { ArrowClockwise, CaretLeft, MagnifyingGlass, Trash, X } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useClearRoleTrashMutation, useHardDeleteRolesMutation } from "@/features/roles/useRoleMutations";
import { useRoleTrashQuery } from "@/features/roles/useRoleTrashQuery";
import { useTheme } from "@/hooks/use-theme";
import { confirmAction } from "@/lib/confirm";
import { avatarThumbUrl } from "@/lib/media-url";

const ROLE_TRASH_AVATAR_SIZE = 44;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 52,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  headerBackButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    left: Spacing.lg,
    position: "absolute",
    width: 36,
  },
  headerActionButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    right: Spacing.lg,
    width: 36,
  },
  content: {
    gap: Spacing.xl,
    paddingBottom: 120,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  listHeader: {
    gap: Spacing.xl,
  },
  intro: {
    gap: Spacing.sm,
  },
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
  roleItem: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  roleAvatar: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: ROLE_TRASH_AVATAR_SIZE,
    justifyContent: "center",
    width: ROLE_TRASH_AVATAR_SIZE,
  },
  avatarText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  roleMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: 2,
  },
  roleTypeBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  stateBlock: {
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
});

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

function getRoleColor(roleId: number) {
  return AVATAR_COLORS[roleId % AVATAR_COLORS.length];
}

function getRoleTypeLabel(type?: number): string {
  if (type === 1) {
    return "骰娘";
  }
  if (type === 2) {
    return "NPC";
  }
  return "角色";
}

function RoleTrashItem({
  isDeleting,
  onHardDelete,
  role,
}: {
  isDeleting: boolean;
  onHardDelete: (role: UserRole) => void;
  role: UserRole;
}) {
  const theme = useTheme();
  const avatarUri = avatarThumbUrl(role.avatarFileId);

  return (
    <View style={[styles.roleItem, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {avatarUri
        ? (
            <CachedImage uri={avatarUri} style={styles.roleAvatar} />
          )
        : (
            <View style={[styles.roleAvatar, { backgroundColor: getRoleColor(role.roleId) }]}>
              <ThemedText style={styles.avatarText}>
                {(role.roleName ?? "").slice(0, 1) || "R"}
              </ThemedText>
            </View>
          )}
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {role.roleName ?? `角色 #${role.roleId}`}
        </ThemedText>
        <View style={styles.roleMetaRow}>
          <View style={[styles.roleTypeBadge, { backgroundColor: theme.dangerMuted }]}>
            <ThemedText type="caption" style={{ color: theme.danger }}>{getRoleTypeLabel(role.type)}</ThemedText>
          </View>
          <ThemedText themeColor="textSecondary" type="caption" numberOfLines={1}>
            #
            {role.roleId}
          </ThemedText>
        </View>
      </View>
      <Pressable
        accessibilityLabel="硬删除角色"
        accessibilityRole="button"
        disabled={isDeleting}
        onPress={() => onHardDelete(role)}
        style={{ opacity: isDeleting ? 0.45 : 1, padding: Spacing.sm }}
      >
        {isDeleting
          ? <ActivityIndicator color={theme.danger} size="small" />
          : <Trash color={theme.danger} size={20} weight="bold" />}
      </Pressable>
    </View>
  );
}

export default function RoleTrashScreen() {
  const theme = useTheme();
  const [searchText, setSearchText] = useState("");
  const [pendingRoleId, setPendingRoleId] = useState<number | null>(null);
  const roleTrashQuery = useRoleTrashQuery(searchText);
  const hardDeleteMutation = useHardDeleteRolesMutation();
  const clearTrashMutation = useClearRoleTrashMutation();
  const roles = useMemo(() => roleTrashQuery.data?.data?.list ?? [], [roleTrashQuery.data?.data?.list]);
  const total = roleTrashQuery.data?.data?.totalRecords ?? roles.length;
  const clearDisabled = total <= 0 || hardDeleteMutation.isPending || clearTrashMutation.isPending;

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/role" as any);
  }, []);

  const handleHardDelete = useCallback(async (role: UserRole) => {
    const roleId = role.roleId;
    const confirmed = await confirmAction({
      confirmText: "硬删除",
      destructive: true,
      message: `确定要永久删除「${role.roleName ?? `角色 #${roleId}`}」吗？这个操作无法恢复。`,
      title: "硬删除角色",
    });
    if (!confirmed) {
      return;
    }

    setPendingRoleId(roleId);
    try {
      await hardDeleteMutation.mutateAsync([roleId]);
      await roleTrashQuery.refetch();
    }
    catch (error: any) {
      Alert.alert("硬删除失败", error?.message ?? "请稍后重试");
    }
    finally {
      setPendingRoleId(null);
    }
  }, [hardDeleteMutation, roleTrashQuery]);

  const handleClearTrash = useCallback(async () => {
    const confirmed = await confirmAction({
      confirmText: "清空",
      destructive: true,
      message: `确定要永久删除回收站中的 ${total} 个项目吗？这个操作不会受当前搜索过滤影响，且无法恢复。`,
      title: "清空回收站",
    });
    if (!confirmed) {
      return;
    }

    try {
      await clearTrashMutation.mutateAsync();
      await roleTrashQuery.refetch();
    }
    catch (error: any) {
      Alert.alert("清空失败", error?.message ?? "请稍后重试");
    }
  }, [clearTrashMutation, roleTrashQuery, total]);

  const renderListHeader = useCallback(() => (
    <View style={styles.listHeader}>
      <View style={styles.intro}>
        <ThemedText type="title">角色与骰娘</ThemedText>
        <ThemedText themeColor="textSecondary">
          已删除项目会先进入回收站；硬删除后会永久移除角色、头像、立绘组和可释放的媒体引用。
        </ThemedText>
      </View>

      <View style={styles.searchToolbar}>
        <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <MagnifyingGlass color={theme.textSecondary} size={18} weight="bold" />
          <TextInput
            onChangeText={setSearchText}
            placeholder="搜索回收站"
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
        <Pressable
          accessibilityLabel="清空角色回收站"
          accessibilityRole="button"
          disabled={clearDisabled}
          onPress={handleClearTrash}
          style={[
            styles.toolbarActionButton,
            {
              backgroundColor: clearDisabled ? theme.backgroundElement : theme.dangerMuted,
              borderColor: clearDisabled ? theme.border : theme.danger,
              opacity: clearDisabled ? 0.5 : 1,
            },
          ]}
        >
          {clearTrashMutation.isPending
            ? <ActivityIndicator color={theme.danger} size="small" />
            : <Trash color={clearDisabled ? theme.textSecondary : theme.danger} size={20} weight="bold" />}
        </Pressable>
      </View>
    </View>
  ), [clearDisabled, clearTrashMutation.isPending, handleClearTrash, searchText, theme]);

  const renderEmptyState = useCallback(() => {
    if (roleTrashQuery.isPending) {
      return (
        <View style={styles.stateBlock}>
          <ActivityIndicator color={theme.accent} />
        </View>
      );
    }
    if (roleTrashQuery.isError) {
      return (
        <View style={styles.stateBlock}>
          <ThemedText style={{ color: theme.danger }}>回收站加载失败</ThemedText>
          <Pressable onPress={() => void roleTrashQuery.refetch()}>
            <ThemedText themeColor="accent">重试</ThemedText>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.stateBlock}>
        <ThemedText themeColor="textSecondary">
          {searchText.trim() ? "没有匹配的已删除项目" : "回收站为空"}
        </ThemedText>
      </View>
    );
  }, [roleTrashQuery, searchText, theme]);

  const renderRoleTrashItem = useCallback(({ item }: { item: UserRole }) => (
    <RoleTrashItem
      isDeleting={hardDeleteMutation.isPending && pendingRoleId === item.roleId}
      onHardDelete={handleHardDelete}
      role={item}
    />
  ), [handleHardDelete, hardDeleteMutation.isPending, pendingRoleId]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="返回角色列表"
            accessibilityRole="button"
            onPress={handleBack}
            style={styles.headerBackButton}
          >
            <CaretLeft size={22} color={theme.text} weight="bold" />
          </Pressable>
          <ThemedText type="heading" numberOfLines={1}>回收站</ThemedText>
          <Pressable
            accessibilityLabel="刷新回收站"
            accessibilityRole="button"
            disabled={roleTrashQuery.isFetching}
            onPress={() => void roleTrashQuery.refetch()}
            style={[styles.headerActionButton, { backgroundColor: theme.backgroundElement }]}
          >
            <ArrowClockwise size={18} color={theme.textSecondary} weight="bold" />
          </Pressable>
        </View>

        <FlatList
          contentContainerStyle={styles.content}
          data={roleTrashQuery.isPending || roleTrashQuery.isError ? [] : roles}
          keyboardShouldPersistTaps="handled"
          keyExtractor={item => String(item.roleId)}
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={renderListHeader}
          renderItem={renderRoleTrashItem}
        />
      </SafeAreaView>
    </ThemedView>
  );
}
