import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Space } from "@tuanchat/openapi-client/models/Space";

import { CaretDown, CaretRight, ChatCircle, Plus } from "phosphor-react-native";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { FlatList, PanResponder, Pressable, StyleSheet, View } from "react-native";

import type { DmBackTarget } from "@/features/friends/dmNavigationState";
import type { DmTab } from "@/features/friends/DmTopTabs";
import type { DmConversation } from "@/features/friends/useDmInboxQuery";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { AllFriendsTab } from "@/features/friends/AllFriendsTab";
import { DmConversationList } from "@/features/friends/DmConversationList";
import { DmTopTabs } from "@/features/friends/DmTopTabs";
import { NewFriendsTab } from "@/features/friends/NewFriendsTab";
import { useBlockFriendMutation, useDeleteFriendMutation } from "@/features/friends/useFriendMutations";
import { useFriendRequestsQuery } from "@/features/friends/useFriendRequestsQuery";
import { useFriendsQuery } from "@/features/friends/useFriendsQuery";
import { useTheme } from "@/hooks/use-theme";
import { DEFAULT_TUANCHAT_API_BASE_URL } from "@/lib/api";
import { SPACE_RAIL_WIDTH } from "@/lib/layout-constants";
import { avatarThumbUrl } from "@/lib/media-url";

import { getLeftDrawerLayoutState } from "./leftDrawerLayout";
import { getSpaceRailIds, moveSpaceRailId } from "./spaceRailOrder";
import { useSpaceRailOrder } from "./useSpaceRailOrder";

const ROOM_AVATAR_SIZE = 32;
const SQUIRCLE_RADIUS = 8;
const SPACE_RAIL_ITEM_HEIGHT = 52;
const SPACE_RAIL_ITEM_CENTER_Y = 20;
const SPACE_RAIL_CONTENT_TOP_PADDING = Spacing.sm;
const SPACE_RAIL_AUTO_SCROLL_EDGE_SIZE = 72;
const SPACE_RAIL_AUTO_SCROLL_MAX_STEP = 14;
const UNREAD_BADGE_SIZE = 16;
const DRAWER_INITIAL_RENDER_COUNT = 12;
const DRAWER_RENDER_BATCH_SIZE = 8;
const DRAWER_WINDOW_SIZE = 7;

const ROOM_TYPE_ALL_MEMBER = 2;
const ROOM_TYPE_GAME = 1;

const ROOM_TYPE_LABELS: Record<number, string> = {
  [ROOM_TYPE_ALL_MEMBER]: "全员房间",
  [ROOM_TYPE_GAME]: "游戏房间",
};

/** Ordered list of room type groups to display */
const ROOM_TYPE_ORDER = [ROOM_TYPE_ALL_MEMBER, ROOM_TYPE_GAME];

type RoomListItem
  = | { key: string; type: "state"; message: string; tone: "danger" | "muted"; retry?: boolean }
    | { key: string; type: "section"; roomType: number; label: string; collapsed: boolean }
    | { key: string; type: "room"; room: Room }
    | { key: string; type: "create-room" };

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
    position: "relative",
    width: 40,
  },
  railDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.sm,
    width: 28,
  },
  railScroll: { flex: 1 },
  railScrollContent: { alignItems: "center", paddingTop: Spacing.sm },
  spaceButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  spaceButtonDragging: {
    elevation: 6,
    opacity: 0.72,
    zIndex: 2,
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
  roomListContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg },
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
    height: UNREAD_BADGE_SIZE,
    justifyContent: "center",
    minWidth: 16,
    position: "absolute",
    right: -4,
    top: -4,
  },
  unreadBadgeCompact: {
    width: UNREAD_BADGE_SIZE,
  },
  unreadBadgeWide: {
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
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
  if (!trimmed)
    return "TC";
  return trimmed.slice(0, 2).toUpperCase();
}

