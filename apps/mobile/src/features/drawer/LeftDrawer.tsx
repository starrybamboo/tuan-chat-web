import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { DmConversation } from "@/features/friends/useDmInboxQuery";
import { CaretDown, CaretRight, ChatCircle, Plus } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { DmConversationList } from "@/features/friends/DmConversationList";
import { FriendsManagementView } from "@/features/friends/FriendsManagementView";
import { useTheme } from "@/hooks/use-theme";
import { DEFAULT_TUANCHAT_API_BASE_URL } from "@/lib/api";
import { SPACE_RAIL_WIDTH } from "@/lib/layout-constants";
import { avatarThumbUrl } from "@/lib/media-url";

import { getLeftDrawerLayoutState } from "./leftDrawerLayout";

const ROOM_AVATAR_SIZE = 32;
const SQUIRCLE_RADIUS = 8;

const ROOM_TYPE_ALL_MEMBER = 2;
const ROOM_TYPE_GAME = 1;

const ROOM_TYPE_LABELS: Record<number, string> = {
  [ROOM_TYPE_ALL_MEMBER]: "全员房间",
  [ROOM_TYPE_GAME]: "游戏房间",
};

/** Ordered list of room type groups to display */
const ROOM_TYPE_ORDER = [ROOM_TYPE_ALL_MEMBER, ROOM_TYPE_GAME];

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row" },
  rail: {
    alignItems: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.lg,
    width: SPACE_RAIL_WIDTH,
  },
  railFixedTop: {
    alignItems: "center",
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  railIconButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  railDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.sm,
    width: 28,
  },
  railScroll: { flex: 1 },
  railScrollContent: { alignItems: "center", gap: Spacing.md, paddingTop: Spacing.sm },
  spaceButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  spaceAvatar: { borderRadius: Radius.md, height: "100%", width: "100%" },
  spaceInitials: { color: "#f3f6fb", fontSize: 13, fontWeight: "800" },
  createSpaceButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  sidebar: { flex: 1 },
  sidebarHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 44,
    paddingHorizontal: Spacing.lg,
  },
  roomList: { flex: 1 },
  roomListContent: { gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  roomRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  roomAvatarWrap: {
    height: ROOM_AVATAR_SIZE,
    position: "relative",
    width: ROOM_AVATAR_SIZE,
  },
  roomAvatar: {
    borderRadius: SQUIRCLE_RADIUS,
    height: ROOM_AVATAR_SIZE,
    width: ROOM_AVATAR_SIZE,
  },
  roomAvatarFallback: {
    alignItems: "center",
    borderRadius: SQUIRCLE_RADIUS,
    height: ROOM_AVATAR_SIZE,
    justifyContent: "center",
    width: ROOM_AVATAR_SIZE,
  },
  unreadBadge: {
    alignItems: "center",
    borderRadius: Radius.full,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 4,
    paddingVertical: 1,
    position: "absolute",
    right: -4,
    top: -4,
  },
  createRoomButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    marginTop: Spacing.md,
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  emptyText: { fontSize: 12, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl },
});

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "TC";
  return trimmed.slice(0, 2).toUpperCase();
}

function resolveAvatarUrl(fileId: number | null | undefined) {
  const url = avatarThumbUrl(fileId);
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, new URL(DEFAULT_TUANCHAT_API_BASE_URL).origin).toString();
  } catch {
    return url;
  }
}

export type DrawerMode = "rooms" | "dm";

interface LeftDrawerProps {
  activeSpaces: Space[];
  availableRooms: Room[];
  currentContactId: number | null;
  currentRoomId: number | null;
  currentSpaceId: number | null;
  dmConversations: DmConversation[];
  dmIsPending: boolean;
  drawerMode: DrawerMode;
  onCreateRoom?: () => void;
  onCreateSpace?: () => void;
  onRefresh: () => void;
  onSelectConversation: (contactId: number) => void;
  onSelectRoom: (roomId: number) => void;
  onSelectSpace: (spaceId: number | null) => void;
  onSwitchMode: (mode: DrawerMode) => void;
  roomsIsPending: boolean;
  spacesIsPending: boolean;
  unreadCounts?: Record<number, number>;
}

