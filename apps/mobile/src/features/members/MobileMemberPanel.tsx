import type { RoomMember } from "@tuanchat/openapi-client/models/RoomMember";
import type { SpaceMember } from "@tuanchat/openapi-client/models/SpaceMember";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { FlashList } from "@shopify/flash-list";
import { UserPlus, UsersThree } from "phosphor-react-native";
import { memo, useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { ContactListAvatar } from "@/features/friends/ContactListAvatar";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

import type { MemberPreviewItem } from "./memberUtils";

import { MemberInviteSheet } from "./MemberInviteSheet";
import { getMemberDisplayName, getSpaceMemberTypeLabel } from "./memberUtils";

type MemberTab = "room-members" | "room-roles" | "space-members";

const ROLE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];
const MEMBER_TABS: ReadonlyArray<{ label: string; value: MemberTab }> = [
  { label: "房间成员", value: "room-members" },
  { label: "空间成员", value: "space-members" },
  { label: "房间角色", value: "room-roles" },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  title: { fontSize: 17, fontWeight: "700" },
  addButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  tabBar: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  tab: {
    alignItems: "center",
    borderRadius: Radius.md,
    flex: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  list: { flex: 1 },
  listContent: { gap: Spacing.sm, padding: Spacing.xl },
  row: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  memberInfo: { flex: 1, gap: 2, minWidth: 0 },
  roleAvatar: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 36,
    justifyContent: "center",
    overflow: "hidden",
    width: 36,
  },
  roleAvatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  rolePickerList: { maxHeight: 420 },
  emptyState: {
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
  },
  pickerTitle: { fontSize: 16, fontWeight: "700", marginBottom: Spacing.lg },
});

type MobileMemberPanelProps = {
  addableRoomRoles: UserRole[];
  canInvitePlayers: boolean;
  canInviteRoomMembers: boolean;
  canInviteSpaceMembers: boolean;
  canManageRoomRoles: boolean;
  currentUserId: number | null;
  isAddingRoomRole: boolean;
  onAddRoomRole: (role: UserRole) => void;
  roomId: number;
  roomMembers: RoomMember[];
  roomRoles: UserRole[];
  spaceId: number;
  spaceMembers: SpaceMember[];
};

type MemberRowProps = {
  item: MemberPreviewItem;
};

const MemberRow = memo(function MemberRow({ item }: MemberRowProps) {
  const theme = useTheme();
  const userId = item.userId ?? 0;
  const displayName = getMemberDisplayName(item);
  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <ContactListAvatar
        colorSeed={userId}
        displayName={displayName}
        labelFontSize={13}
        size={36}
        uri={avatarThumbUrl(item.avatarFileId)}
      />
      <View style={styles.memberInfo}>
        <ThemedText numberOfLines={1} type="smallBold">{displayName}</ThemedText>
        <ThemedText numberOfLines={1} themeColor="textSecondary" type="caption">
          {`${getSpaceMemberTypeLabel(item.memberType)} · ID ${item.userId ?? "-"}`}
        </ThemedText>
      </View>
    </View>
  );
});

type RoleRowProps = {
  avatarFileId?: number | null;
  onPressRoleId?: (roleId: number) => void;
  pending: boolean;
  roleId: number;
  roleName?: string | null;
  roleType?: number | null;
  userId?: number | null;
};