function resolveAvatarUrl(fileId: number | null | undefined) {
  const url = avatarThumbUrl(fileId);
  if (!url)
    return null;
  if (/^https?:\/\//i.test(url))
    return url;
  try {
    return new URL(url, new URL(DEFAULT_TUANCHAT_API_BASE_URL).origin).toString();
  }
  catch {
    return url;
  }
}

function getUnreadBadgeShape(count: number) {
  return count > 99 ? styles.unreadBadgeWide : styles.unreadBadgeCompact;
}

export type DrawerMode = "rooms" | "dm";

type DmSidebarProps = {
  activeDmTab: DmTab;
  currentContactId: number | null;
  dmConversations: DmConversation[];
  dmIsPending: boolean;
  onChangeDmTab: (tab: DmTab) => void;
  onSelectConversation: (contactId: number, source?: DmBackTarget) => void;
};

function DmSidebar({ activeDmTab, dmConversations, currentContactId, dmIsPending, onChangeDmTab, onSelectConversation }: DmSidebarProps) {
  const friendsQuery = useFriendsQuery();
  const deleteMutation = useDeleteFriendMutation();
  const blockMutation = useBlockFriendMutation();

  const friends = friendsQuery.data ?? [];

  return (
    <View style={{ flex: 1 }}>
      <DmTopTabs activeTab={activeDmTab} onChangeTab={onChangeDmTab} />
      {activeDmTab === "chat" && (
        <DmConversationList
          conversations={dmConversations}
          currentContactId={currentContactId}
          hideHeader
          isPending={dmIsPending}
          onSelectConversation={contactId => onSelectConversation(contactId, "conversation")}
        />
      )}
      {activeDmTab === "friends" && (
        <AllFriendsTab
          friends={friends}
          isPending={friendsQuery.isPending}
          onDeleteFriend={userId => deleteMutation.mutate(userId)}
          onBlockFriend={userId => blockMutation.mutate(userId)}
          isBlocking={blockMutation.isPending}
          onStartChat={userId => onSelectConversation(userId, "friend")}
        />
      )}
      {activeDmTab === "new-friends" && (
        <NewFriendsTab />
      )}
    </View>
  );
}

type LeftDrawerProps = {
  activeDmTab: DmTab;
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
  onChangeDmTab: (tab: DmTab) => void;
  onRefresh: () => void;
  onSelectConversation: (contactId: number, source?: DmBackTarget) => void;
  onSelectRoom: (roomId: number) => void;
  onSelectSpace: (spaceId: number | null) => void;
  onSwitchMode: (mode: DrawerMode) => void;
  roomsError?: unknown;
  roomsIsError?: boolean;
  roomsIsPending: boolean;
  spacesError?: unknown;
  spacesIsError?: boolean;
  spacesIsPending: boolean;
  unreadCounts?: Record<number, number>;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

function buildRoomListItems(options: {
  collapsedSections: Record<number, boolean>;
  currentSpaceId: number | null;
  groupedRooms: Record<number, Room[]>;
  onCreateRoom?: () => void;
  roomsError?: unknown;
  roomsIsError: boolean;
  roomsIsPending: boolean;
  totalRooms: number;
}): RoomListItem[] {
  const {
    collapsedSections,
    currentSpaceId,
    groupedRooms,
    onCreateRoom,
    roomsError,
    roomsIsError,
    roomsIsPending,
    totalRooms,
  } = options;
  const items: RoomListItem[] = [];

  if (roomsIsPending) {
    items.push({ key: "state:pending", type: "state", tone: "muted", message: "加载房间…" });
  }
  else if (roomsIsError) {
    items.push({
      key: "state:error",
      type: "state",
      tone: "danger",
      retry: true,
      message: getErrorMessage(roomsError, "加载房间失败"),
    });
  }
  else if (totalRooms === 0) {
    items.push({ key: "state:empty", type: "state", tone: "muted", message: "暂无房间" });
  }
  else {
    const orderedTypes = [
      ...ROOM_TYPE_ORDER,
      ...Object.keys(groupedRooms)
        .map(Number)
        .filter(type => !ROOM_TYPE_ORDER.includes(type))
        .sort((a, b) => a - b),
    ];

    for (const roomType of orderedTypes) {
      const rooms = groupedRooms[roomType] ?? [];
      if (rooms.length === 0) {
        continue;
      }

      const collapsed = !!collapsedSections[roomType];
      items.push({
        key: `section:${roomType}`,
        type: "section",
        roomType,
        label: ROOM_TYPE_LABELS[roomType] ?? (ROOM_TYPE_ORDER.includes(roomType) ? `类型 ${roomType}` : "其他房间"),
        collapsed,
      });

      if (!collapsed) {
        rooms.forEach((room, index) => {
          items.push({
            key: `room:${room.roomId ?? `${roomType}:${index}:${room.name ?? ""}`}`,
            type: "room",
            room,
          });
        });
      }
    }
  }

  if (onCreateRoom && currentSpaceId) {
    items.push({ key: "create-room", type: "create-room" });
  }

  return items;
}

function LeftDrawerInner({
  activeDmTab,
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
  onChangeDmTab,
  onRefresh: _onRefresh,
  onSelectConversation,
  onSelectRoom,
  onSelectSpace,
  onSwitchMode,
  roomsError,
  roomsIsError = false,
  roomsIsPending,
  spacesError,
  spacesIsError = false,
  spacesIsPending,
  unreadCounts = {},
}: LeftDrawerProps) {
  const theme = useTheme();
  const friendRequestsQuery = useFriendRequestsQuery();
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
  const [draggingSpaceId, setDraggingSpaceId] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [dragTargetIndex, setDragTargetIndex] = useState(-1);
  const spaceRailListRef = useRef<FlatList<Space> | null>(null);
  const spaceRailViewportHeightRef = useRef(0);
  const spaceRailContentHeightRef = useRef(0);
  const spaceRailScrollOffsetRef = useRef(0);
  const dragStartScrollOffsetRef = useRef(0);
  const dragDyRef = useRef(0);
  const dragActiveRef = useRef(false);
  const dragAutoScrollFrameRef = useRef<number | null>(null);
  const dragBaseOrderIdsRef = useRef<number[]>([]);
  const dragStartIndexRef = useRef(-1);
  const dragCurrentIndexRef = useRef(-1);
  const currentSpace = activeSpaces.find(s => s.spaceId === currentSpaceId);
  const layoutState = getLeftDrawerLayoutState(drawerMode);
  const { orderedSpaces, orderedSpaceIds, setSpaceRailOrder } = useSpaceRailOrder(activeSpaces);
  const dmUnreadTotal = useMemo(
    () => dmConversations.reduce((total, conversation) => total + Math.max(0, conversation.unreadCount), 0),
    [dmConversations],
  );
  const dmRailBadgeCount = dmUnreadTotal + (friendRequestsQuery.data?.length ?? 0);

  // Group rooms by roomType
  const groupedRooms = useMemo(() => {
    const groups: Record<number, Room[]> = {};
    for (const room of availableRooms) {
      const type = room.roomType ?? 0;
      if (!groups[type])
        groups[type] = [];
      groups[type].push(room);
    }
    return groups;
  }, [availableRooms]);
  const roomListItems = useMemo(() => buildRoomListItems({
    collapsedSections,
    currentSpaceId,
    groupedRooms,
    onCreateRoom,
    roomsError,
    roomsIsError,
    roomsIsPending,
    totalRooms: availableRooms.length,
  }), [availableRooms.length, collapsedSections, currentSpaceId, groupedRooms, onCreateRoom, roomsError, roomsIsError, roomsIsPending]);

  const toggleSection = useCallback((type: number) => {
    setCollapsedSections(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const updateSpaceDragPosition = useCallback((dy: number, scrollOffset: number) => {
    const baseOrder = dragBaseOrderIdsRef.current;
    const startIndex = dragStartIndexRef.current;
    if (baseOrder.length <= 1 || startIndex < 0) {
      return;
    }

    const scrollDelta = scrollOffset - dragStartScrollOffsetRef.current;
    const totalOffset = dy + scrollDelta;
    const minOffset = -startIndex * SPACE_RAIL_ITEM_HEIGHT;
    const maxOffset = (baseOrder.length - 1 - startIndex) * SPACE_RAIL_ITEM_HEIGHT;
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, totalOffset));
    const targetIndex = Math.max(
      0,
      Math.min(baseOrder.length - 1, startIndex + Math.round(clampedOffset / SPACE_RAIL_ITEM_HEIGHT)),
    );

    setDragOffsetY(clampedOffset);
    if (targetIndex === dragCurrentIndexRef.current) {
      return;
    }

    dragCurrentIndexRef.current = targetIndex;
    setDragTargetIndex(targetIndex);
  }, []);

  const getDragPointerViewportY = useCallback((dy: number) => {
    const startIndex = dragStartIndexRef.current;
    if (startIndex < 0) {
      return null;
    }

    return SPACE_RAIL_CONTENT_TOP_PADDING
      + startIndex * SPACE_RAIL_ITEM_HEIGHT
      + SPACE_RAIL_ITEM_CENTER_Y
      - dragStartScrollOffsetRef.current
      + dy;
  }, []);

  const getAutoScrollStep = useCallback((pointerViewportY: number | null) => {
    const viewportHeight = spaceRailViewportHeightRef.current;
    if (pointerViewportY == null || viewportHeight <= 0) {
      return 0;
    }

    if (pointerViewportY < SPACE_RAIL_AUTO_SCROLL_EDGE_SIZE) {
      const strength = 1 - Math.max(0, pointerViewportY) / SPACE_RAIL_AUTO_SCROLL_EDGE_SIZE;
      return -Math.max(2, Math.ceil(strength * SPACE_RAIL_AUTO_SCROLL_MAX_STEP));
    }

    if (pointerViewportY > viewportHeight - SPACE_RAIL_AUTO_SCROLL_EDGE_SIZE) {
      const distanceIntoEdge = pointerViewportY - (viewportHeight - SPACE_RAIL_AUTO_SCROLL_EDGE_SIZE);
      const strength = Math.min(1, Math.max(0, distanceIntoEdge) / SPACE_RAIL_AUTO_SCROLL_EDGE_SIZE);
      return Math.max(2, Math.ceil(strength * SPACE_RAIL_AUTO_SCROLL_MAX_STEP));
    }

    return 0;
  }, []);

  const stopSpaceRailAutoScroll = useCallback(() => {
    if (dragAutoScrollFrameRef.current != null) {
      cancelAnimationFrame(dragAutoScrollFrameRef.current);
      dragAutoScrollFrameRef.current = null;
    }
  }, []);

  const runSpaceRailAutoScroll = useCallback(function runSpaceRailAutoScrollFrame() {
    dragAutoScrollFrameRef.current = null;
    if (!dragActiveRef.current) {
      return;
    }

    const step = getAutoScrollStep(getDragPointerViewportY(dragDyRef.current));
    if (step === 0) {
      return;
    }

    const maxScrollOffset = Math.max(
      0,
      spaceRailContentHeightRef.current - spaceRailViewportHeightRef.current,
    );
    const currentOffset = spaceRailScrollOffsetRef.current;
    const nextOffset = Math.max(0, Math.min(maxScrollOffset, currentOffset + step));
    if (nextOffset === currentOffset) {
      return;
    }

    spaceRailScrollOffsetRef.current = nextOffset;
    spaceRailListRef.current?.scrollToOffset({ animated: false, offset: nextOffset });
    updateSpaceDragPosition(dragDyRef.current, nextOffset);
    dragAutoScrollFrameRef.current = requestAnimationFrame(runSpaceRailAutoScrollFrame);
  }, [getAutoScrollStep, getDragPointerViewportY, updateSpaceDragPosition]);

  const updateSpaceRailAutoScroll = useCallback((dy: number) => {
    const shouldAutoScroll = getAutoScrollStep(getDragPointerViewportY(dy)) !== 0;
    if (!shouldAutoScroll) {
      stopSpaceRailAutoScroll();
      return;
    }

    dragAutoScrollFrameRef.current ??= requestAnimationFrame(runSpaceRailAutoScroll);
  }, [getAutoScrollStep, getDragPointerViewportY, runSpaceRailAutoScroll, stopSpaceRailAutoScroll]);

  const resetDraggingSpace = useCallback(() => {
    stopSpaceRailAutoScroll();
    dragActiveRef.current = false;
    setDraggingSpaceId(null);
    setDragOffsetY(0);
    setDragTargetIndex(-1);
    dragBaseOrderIdsRef.current = [];
    dragStartIndexRef.current = -1;
    dragCurrentIndexRef.current = -1;
    dragDyRef.current = 0;
    dragStartScrollOffsetRef.current = 0;
  }, [stopSpaceRailAutoScroll]);

  const handleStartSpaceDrag = useCallback((space: Space) => {
    if (!space.spaceId || orderedSpaces.length <= 1) {
      return;
    }

    const baseOrder = getSpaceRailIds(orderedSpaces);
    const startIndex = baseOrder.indexOf(space.spaceId);
    if (startIndex < 0) {
      return;
    }

    dragBaseOrderIdsRef.current = baseOrder;
    dragStartIndexRef.current = startIndex;
    dragCurrentIndexRef.current = startIndex;
    dragStartScrollOffsetRef.current = spaceRailScrollOffsetRef.current;
    dragDyRef.current = 0;
    dragActiveRef.current = true;
    setDragOffsetY(0);
    setDragTargetIndex(startIndex);
    setDraggingSpaceId(space.spaceId);
  }, [orderedSpaces]);

  const handleMoveSpaceDrag = useCallback((dy: number) => {
    dragDyRef.current = dy;
    updateSpaceDragPosition(dy, spaceRailScrollOffsetRef.current);
    updateSpaceRailAutoScroll(dy);
  }, [updateSpaceDragPosition, updateSpaceRailAutoScroll]);

  const handleEndSpaceDrag = useCallback(() => {
    const baseOrder = dragBaseOrderIdsRef.current;
    const startIndex = dragStartIndexRef.current;
    const targetIndex = dragCurrentIndexRef.current;
    if (draggingSpaceId != null && baseOrder.length > 0 && startIndex >= 0 && targetIndex >= 0) {
      setSpaceRailOrder(moveSpaceRailId(baseOrder, startIndex, targetIndex));
    }
    resetDraggingSpace();
  }, [draggingSpaceId, resetDraggingSpace, setSpaceRailOrder]);

  const spaceRailPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => draggingSpaceId != null,
    onMoveShouldSetPanResponderCapture: () => draggingSpaceId != null,
    onPanResponderMove: (_event, gestureState) => handleMoveSpaceDrag(gestureState.dy),
    onPanResponderRelease: handleEndSpaceDrag,
    onPanResponderTerminate: resetDraggingSpace,
    onPanResponderTerminationRequest: () => draggingSpaceId == null,
    onShouldBlockNativeResponder: () => draggingSpaceId != null,
  }), [draggingSpaceId, handleEndSpaceDrag, handleMoveSpaceDrag, resetDraggingSpace]);

  const renderRetryText = useCallback((message: string) => (
    <Pressable onPress={_onRefresh} style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}>
      <ThemedText style={{ color: theme.danger, fontSize: 12 }}>
        {message}
      </ThemedText>
      <ThemedText themeColor="accent" type="caption">点此重试</ThemedText>
    </Pressable>
  ), [_onRefresh, theme.danger]);

  const renderRoomRow = useCallback((room: Room) => {
    const active = room.roomId === currentRoomId;
    const roomAvatarUrl = resolveAvatarUrl(room.avatarFileId);
    const unread = room.roomId ? (unreadCounts[room.roomId] ?? 0) : 0;
    return (
      <Pressable
        onPress={() => {
          if (room.roomId)
            onSelectRoom(room.roomId);
        }}
        style={[styles.roomRow, active ? { backgroundColor: theme.backgroundSelected } : null]}
      >
        <View style={styles.roomAvatarWrap}>
          {roomAvatarUrl
            ? (
                <CachedImage uri={roomAvatarUrl} style={styles.roomAvatar} />
              )
            : (
                <View style={[styles.roomAvatarFallback, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText style={{ fontSize: 12, fontWeight: "700" }}>
                    {getInitials(room.name ?? "")}
                  </ThemedText>
                </View>
              )}
          {unread > 0 && !active
            ? (
                <View style={[styles.unreadBadge, getUnreadBadgeShape(unread), { backgroundColor: theme.danger }]}>
                  <ThemedText style={styles.unreadBadgeText}>
                    {unread > 99 ? "99+" : String(unread)}
                  </ThemedText>
                </View>
              )
            : null}
        </View>
        <ThemedText numberOfLines={1} type="small" style={{ flex: 1 }}>
          {room.name ?? "未命名"}
        </ThemedText>
      </Pressable>
    );
  }, [currentRoomId, onSelectRoom, theme.backgroundElement, theme.backgroundSelected, theme.danger, unreadCounts]);

  const renderSpaceItem = useCallback(({ item: space, index }: { item: Space; index: number }) => {
    const active = space.spaceId === currentSpaceId;
    const dragging = space.spaceId != null && space.spaceId === draggingSpaceId;
    const dragStartIndex = dragStartIndexRef.current;
    let displacedOffsetY = 0;
    if (!dragging && draggingSpaceId != null && dragStartIndex >= 0 && dragTargetIndex >= 0) {
      if (dragTargetIndex > dragStartIndex && index > dragStartIndex && index <= dragTargetIndex) {
        displacedOffsetY = -SPACE_RAIL_ITEM_HEIGHT;
      }
      else if (dragTargetIndex < dragStartIndex && index >= dragTargetIndex && index < dragStartIndex) {
        displacedOffsetY = SPACE_RAIL_ITEM_HEIGHT;
      }
    }
    const avatarUrl = resolveAvatarUrl(space.avatarFileId);
    return (
      <Pressable
        onPress={() => {
          if (draggingSpaceId != null) {
            return;
          }
          onSelectSpace(space.spaceId ?? null);
        }}
        onLongPress={() => handleStartSpaceDrag(space)}
        delayLongPress={180}
        style={[
          styles.spaceButton,
          dragging ? styles.spaceButtonDragging : null,
          dragging ? { transform: [{ translateY: dragOffsetY }, { scale: 0.96 }] } : null,
          !dragging && displacedOffsetY !== 0 ? { transform: [{ translateY: displacedOffsetY }] } : null,
          {
            backgroundColor: active ? theme.accentMuted : theme.backgroundElement,
            borderWidth: active ? 1 : 0,
            borderColor: active ? theme.accent : "transparent",
            marginBottom: Spacing.md,
          },
        ]}
      >
        {avatarUrl
          ? <CachedImage uri={avatarUrl} style={styles.spaceAvatar} />
          : <ThemedText style={styles.spaceInitials}>{getInitials(space.name ?? "")}</ThemedText>}
      </Pressable>
    );
  }, [currentSpaceId, dragOffsetY, dragTargetIndex, draggingSpaceId, handleStartSpaceDrag, onSelectSpace, theme.accent, theme.accentMuted, theme.backgroundElement]);

  const renderSpaceFooter = useCallback(() => (
    <View style={{ alignItems: "center", gap: Spacing.md }}>
      {spacesIsPending
        ? <ThemedText style={styles.emptyText} themeColor="textSecondary">同步中…</ThemedText>
        : null}
      {spacesIsError
        ? renderRetryText(getErrorMessage(spacesError, "加载空间失败"))
        : null}
      <Pressable
        onPress={onCreateSpace}
        style={[styles.createSpaceButton, { borderColor: theme.accent }]}
      >
        <Plus size={20} color={theme.accent} />
      </Pressable>
    </View>
  ), [onCreateSpace, renderRetryText, spacesError, spacesIsError, spacesIsPending, theme.accent]);

  const renderRoomListItem = useCallback(({ item }: { item: RoomListItem }) => {
    if (item.type === "state") {
      if (item.retry) {
        return renderRetryText(item.message);
      }
      return (
        <ThemedText
          style={styles.emptyText}
          themeColor={item.tone === "danger" ? undefined : "textSecondary"}
        >
          {item.message}
        </ThemedText>
      );
    }

    if (item.type === "section") {
      return (
        <Pressable
          onPress={() => toggleSection(item.roomType)}
          style={styles.sectionHeader}
        >
          {item.collapsed
            ? <CaretRight size={12} color={theme.textSecondary} />
            : <CaretDown size={12} color={theme.textSecondary} />}
          <ThemedText style={styles.sectionLabel} themeColor="textSecondary">
            {item.label}
          </ThemedText>
        </Pressable>
      );
    }

    if (item.type === "create-room") {
      return (
        <Pressable onPress={onCreateRoom} style={[styles.createRoomButton, { borderColor: theme.accent }]}>
          <Plus size={16} color={theme.accent} />
          <ThemedText style={{ fontSize: 12, color: theme.accent }}>创建房间</ThemedText>
        </Pressable>
      );
    }

    return renderRoomRow(item.room);
  }, [onCreateRoom, renderRetryText, renderRoomRow, theme.accent, theme.textSecondary, toggleSection]);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={[styles.rail, { borderRightColor: theme.border, backgroundColor: theme.background }]}>
        <View style={styles.railFixedTop}>
          <Pressable
            onPress={() => onSwitchMode("dm")}
            style={[styles.railIconButton, { backgroundColor: drawerMode === "dm" ? theme.accentMuted : theme.backgroundElement }]}
          >
            <ChatCircle size={18} color={drawerMode === "dm" ? theme.accent : theme.textSecondary} weight="fill" />
            {dmRailBadgeCount > 0
              ? (
                  <View style={[styles.unreadBadge, getUnreadBadgeShape(dmRailBadgeCount), { backgroundColor: theme.danger }]}>
                    <ThemedText style={styles.unreadBadgeText}>
                      {dmRailBadgeCount > 99 ? "99+" : String(dmRailBadgeCount)}
                    </ThemedText>
                  </View>
                )
              : null}
          </Pressable>
        </View>

        <View style={[styles.railDivider, { backgroundColor: theme.border }]} />

        {layoutState.showSpaceRail
          ? (
              <View style={styles.railScroll} {...spaceRailPanResponder.panHandlers}>
                <FlatList
                  ref={spaceRailListRef}
                  data={orderedSpaces}
                  contentContainerStyle={styles.railScrollContent}
                  extraData={`${draggingSpaceId ?? ""}:${dragOffsetY}:${dragTargetIndex}:${orderedSpaceIds.join(",")}`}
                  keyExtractor={space => `space:${space.spaceId ?? space.name ?? "unknown"}`}
                  renderItem={renderSpaceItem}
                  ListFooterComponent={renderSpaceFooter}
                  initialNumToRender={DRAWER_INITIAL_RENDER_COUNT}
                  maxToRenderPerBatch={DRAWER_RENDER_BATCH_SIZE}
                  onContentSizeChange={(_width, height) => {
                    spaceRailContentHeightRef.current = height;
                  }}
                  onLayout={(event) => {
                    spaceRailViewportHeightRef.current = event.nativeEvent.layout.height;
                  }}
                  onScroll={(event) => {
                    const nextOffset = event.nativeEvent.contentOffset.y;
                    spaceRailScrollOffsetRef.current = nextOffset;
                    if (dragActiveRef.current) {
                      updateSpaceDragPosition(dragDyRef.current, nextOffset);
                    }
                  }}
                  // Space rail 支持拖拽排序，裁剪回收会干扰拖拽中的目标测算。
                  removeClippedSubviews={false}
                  scrollEventThrottle={16}
                  scrollEnabled={draggingSpaceId == null}
                  showsVerticalScrollIndicator={false}
                  updateCellsBatchingPeriod={50}
                  windowSize={DRAWER_WINDOW_SIZE}
                />
              </View>
            )
          : (
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

          <FlatList
            data={roomListItems}
            style={styles.roomList}
            contentContainerStyle={styles.roomListContent}
            keyExtractor={item => item.key}
            renderItem={renderRoomListItem}
            initialNumToRender={DRAWER_INITIAL_RENDER_COUNT}
            maxToRenderPerBatch={DRAWER_RENDER_BATCH_SIZE}
            updateCellsBatchingPeriod={50}
            windowSize={DRAWER_WINDOW_SIZE}
          />
        </View>
      ) : (
        <DmSidebar
          activeDmTab={activeDmTab}
          dmConversations={dmConversations}
          currentContactId={currentContactId}
          dmIsPending={dmIsPending}
          onChangeDmTab={onChangeDmTab}
          onSelectConversation={onSelectConversation}
        />
      )}
    </View>
  );
}

export const LeftDrawer = memo(LeftDrawerInner);