export function LeftDrawer({
  activeSpaces,
  availableRooms,
  currentContactId,
  currentRoomId,
  currentSpaceId,
  dmConversations,
  dmIsPending,
  drawerMode,
  onCreateRoom,
  onCreateSpace,
  onRefresh,
  onSelectConversation,
  onSelectRoom,
  onSelectSpace,
  onSwitchMode,
  roomsIsPending,
  spacesIsPending,
  unreadCounts = {},
}: LeftDrawerProps) {
  const theme = useTheme();
  const [showFriends, setShowFriends] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
  const currentSpace = activeSpaces.find(s => s.spaceId === currentSpaceId);
  const layoutState = getLeftDrawerLayoutState(drawerMode);

  // Group rooms by roomType
  const groupedRooms = useMemo(() => {
    const groups: Record<number, Room[]> = {};
    for (const room of availableRooms) {
      const type = room.roomType ?? 0;
      if (!groups[type]) groups[type] = [];
      groups[type].push(room);
    }
    return groups;
  }, [availableRooms]);

  const toggleSection = (type: number) => {
    setCollapsedSections(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const renderRoomRow = (room: Room) => {
    const active = room.roomId === currentRoomId;
    const roomAvatarUrl = resolveAvatarUrl(room.avatarFileId);
    const unread = room.roomId ? (unreadCounts[room.roomId] ?? 0) : 0;
    return (
      <Pressable
        key={String(room.roomId)}
        onPress={() => { if (room.roomId) onSelectRoom(room.roomId); }}
        style={[styles.roomRow, active ? { backgroundColor: theme.backgroundSelected } : null]}
      >
        <View style={styles.roomAvatarWrap}>
          {roomAvatarUrl ? (
            <Image source={{ uri: roomAvatarUrl }} style={styles.roomAvatar} />
          ) : (
            <View style={[styles.roomAvatarFallback, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={{ fontSize: 12, fontWeight: "700" }}>
                {getInitials(room.name ?? "")}
              </ThemedText>
            </View>
          )}
          {unread > 0 && !active ? (
            <View style={[styles.unreadBadge, { backgroundColor: theme.danger }]}>
              <ThemedText style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                {unread > 99 ? "99+" : String(unread)}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText numberOfLines={1} type="small" style={{ flex: 1 }}>
          {room.name ?? "未命名"}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={[styles.rail, { borderRightColor: theme.border, backgroundColor: theme.background }]}>
        <View style={styles.railFixedTop}>
          <Pressable
            onPress={() => onSwitchMode("dm")}
            style={[styles.railIconButton, { backgroundColor: drawerMode === "dm" ? theme.accentMuted : theme.backgroundElement }]}
          >
            <ChatCircle size={18} color={drawerMode === "dm" ? theme.accent : theme.textSecondary} weight="fill" />
          </Pressable>
        </View>

        <View style={[styles.railDivider, { backgroundColor: theme.border }]} />

        {layoutState.showSpaceRail ? (
          <ScrollView
            style={styles.railScroll}
            contentContainerStyle={styles.railScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeSpaces.map((space) => {
              const active = space.spaceId === currentSpaceId;
              const avatarUrl = resolveAvatarUrl(space.avatarFileId);
              return (
                <Pressable
                  key={String(space.spaceId)}
                  onPress={() => onSelectSpace(space.spaceId ?? null)}
                  style={[
                    styles.spaceButton,
                    {
                      backgroundColor: active ? theme.accentMuted : theme.backgroundElement,
                      borderWidth: active ? 1 : 0,
                      borderColor: active ? theme.accent : "transparent",
                    },
                  ]}
                >
                  {avatarUrl
                    ? <Image source={{ uri: avatarUrl }} style={styles.spaceAvatar} />
                    : <ThemedText style={styles.spaceInitials}>{getInitials(space.name ?? "")}</ThemedText>}
                </Pressable>
              );
            })}
            {spacesIsPending ? (
              <ThemedText style={styles.emptyText} themeColor="textSecondary">同步中…</ThemedText>
            ) : null}

            <Pressable
              onPress={onCreateSpace}
              style={[styles.createSpaceButton, { borderColor: theme.accent }]}
            >
              <Plus size={20} color={theme.accent} />
            </Pressable>
          </ScrollView>
        ) : (
          <View style={styles.railScroll} />
        )}
      </View>

      {layoutState.showRoomsSidebar ? (
        <View style={styles.sidebar}>
          <View style={[styles.sidebarHeader, { borderBottomColor: theme.border }]}>
            <ThemedText numberOfLines={1} type="heading" style={{ flex: 1 }}>
              {currentSpace?.name ?? "选择空间"}
            </ThemedText>
          </View>

          <ScrollView style={styles.roomList} contentContainerStyle={styles.roomListContent}>
            {roomsIsPending ? (
              <ThemedText style={styles.emptyText} themeColor="textSecondary">加载房间…</ThemedText>
            ) : availableRooms.length === 0 ? (
              <ThemedText style={styles.emptyText} themeColor="textSecondary">暂无房间</ThemedText>
            ) : (
              <>
                {ROOM_TYPE_ORDER.map((type) => {
                  const rooms = groupedRooms[type];
                  if (!rooms || rooms.length === 0) return null;
                  const collapsed = !!collapsedSections[type];
                  return (
                    <View key={type}>
                      <Pressable
                        onPress={() => toggleSection(type)}
                        style={styles.sectionHeader}
                      >
                        {collapsed
                          ? <CaretRight size={12} color={theme.textSecondary} />
                          : <CaretDown size={12} color={theme.textSecondary} />}
                        <ThemedText style={styles.sectionLabel} themeColor="textSecondary">
                          {ROOM_TYPE_LABELS[type] ?? `类型 ${type}`}
                        </ThemedText>
                      </Pressable>
                      {!collapsed ? rooms.map(renderRoomRow) : null}
                    </View>
                  );
                })}
                {/* Rooms with unknown type (not in ROOM_TYPE_ORDER) */}
                {Object.entries(groupedRooms)
                  .filter(([type]) => !ROOM_TYPE_ORDER.includes(Number(type)))
                  .map(([type, rooms]) => (
                    <View key={type}>
                      <Pressable
                        onPress={() => toggleSection(Number(type))}
                        style={styles.sectionHeader}
                      >
                        {collapsedSections[Number(type)]
                          ? <CaretRight size={12} color={theme.textSecondary} />
                          : <CaretDown size={12} color={theme.textSecondary} />}
                        <ThemedText style={styles.sectionLabel} themeColor="textSecondary">
                          {ROOM_TYPE_LABELS[Number(type)] ?? `其他房间`}
                        </ThemedText>
                      </Pressable>
                      {!collapsedSections[Number(type)] ? rooms.map(renderRoomRow) : null}
                    </View>
                  ))}
              </>
            )}

            {onCreateRoom && currentSpaceId ? (
              <Pressable onPress={onCreateRoom} style={[styles.createRoomButton, { borderColor: theme.accent }]}>
                <Plus size={16} color={theme.accent} />
                <ThemedText style={{ fontSize: 12, color: theme.accent }}>创建房间</ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      ) : showFriends ? (
        <FriendsManagementView onBack={() => setShowFriends(false)} />
      ) : (
        <DmConversationList
          conversations={dmConversations}
          currentContactId={currentContactId}
          isPending={dmIsPending}
          onOpenFriends={() => setShowFriends(true)}
          onSelectConversation={onSelectConversation}
        />
      )}
    </View>
  );
}
