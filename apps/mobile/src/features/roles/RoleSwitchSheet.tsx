import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { CaretLeft, UserPlus } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";
import { readMobileKeyValue, writeMobileKeyValue } from "@/lib/mobile-key-value-storage";

import {
  buildRoleAvatarCategoryGroups,
  buildRoleAvatarVariantGroups,
  getRoleAvatarVariantFolders,
  resolveActiveRoleAvatarVariantId,
  ROLE_AVATAR_UNGROUPED_VARIANT_ID,
} from "./roleAvatarVariantGroups";
import { isRoleSwitchNarratorSelected } from "./roleSwitchSelectionState";
import { useRoleAvatarsQuery } from "./useRoleAvatarsQuery";

const AVATAR_SIZE = 36;
const AVATAR_GRID_COLUMNS = 4;
const AVATAR_GRID_GAP = Spacing.md;
const SHEET_HORIZONTAL_PADDING = Spacing.xl;
const GRID_HORIZONTAL_PADDING = Spacing.xl;
const ROLE_SWITCH_AVATAR_VARIANT_STORAGE_SCOPE = "role-switch-avatar-variant";

type RoleSwitchListItem
  = { type: "narrator"; key: string }
    | { type: "role"; key: string; role: UserRole }
    | { type: "empty"; key: string };

const styles = StyleSheet.create({
  sheet: {},
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  headerTitleGroup: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  customNameInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  roleList: {
    flexGrow: 0,
  },
  roleListContent: {
    paddingBottom: Spacing.lg,
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
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
    maxHeight: 260,
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
  },
  avatarGridContent: { gap: AVATAR_GRID_GAP },
  avatarGridRow: { gap: AVATAR_GRID_GAP },
  avatarGridItem: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 2,
    justifyContent: "center",
  },
  avatarSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  avatarVariantBackButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  avatarVariantFolderItem: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.xs,
    justifyContent: "center",
    padding: Spacing.xs,
  },
  avatarVariantFolderCover: {
    borderRadius: Radius.sm,
    height: "68%",
    width: "100%",
  },
  avatarVariantHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  avatarVariantTitle: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  createRoleButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.xl,
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
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

type RoleSwitchSheetProps = {
  addableRoles?: UserRole[];
  canAddRole?: boolean;
  currentAvatarId: number | undefined;
  currentRoleId: number | undefined;
  customRoleName?: string;
  canSelectNarrator?: boolean;
  isAddingRole?: boolean;
  onAddRole?: (role: UserRole) => Promise<void> | void;
  onChangeCustomRoleName?: (name: string) => void;
  onClose: () => void;
  onCreateRole?: () => void;
  onSelectAvatar: (avatarId: number | undefined, avatarFileId: number | undefined) => void;
  onSelectRole: (roleId: number | undefined) => void;
  roles: UserRole[];
  visible: boolean;
};

