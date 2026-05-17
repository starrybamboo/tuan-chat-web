import type { MemberPreviewItem } from "@/features/members/memberUtils";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { MemberPreviewList } from "@/features/members/memberPreviewList";
import {
  getCurrentMemberIdentityText,
  getCurrentRoomPresenceText,
} from "@/features/members/memberUtils";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

const AVATAR_SIZE = 36;

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

type TabKey = "members" | "roles";

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
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
  container: { flex: 1, gap: Spacing.xl, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  header: { gap: Spacing.sm },
  kickButton: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  roleInfo: {
    flex: 1,
    gap: 2,
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
  roleList: {
    gap: Spacing.md,
  },
  scrollContent: { paddingBottom: Spacing.xxl },
  tab: {
    alignItems: "center",
    borderBottomWidth: 2,
    flex: 1,
    paddingVertical: Spacing.sm,
  },
  tabBar: {
    flexDirection: "row",
    gap: Spacing.md,
  },
});

interface RightDrawerMembersProps {
  currentRoomMember: MemberPreviewItem | null;
  currentSpaceMember: MemberPreviewItem | null;
  currentUserId: number | null;
  error: unknown;
  isError: boolean;
  isPending: boolean;
  members: MemberPreviewItem[];
  onAddMember?: () => void;
  onClose: () => void;
  onKickRole?: (roleId: number) => void;
  onLongPressMember?: (member: MemberPreviewItem) => void;
  roles?: UserRole[];
  roomName: string;
}

export function RightDrawerMembers({
  currentRoomMember,
  currentSpaceMember,
  currentUserId,
  error,
  isError,
  isPending,
  members,
  onAddMember,
  onClose,
  onKickRole,
  onLongPressMember,
  roles = [],
  roomName,
}: RightDrawerMembersProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>("members");

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <ThemedText type="heading">成员</ThemedText>
        <ThemedText themeColor="textSecondary" type="caption">{roomName}</ThemedText>
        <ThemedText themeColor="textSecondary" type="caption">
          {getCurrentMemberIdentityText(currentSpaceMember)}
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="caption">
          {getCurrentRoomPresenceText(currentRoomMember, currentSpaceMember)}
        </ThemedText>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, { borderBottomColor: activeTab === "members" ? theme.accent : "transparent" }]}
          onPress={() => setActiveTab("members")}
        >
          <ThemedText
            type="smallBold"
            themeColor={activeTab === "members" ? "text" : "textSecondary"}
          >
            成员 ({members.length})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.tab, { borderBottomColor: activeTab === "roles" ? theme.accent : "transparent" }]}
          onPress={() => setActiveTab("roles")}
        >
          <ThemedText
            type="smallBold"
            themeColor={activeTab === "roles" ? "text" : "textSecondary"}
          >
            角色 ({roles.length})
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === "members" ? (
          <>
            {onAddMember ? (
              <Pressable
                style={[styles.addButton, { borderColor: theme.border }]}
                onPress={onAddMember}
              >
                <ThemedText type="smallBold" themeColor="accent">添加成员</ThemedText>
              </Pressable>
            ) : null}
            <MemberPreviewList
              currentUserId={currentUserId}
              emptyText="暂无成员。"
              error={error}
              isError={isError}
              isPending={isPending}
              maxVisible={Math.max(members.length, 1)}
              members={members}
              onLongPress={onLongPressMember}
            />
          </>
        ) : (
          <View style={styles.roleList}>
            {roles.length === 0 ? (
              <ThemedText themeColor="textSecondary">暂无角色。</ThemedText>
            ) : (
              roles.map(role => (
                <View
                  key={role.roleId}
                  style={[styles.roleItem, { backgroundColor: theme.backgroundElement }]}
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
                  {onKickRole ? (
                    <Pressable
                      style={[styles.kickButton, { backgroundColor: theme.border }]}
                      onPress={() => onKickRole(role.roleId)}
                    >
                      <ThemedText type="small" themeColor="textSecondary">移除</ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
