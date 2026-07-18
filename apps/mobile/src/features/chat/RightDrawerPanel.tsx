import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { RoomMember } from "@tuanchat/openapi-client/models/RoomMember";
import type { SpaceMember } from "@tuanchat/openapi-client/models/SpaceMember";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { memo, useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { MobileMemberPanel } from "@/features/members/MobileMemberPanel";
import { useTheme } from "@/hooks/use-theme";

import type { RoomStateRuntimeValue } from "./useRoomStateRuntime";

import { formatClueUnreadAccessibilityLabel, formatUnreadBadgeCount } from "./clueUnread";
import { CombatPanel } from "./CombatPanel";
import { MapPanel } from "./MapPanel";
import { MobileCluePanel } from "./MobileCluePanel";
import { useRoomStateRuntime } from "./useRoomStateRuntime";

export type RightDrawerTabKey = "members" | "map" | "combat" | "clues";

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  hiddenTabPane: { display: "none" },
  tabPane: { flex: 1 },
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  tab: {
    alignItems: "center",
    flex: 1,
    paddingVertical: Spacing.md,
  },
  tabLabelWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  tabBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 16,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
});

type RightDrawerPanelProps = {
  addableRoomRoles: UserRole[];
  activeTab: RightDrawerTabKey;
  canInvitePlayers: boolean;
  canInviteRoomMembers: boolean;
  canInviteSpaceMembers: boolean;
  canManageRoomRoles: boolean;
  clueUnreadCount?: number;
  clueRooms: Room[];
  currentUserId: number | null;
  currentRoleId: number | null;
  isKP: boolean;
  isAddingRoomRole: boolean;
  messageResponses: ChatMessageResponse[];
  messages: Message[];
  onClose: () => void;
  onAddRoomRole: (role: UserRole) => void;
  onChangeActiveTab: (tab: RightDrawerTabKey) => void;
  roomId: number | null;
  roomMembers: RoomMember[];
  roomRoles: UserRole[];
  roomStateRuntime?: RoomStateRuntimeValue;
  ruleId: number | null | undefined;
  spaceId: number | null;
  spaceMembers: SpaceMember[];
};

type RightDrawerPanelContentProps = Omit<RightDrawerPanelProps, "roomStateRuntime"> & {
  roomStateRuntime: RoomStateRuntimeValue;
};

function RightDrawerPanelInner({
  roomStateRuntime,
  ...props
}: RightDrawerPanelProps) {
  if (roomStateRuntime) {
    return <RightDrawerPanelContent {...props} roomStateRuntime={roomStateRuntime} />;
  }
  return <RightDrawerPanelWithRuntime {...props} />;
}

function RightDrawerPanelWithRuntime({
  addableRoomRoles,
  activeTab,
  canInvitePlayers,
  canInviteRoomMembers,
  canInviteSpaceMembers,
  canManageRoomRoles,
  clueUnreadCount = 0,
  clueRooms,
  currentRoleId,
  currentUserId,
  isKP,
  isAddingRoomRole,
  messageResponses,
  messages,
  onChangeActiveTab,
  onClose,
  onAddRoomRole,
  roomId,
  roomMembers,
  roomRoles,
  ruleId,
  spaceId,
  spaceMembers,
}: Omit<RightDrawerPanelProps, "roomStateRuntime">) {
  const roomStateRuntime = useRoomStateRuntime({
    currentRoleId,
    messages,
    roomRoles,
    ruleId,
  });

  return (
    <RightDrawerPanelContent
      activeTab={activeTab}
      addableRoomRoles={addableRoomRoles}
      canInvitePlayers={canInvitePlayers}
      canInviteRoomMembers={canInviteRoomMembers}
      canInviteSpaceMembers={canInviteSpaceMembers}
      canManageRoomRoles={canManageRoomRoles}
      clueUnreadCount={clueUnreadCount}
      clueRooms={clueRooms}
      currentRoleId={currentRoleId}
      currentUserId={currentUserId}
      isKP={isKP}
      isAddingRoomRole={isAddingRoomRole}
      messageResponses={messageResponses}
      messages={messages}
      onChangeActiveTab={onChangeActiveTab}
      onClose={onClose}
      onAddRoomRole={onAddRoomRole}
      roomId={roomId}
      roomMembers={roomMembers}
      roomRoles={roomRoles}
      roomStateRuntime={roomStateRuntime}
      ruleId={ruleId}
      spaceId={spaceId}
      spaceMembers={spaceMembers}
    />
  );
}