const RoleRow = memo(function RoleRow({ avatarFileId, onPressRoleId, pending, roleId, roleName, roleType, userId }: RoleRowProps) {
  const theme = useTheme();
  const displayName = roleName ?? `角色 #${roleId}`;
  const handlePress = useCallback(() => onPressRoleId?.(roleId), [onPressRoleId, roleId]);
  const content = (
    <>
      {avatarFileId
        ? <CachedImage uri={avatarThumbUrl(avatarFileId)} style={styles.roleAvatar} />
        : (
            <View style={[styles.roleAvatar, { backgroundColor: ROLE_COLORS[Math.abs(roleId) % ROLE_COLORS.length] }]}>
              <ThemedText style={styles.roleAvatarText}>
                {displayName.slice(0, 1) || "角"}
              </ThemedText>
            </View>
          )}
      <View style={styles.memberInfo}>
        <ThemedText numberOfLines={1} type="smallBold">{displayName}</ThemedText>
        <ThemedText numberOfLines={1} themeColor="textSecondary" type="caption">
          {roleType === 2 ? "NPC" : roleType === 1 ? "骰娘" : `用户 #${userId ?? "-"}`}
        </ThemedText>
      </View>
    </>
  );

  if (!onPressRoleId) {
    return <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={`添加角色 ${displayName}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: pending }}
      disabled={pending}
      onPress={handlePress}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement }, pressed && { opacity: 0.72 }, pending && { opacity: 0.55 }]}
    >
      {content}
    </Pressable>
  );
});

type RoomRolePickerSheetProps = {
  isAdding: boolean;
  onAddRole: (role: UserRole) => void;
  onClose: () => void;
  roles: UserRole[];
  visible: boolean;
};

function RoomRolePickerSheet({ isAdding, onAddRole, onClose, roles, visible }: RoomRolePickerSheetProps) {
  const theme = useTheme();
  const handlePressRole = useCallback((roleId: number) => {
    const role = roles.find(candidate => candidate.roleId === roleId);
    if (role) {
      onAddRole(role);
    }
  }, [onAddRole, roles]);
  const renderRole = useCallback(({ item }: { item: UserRole }) => (
    <RoleRow
      avatarFileId={item.avatarFileId}
      onPressRoleId={handlePressRole}
      pending={isAdding}
      roleId={item.roleId}
      roleName={item.roleName}
      roleType={item.type}
      userId={item.userId}
    />
  ), [handlePressRole, isAdding]);
  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="75%"
      onClose={onClose}
      visible={visible}
    >
      <ThemedText style={styles.pickerTitle}>添加房间角色</ThemedText>
      <FlashList
        contentContainerStyle={styles.listContent}
        data={roles}
        keyExtractor={getAddableRoleKey}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <UsersThree color={theme.textSecondary} size={30} />
            <ThemedText themeColor="textSecondary">没有可添加的角色</ThemedText>
          </View>
        )}
        renderItem={renderRole}
        style={styles.rolePickerList}
      />
    </BottomSheetModal>
  );
}

type MemberTabButtonProps = {
  label: string;
  onSelect: (tab: MemberTab) => void;
  selected: boolean;
  tab: MemberTab;
};

const MemberTabButton = memo(function MemberTabButton({ label, onSelect, selected, tab }: MemberTabButtonProps) {
  const theme = useTheme();
  const handlePress = useCallback(() => onSelect(tab), [onSelect, tab]);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={[styles.tab, { backgroundColor: selected ? theme.accentMuted : theme.backgroundElement }]}
    >
      <ThemedText numberOfLines={1} style={{ color: selected ? theme.accent : theme.textSecondary, fontSize: 12, fontWeight: "600" }}>
        {label}
      </ThemedText>
    </Pressable>
  );
});

function getMemberKey(item: MemberPreviewItem) {
  return `member:${item.userId ?? "unknown"}`;
}

function getRoomRoleKey(role: UserRole) {
  return `room-role:${role.roleId}`;
}

function getAddableRoleKey(role: UserRole) {
  return `add-room-role:${role.roleId}`;
}

export function MobileMemberPanel({
  addableRoomRoles,
  canInvitePlayers,
  canInviteRoomMembers,
  canInviteSpaceMembers,
  canManageRoomRoles,
  currentUserId,
  isAddingRoomRole,
  onAddRoomRole,
  roomId,
  roomMembers,
  roomRoles,
  spaceId,
  spaceMembers,
}: MobileMemberPanelProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<MemberTab>("room-members");
  const [inviteTarget, setInviteTarget] = useState<"room" | "space" | null>(null);
  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const activeMembers = activeTab === "room-members" ? roomMembers : spaceMembers;
  const isMemberTab = activeTab !== "room-roles";
  const canAdd = activeTab === "room-roles"
    ? canManageRoomRoles
    : activeTab === "space-members"
      ? canInviteSpaceMembers
      : canInviteRoomMembers;
  const addAccessibilityLabel = activeTab === "room-roles" ? "添加房间角色" : `邀请${activeTab === "room-members" ? "房间" : "空间"}成员`;
  const emptyMessage = activeTab === "room-members"
    ? "当前房间还没有成员"
    : "当前空间还没有成员";
  const renderMember = useCallback(({ item }: { item: MemberPreviewItem }) => <MemberRow item={item} />, []);
  const renderRoomRole = useCallback(({ item }: { item: UserRole }) => (
    <RoleRow
      avatarFileId={item.avatarFileId}
      pending={false}
      roleId={item.roleId}
      roleName={item.roleName}
      roleType={item.type}
      userId={item.userId}
    />
  ), []);
  const handleSelectTab = useCallback((tab: MemberTab) => setActiveTab(tab), []);
  const handleAdd = useCallback(() => {
    if (activeTab === "room-roles") {
      setRolePickerVisible(true);
      return;
    }
    setInviteTarget(activeTab === "room-members" ? "room" : "space");
  }, [activeTab]);
  const handleAddRoomRole = useCallback((role: UserRole) => {
    onAddRoomRole(role);
  }, [onAddRoomRole]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>成员</ThemedText>
        {canAdd
          ? (
              <Pressable
                accessibilityLabel={addAccessibilityLabel}
                accessibilityRole="button"
                onPress={handleAdd}
                style={({ pressed }) => [styles.addButton, { backgroundColor: theme.accentMuted }, pressed && { opacity: 0.72 }]}
              >
                <UserPlus color={theme.accent} size={19} weight="bold" />
              </Pressable>
            )
          : null}
      </View>
      <View style={styles.tabBar} accessibilityRole="tablist">
        {MEMBER_TABS.map(tab => (
          <MemberTabButton
            key={tab.value}
            label={tab.label}
            onSelect={handleSelectTab}
            selected={activeTab === tab.value}
            tab={tab.value}
          />
        ))}
      </View>
      {isMemberTab
        ? (
            <FlashList
              contentContainerStyle={styles.listContent}
              data={activeMembers}
              keyExtractor={getMemberKey}
              ListEmptyComponent={(
                <View style={styles.emptyState}>
                  <UsersThree color={theme.textSecondary} size={30} />
                  <ThemedText themeColor="textSecondary">{emptyMessage}</ThemedText>
                </View>
              )}
              renderItem={renderMember}
              style={styles.list}
            />
          )
        : (
            <FlashList
              contentContainerStyle={styles.listContent}
              data={roomRoles}
              keyExtractor={getRoomRoleKey}
              ListEmptyComponent={(
                <View style={styles.emptyState}>
                  <UsersThree color={theme.textSecondary} size={30} />
                  <ThemedText themeColor="textSecondary">当前房间还没有角色</ThemedText>
                </View>
              )}
              renderItem={renderRoomRole}
              style={styles.list}
            />
          )}
      <MemberInviteSheet
        canInvitePlayers={canInvitePlayers}
        currentUserId={currentUserId}
        onClose={() => setInviteTarget(null)}
        roomId={roomId}
        roomMembers={roomMembers}
        spaceId={spaceId}
        spaceMembers={spaceMembers}
        targetType={inviteTarget ?? "room"}
        visible={inviteTarget !== null}
      />
      <RoomRolePickerSheet
        isAdding={isAddingRoomRole}
        onAddRole={handleAddRoomRole}
        onClose={() => setRolePickerVisible(false)}
        roles={addableRoomRoles}
        visible={rolePickerVisible}
      />
    </View>
  );
}