export function RoleSwitchSheet({
  addableRoles = [],
  canAddRole = false,
  currentAvatarId,
  currentRoleId,
  customRoleName,
  canSelectNarrator = false,
  isAddingRole = false,
  onAddRole,
  onChangeCustomRoleName,
  onClose,
  onCreateRole,
  onSelectAvatar,
  onSelectRole,
  roles,
  visible,
}: RoleSwitchSheetProps) {
  const theme = useTheme();
  const { session } = useAuthSession();
  const userId = session?.userId ?? null;
  const { width: windowWidth } = useWindowDimensions();
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);
  const [sheetMode, setSheetMode] = useState<"select" | "add">("select");
  const [activeVariantIdByRoleId, setActiveVariantIdByRoleId] = useState<Record<number, number>>({});

  const avatarGridItemSize = useMemo(() => {
    const horizontalPadding = (SHEET_HORIZONTAL_PADDING + GRID_HORIZONTAL_PADDING) * 2;
    const totalGap = AVATAR_GRID_GAP * (AVATAR_GRID_COLUMNS - 1);
    const available = windowWidth - horizontalPadding - totalGap;
    return Math.floor(available / AVATAR_GRID_COLUMNS);
  }, [windowWidth]);
  const avatarGridImageSize = Math.max(0, avatarGridItemSize - 6);

  const myRoles = roles.filter(r => r.state !== 1);
  const isNarrator = isRoleSwitchNarratorSelected(currentRoleId);

  const activeExpandedRoleId = expandedRoleId ?? (currentRoleId && currentRoleId > 0 ? currentRoleId : null);
  const roleAvatarsQuery = useRoleAvatarsQuery(activeExpandedRoleId);
  const roleAvatars = useMemo(() => roleAvatarsQuery.data ?? [], [roleAvatarsQuery.data]);
  const avatarVariantGroups = useMemo(() => buildRoleAvatarVariantGroups(roleAvatars), [roleAvatars]);
  const avatarVariantFolders = useMemo(() => getRoleAvatarVariantFolders(avatarVariantGroups), [avatarVariantGroups]);
  const storedActiveVariantId = activeExpandedRoleId ? activeVariantIdByRoleId[activeExpandedRoleId] : undefined;
  const activeAvatarVariantId = useMemo(() => resolveActiveRoleAvatarVariantId({
    groups: avatarVariantGroups,
    preferredVariantId: storedActiveVariantId,
    selectedAvatarId: currentAvatarId,
  }), [avatarVariantGroups, currentAvatarId, storedActiveVariantId]);
  const activeAvatarVariantGroup = useMemo(
    () => avatarVariantGroups.find(group => group.variantId === activeAvatarVariantId),
    [activeAvatarVariantId, avatarVariantGroups],
  );
  const ungroupedAvatarVariantGroup = useMemo(
    () => avatarVariantGroups.find(group => group.variantId === ROLE_AVATAR_UNGROUPED_VARIANT_ID),
    [avatarVariantGroups],
  );
  const isAvatarVariantGroupView = activeAvatarVariantId !== ROLE_AVATAR_UNGROUPED_VARIANT_ID;
  const displayedAvatarVariantGroup = isAvatarVariantGroupView
    ? activeAvatarVariantGroup
    : ungroupedAvatarVariantGroup;
  const avatarCategoryGroups = useMemo(
    () => displayedAvatarVariantGroup ? buildRoleAvatarCategoryGroups(displayedAvatarVariantGroup.avatars) : [],
    [displayedAvatarVariantGroup],
  );
  const roleListItems = useMemo<RoleSwitchListItem[]>(() => {
    const items: RoleSwitchListItem[] = [];
    if (canSelectNarrator) {
      items.push({ type: "narrator", key: "narrator" });
    }
    for (const role of myRoles) {
      items.push({ type: "role", key: `role:${role.roleId}`, role });
    }
    if (myRoles.length === 0) {
      items.push({ type: "empty", key: "empty" });
    }
    return items;
  }, [canSelectNarrator, myRoles]);

  useEffect(() => {
    const roleId = activeExpandedRoleId;
    if (!roleId) {
      return;
    }

    let cancelled = false;
    void readMobileKeyValue<number>(`role:${roleId}`, {
      scope: ROLE_SWITCH_AVATAR_VARIANT_STORAGE_SCOPE,
      userId,
    }).then((entry) => {
      const value = entry?.value;
      if (cancelled || typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return;
      }
      setActiveVariantIdByRoleId(prev => prev[roleId] === value ? prev : {
        ...prev,
        [roleId]: value,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeExpandedRoleId, userId]);

  const setActiveRoleAvatarVariantId = useCallback((roleId: number, variantId: number) => {
    setActiveVariantIdByRoleId(prev => prev[roleId] === variantId ? prev : {
      ...prev,
      [roleId]: variantId,
    });
    void writeMobileKeyValue(`role:${roleId}`, variantId, {
      scope: ROLE_SWITCH_AVATAR_VARIANT_STORAGE_SCOPE,
      userId,
    });
  }, [userId]);

  const handleSelectRole = useCallback((roleId: number) => {
    if (currentRoleId === roleId) {
      setExpandedRoleId(prev => prev === roleId ? null : roleId);
    }
    else {
      onSelectRole(roleId);
      setExpandedRoleId(roleId);
    }
  }, [currentRoleId, onSelectRole]);

  const handleClose = useCallback(() => {
    setSheetMode("select");
    setExpandedRoleId(null);
    onClose();
  }, [onClose]);

  const handleSelectAvatar = useCallback((avatarId: number, avatarFileId: number | undefined) => {
    onSelectAvatar(avatarId, avatarFileId);
    handleClose();
  }, [handleClose, onSelectAvatar]);

  const handleSelectNarrator = useCallback(() => {
    onSelectRole(undefined);
    handleClose();
  }, [handleClose, onSelectRole]);

  const handleOpenAddMode = useCallback(() => {
    setExpandedRoleId(null);
    setSheetMode("add");
  }, []);

  const handleCreateRole = useCallback(() => {
    setSheetMode("select");
    onCreateRole?.();
  }, [onCreateRole]);

  const handleAddRole = useCallback((role: UserRole) => {
    void onAddRole?.(role);
  }, [onAddRole]);

  const renderAvatarItem = useCallback(({ item: avatar }: { item: RoleAvatar }) => {
    const isAvatarSelected = currentAvatarId === avatar.avatarId;
    const avatarLabel = avatar.avatarTitle?.label?.trim()
      || (avatar.avatarId ? `立绘 #${avatar.avatarId}` : "未命名立绘");
    return (
      <Pressable
        accessibilityLabel={`选择${avatarLabel}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isAvatarSelected }}
        onPress={() => {
          if (avatar.avatarId) {
            handleSelectAvatar(avatar.avatarId, avatar.avatarFileId);
          }
        }}
        style={[
          styles.avatarGridItem,
          {
            borderColor: isAvatarSelected ? theme.accent : "transparent",
            height: avatarGridItemSize,
            width: avatarGridItemSize,
          },
        ]}
      >
        <CachedImage
          uri={avatarThumbUrl(avatar.avatarFileId)}
          style={{
            borderRadius: Radius.sm,
            height: avatarGridImageSize,
            width: avatarGridImageSize,
          }}
        />
      </Pressable>
    );
  }, [avatarGridImageSize, avatarGridItemSize, currentAvatarId, handleSelectAvatar, theme.accent]);

  const renderAvatarVariantFolderItem = useCallback(({ item }: { item: (typeof avatarVariantFolders)[number] }) => {
    const coverAvatar = item.coverAvatar ?? item.avatars[0];
    const coverUri = avatarThumbUrl(coverAvatar?.avatarFileId);
    return (
      <Pressable
        accessibilityLabel={`打开${item.label}`}
        accessibilityRole="button"
        onPress={() => {
          if (activeExpandedRoleId) {
            setActiveRoleAvatarVariantId(activeExpandedRoleId, item.variantId);
          }
        }}
        style={[
          styles.avatarVariantFolderItem,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            height: avatarGridItemSize,
            width: avatarGridItemSize,
          },
        ]}
      >
        {coverUri
          ? (
              <CachedImage
                uri={coverUri}
                style={styles.avatarVariantFolderCover}
                contentFit="cover"
              />
            )
          : (
              <View style={[styles.avatarVariantFolderCover, { alignItems: "center", justifyContent: "center" }]}>
                <ThemedText themeColor="textSecondary" type="caption">?</ThemedText>
              </View>
            )}
        <ThemedText type="caption" numberOfLines={1}>
          {item.label}
        </ThemedText>
      </Pressable>
    );
  }, [activeExpandedRoleId, avatarGridItemSize, setActiveRoleAvatarVariantId, theme.backgroundElement, theme.border]);

  const renderExpandedAvatars = useCallback(() => {
    if (roleAvatarsQuery.isPending) {
      return <ActivityIndicator style={{ marginVertical: Spacing.md }} size="small" />;
    }
    if (roleAvatars.length === 0) {
      return (
        <ThemedText type="caption" themeColor="textSecondary" style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm }}>
          该角色暂无可选头像
        </ThemedText>
      );
    }

    return (
      <View>
        {avatarVariantFolders.length > 0 && !isAvatarVariantGroupView
          ? (
              <View>
                <View style={styles.avatarSectionHeader}>
                  <ThemedText type="caption" themeColor="textSecondary">立绘组</ThemedText>
                </View>
                <FlatList
                  data={avatarVariantFolders}
                  key={`role-avatar-variant-grid-${AVATAR_GRID_COLUMNS}`}
                  keyExtractor={group => `role-avatar-variant:${group.variantId}`}
                  renderItem={renderAvatarVariantFolderItem}
                  numColumns={AVATAR_GRID_COLUMNS}
                  scrollEnabled={avatarVariantFolders.length > AVATAR_GRID_COLUMNS * 2}
                  nestedScrollEnabled
                  style={styles.avatarGrid}
                  contentContainerStyle={styles.avatarGridContent}
                  columnWrapperStyle={styles.avatarGridRow}
                />
              </View>
            )
          : null}

        {isAvatarVariantGroupView && activeExpandedRoleId
          ? (
              <View style={styles.avatarVariantHeader}>
                <Pressable
                  accessibilityLabel="返回立绘组列表"
                  accessibilityRole="button"
                  onPress={() => setActiveRoleAvatarVariantId(activeExpandedRoleId, ROLE_AVATAR_UNGROUPED_VARIANT_ID)}
                  style={({ pressed }) => [styles.avatarVariantBackButton, pressed && { backgroundColor: theme.backgroundElement }]}
                >
                  <CaretLeft size={15} color={theme.textSecondary} weight="bold" />
                  <ThemedText type="caption" themeColor="textSecondary">立绘组</ThemedText>
                </Pressable>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={styles.avatarVariantTitle}
                  accessibilityLabel={activeAvatarVariantGroup?.label ?? "未命名立绘组"}
                  accessibilityState={{ selected: true }}
                >
                  {activeAvatarVariantGroup?.label ?? "未命名立绘组"}
                </ThemedText>
              </View>
            )
          : null}

        {avatarCategoryGroups.map(({ category, avatars }) => (
          <View key={`${activeAvatarVariantId}:${category}`}>
            {avatarCategoryGroups.length > 1
              ? (
                  <View style={styles.avatarSectionHeader}>
                    <ThemedText type="caption" themeColor="textSecondary">{category}</ThemedText>
                  </View>
                )
              : null}
            <FlatList
              data={avatars}
              key={`role-avatar-grid-${AVATAR_GRID_COLUMNS}`}
              keyExtractor={avatar => `role-avatar:${avatar.avatarId ?? avatar.avatarFileId ?? "unknown"}`}
              renderItem={renderAvatarItem}
              numColumns={AVATAR_GRID_COLUMNS}
              scrollEnabled={avatars.length > AVATAR_GRID_COLUMNS * 3}
              nestedScrollEnabled
              style={styles.avatarGrid}
              contentContainerStyle={styles.avatarGridContent}
              columnWrapperStyle={styles.avatarGridRow}
            />
          </View>
        ))}

        {avatarCategoryGroups.length === 0 && isAvatarVariantGroupView
          ? (
              <ThemedText type="caption" themeColor="textSecondary" style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm }}>
                当前立绘组暂无可选头像
              </ThemedText>
            )
          : null}
      </View>
    );
  }, [
    activeAvatarVariantGroup?.label,
    activeAvatarVariantId,
    activeExpandedRoleId,
    avatarCategoryGroups,
    avatarVariantFolders,
    isAvatarVariantGroupView,
    renderAvatarItem,
    renderAvatarVariantFolderItem,
    roleAvatars.length,
    roleAvatarsQuery.isPending,
    setActiveRoleAvatarVariantId,
    theme.backgroundElement,
    theme.textSecondary,
  ]);

  const renderRoleItem = useCallback(({ item }: { item: RoleSwitchListItem }) => {
    if (item.type === "empty") {
      return (
        <View style={styles.emptyState}>
          <ThemedText themeColor="textSecondary" type="small">当前房间没有可用角色</ThemedText>
        </View>
      );
    }

    if (item.type === "narrator") {
      return (
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
      );
    }

    const role = item.role;
    const isSelected = currentRoleId === role.roleId;
    const isExpanded = activeExpandedRoleId === role.roleId;

    return (
      <View>
        <Pressable
          onPress={() => handleSelectRole(role.roleId)}
          style={({ pressed }) => [styles.roleItem, pressed && { backgroundColor: theme.backgroundElement }]}
        >
          {role.avatarFileId
            ? (
                <CachedImage uri={avatarThumbUrl(role.avatarFileId)} style={styles.avatar} />
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

        {isSelected && isExpanded ? <View>{renderExpandedAvatars()}</View> : null}
      </View>
    );
  }, [activeExpandedRoleId, currentRoleId, handleSelectNarrator, handleSelectRole, isNarrator, renderExpandedAvatars, theme.accent, theme.backgroundElement]);

  const renderAddableRoleItem = useCallback(({ item: role }: { item: UserRole }) => {
    return (
      <Pressable
        disabled={isAddingRole}
        onPress={() => handleAddRole(role)}
        style={({ pressed }) => [
          styles.roleItem,
          pressed && { backgroundColor: theme.backgroundElement },
          isAddingRole && { opacity: 0.55 },
        ]}
      >
        {role.avatarFileId
          ? (
              <CachedImage uri={avatarThumbUrl(role.avatarFileId)} style={styles.avatar} />
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
        {isAddingRole ? <ActivityIndicator size="small" color={theme.accent} /> : null}
      </Pressable>
    );
  }, [handleAddRole, isAddingRole, theme.accent, theme.backgroundElement]);

  const renderCreateRoleButton = useCallback(() => {
    if (!onCreateRole) {
      return null;
    }

    return (
      <Pressable
        onPress={handleCreateRole}
        style={({ pressed }) => [
          styles.createRoleButton,
          {
            backgroundColor: theme.accentMuted,
            borderColor: theme.accent,
          },
          pressed && { opacity: 0.75 },
        ]}
      >
        <UserPlus size={16} color={theme.accent} weight="bold" />
        <ThemedText type="smallBold" themeColor="accent">创建新角色</ThemedText>
      </Pressable>
    );
  }, [handleCreateRole, onCreateRole, theme.accent, theme.accentMuted]);

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="70%"
      onClose={handleClose}
      sheetStyle={styles.sheet}
      visible={visible}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          {sheetMode === "add"
            ? (
                <Pressable
                  accessibilityLabel="返回选择角色"
                  accessibilityRole="button"
                  onPress={() => setSheetMode("select")}
                  style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: theme.backgroundElement }]}
                >
                  <CaretLeft size={18} color={theme.text} weight="bold" />
                </Pressable>
              )
            : null}
          <ThemedText style={styles.title}>{sheetMode === "add" ? "添加角色" : "选择角色"}</ThemedText>
        </View>
        {canAddRole && sheetMode === "select"
          ? (
              <Pressable
                accessibilityLabel="添加角色"
                accessibilityRole="button"
                onPress={handleOpenAddMode}
                style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.backgroundElement }, pressed && { opacity: 0.75 }]}
              >
                <UserPlus size={18} color={theme.accent} weight="bold" />
              </Pressable>
            )
          : null}
      </View>

      {sheetMode === "select" && onChangeCustomRoleName != null
        ? (
            <TextInput
              accessibilityLabel="自定义发言角色名"
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

      {sheetMode === "add"
        ? (
            addableRoles.length > 0
              ? (
                  <FlatList
                    data={addableRoles}
                    keyExtractor={role => `add-role:${role.roleId}`}
                    ListHeaderComponent={renderCreateRoleButton}
                    renderItem={renderAddableRoleItem}
                    style={styles.roleList}
                    contentContainerStyle={styles.roleListContent}
                    showsVerticalScrollIndicator={false}
                  />
                )
              : (
                  <View style={styles.emptyState}>
                    <ThemedText themeColor="textSecondary" type="small">暂无可添加角色</ThemedText>
                    {renderCreateRoleButton()}
                  </View>
                )
          )
        : (
            <FlatList
              data={roleListItems}
              keyExtractor={item => item.key}
              renderItem={renderRoleItem}
              style={styles.roleList}
              contentContainerStyle={styles.roleListContent}
              showsVerticalScrollIndicator={false}
            />
          )}
    </BottomSheetModal>
  );
}