function RightDrawerPanelContent({
  addableRoomRoles,
  activeTab,
  canInvitePlayers,
  canInviteRoomMembers,
  canInviteSpaceMembers,
  canManageRoomRoles,
  clueUnreadCount = 0,
  clueRooms,
  currentUserId,
  currentRoleId,
  isKP,
  isAddingRoomRole,
  messageResponses,
  messages,
  onChangeActiveTab,
  onClose: _onClose,
  onAddRoomRole,
  roomId,
  roomMembers,
  roomRoles,
  roomStateRuntime,
  ruleId,
  spaceId,
  spaceMembers,
}: RightDrawerPanelContentProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const handleShowClues = useCallback(() => onChangeActiveTab("clues"), [onChangeActiveTab]);
  const handleShowCombat = useCallback(() => onChangeActiveTab("combat"), [onChangeActiveTab]);
  const handleShowMap = useCallback(() => onChangeActiveTab("map"), [onChangeActiveTab]);
  const handleShowMembers = useCallback(() => onChangeActiveTab("members"), [onChangeActiveTab]);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.content}>
        <View
          pointerEvents={activeTab === "members" ? "auto" : "none"}
          style={[styles.tabPane, activeTab === "members" ? null : styles.hiddenTabPane]}
        >
          {roomId != null && spaceId != null
            ? (
                <MobileMemberPanel
                  addableRoomRoles={addableRoomRoles}
                  canInvitePlayers={canInvitePlayers}
                  canInviteRoomMembers={canInviteRoomMembers}
                  canInviteSpaceMembers={canInviteSpaceMembers}
                  canManageRoomRoles={canManageRoomRoles}
                  currentUserId={currentUserId}
                  isAddingRoomRole={isAddingRoomRole}
                  onAddRoomRole={onAddRoomRole}
                  roomId={roomId}
                  roomMembers={roomMembers}
                  roomRoles={roomRoles}
                  spaceId={spaceId}
                  spaceMembers={spaceMembers}
                />
              )
            : null}
        </View>
        <View
          pointerEvents={activeTab === "map" ? "auto" : "none"}
          style={[styles.tabPane, activeTab === "map" ? null : styles.hiddenTabPane]}
        >
          <MapPanel
            currentRoleId={currentRoleId}
            isKP={isKP}
            messageResponses={messageResponses}
            messages={messages}
            roomId={roomId}
            roomRoles={roomRoles}
            roomStateRuntime={roomStateRuntime}
            ruleId={ruleId}
          />
        </View>
        <View
          pointerEvents={activeTab === "combat" ? "auto" : "none"}
          style={[styles.tabPane, activeTab === "combat" ? null : styles.hiddenTabPane]}
        >
          <CombatPanel
            currentRoleId={currentRoleId}
            messages={messages}
            roomRoles={roomRoles}
            roomStateRuntime={roomStateRuntime}
            ruleId={ruleId}
          />
        </View>
        <View
          pointerEvents={activeTab === "clues" ? "auto" : "none"}
          style={[styles.tabPane, activeTab === "clues" ? null : styles.hiddenTabPane]}
        >
          <MobileCluePanel
            clueRooms={clueRooms}
            currentUserId={currentUserId}
            currentRoleId={currentRoleId}
            currentRoomId={roomId}
            currentRoomMessages={messageResponses}
            isKP={isKP}
            spaceId={spaceId}
          />
        </View>
      </View>

      <View style={[styles.tabBar, { borderTopColor: theme.border, paddingBottom: insets.bottom }]}>
        <Pressable
          style={styles.tab}
          accessibilityLabel="成员"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "members" }}
          onPress={handleShowMembers}
        >
          <ThemedText
            type="smallBold"
            themeColor={activeTab === "members" ? "accent" : "textSecondary"}
          >
            成员
          </ThemedText>
        </Pressable>
        <Pressable
          style={styles.tab}
          accessibilityLabel={formatClueUnreadAccessibilityLabel(clueUnreadCount)}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "clues" }}
          onPress={handleShowClues}
        >
          <View style={styles.tabLabelWrap}>
            <ThemedText
              type="smallBold"
              themeColor={activeTab === "clues" ? "accent" : "textSecondary"}
            >
              线索
            </ThemedText>
            {clueUnreadCount > 0
              ? (
                  <View style={[styles.tabBadge, { backgroundColor: theme.danger }]}>
                    <ThemedText style={styles.tabBadgeText}>
                      {formatUnreadBadgeCount(clueUnreadCount)}
                    </ThemedText>
                  </View>
                )
              : null}
          </View>
        </Pressable>
        <Pressable
          style={styles.tab}
          accessibilityLabel="战斗"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "combat" }}
          onPress={handleShowCombat}
        >
          <ThemedText
            type="smallBold"
            themeColor={activeTab === "combat" ? "accent" : "textSecondary"}
          >
            战斗
          </ThemedText>
        </Pressable>
        <Pressable
          style={styles.tab}
          accessibilityLabel="地图"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "map" }}
          onPress={handleShowMap}
        >
          <ThemedText
            type="smallBold"
            themeColor={activeTab === "map" ? "accent" : "textSecondary"}
          >
            地图
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export const RightDrawerPanel = memo(RightDrawerPanelInner);
