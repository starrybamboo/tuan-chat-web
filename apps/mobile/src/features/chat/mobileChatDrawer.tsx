import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { MemberPreviewItem } from "@/features/members/memberUtils";
import type { ComponentProps, ReactNode } from "react";

import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import {
  getCurrentMemberIdentityText,
  getCurrentRoomPresenceText,
} from "@/features/members/memberUtils";
import { DEFAULT_TUANCHAT_API_BASE_URL } from "@/lib/api";

import { getErrorMessage } from "./mobileChatUtils";

const drawerPalette = {
  accent: "#20b7ff",
  active: "rgba(96, 146, 255, 0.18)",
  activeBorder: "rgba(121, 162, 255, 0.68)",
  activityRail: "#171b22",
  activitySurface: "#212732",
  avatarSurface: "#2a303a",
  badge: "#2d3440",
  body: "#1b2027",
  border: "#303642",
  footer: "#1d2229",
  header: "#1d2229",
  primary: "#f3f6fb",
  secondary: "#aab4c4",
  sectionHeader: "#2a313c",
  shell: "#171c22",
  sidebar: "#1d2229",
  spaceRail: "#1c2128",
  tertiary: "#6f7b8b",
} as const;

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: drawerPalette.body,
    flex: 1,
  },
  panelWrap: {
    flex: 1,
  },
  panel: {
    backgroundColor: drawerPalette.body,
    flex: 1,
  },
  shellToolbar: {
    alignItems: "center",
    backgroundColor: drawerPalette.shell,
    borderBottomColor: drawerPalette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 8,
    position: "relative",
  },
  shellToolbarRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  shellToolbarSeparator: {
    backgroundColor: drawerPalette.border,
    height: 18,
    marginHorizontal: 2,
    width: StyleSheet.hairlineWidth,
  },
  shellToolbarAvatar: {
    alignItems: "center",
    backgroundColor: drawerPalette.activitySurface,
    borderRadius: 999,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 10,
    width: 22,
  },
  shellToolbarButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  workspaceBody: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  activityRail: {
    backgroundColor: drawerPalette.activityRail,
    borderRightColor: drawerPalette.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 10,
    width: 56,
  },
  activityRailTop: {
    gap: 8,
  },
  activityRailBottom: {
    marginTop: "auto",
  },
  activityButtonWrap: {
    position: "relative",
  },
  activityButtonPill: {
    backgroundColor: drawerPalette.accent,
    borderRadius: 999,
    height: 30,
    left: -8,
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -15 }],
    width: 3,
  },
  activityButton: {
    alignItems: "center",
    borderRadius: 10,
    minHeight: 50,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  activityGlyph: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  divider: {
    backgroundColor: drawerPalette.border,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 2,
    marginVertical: 8,
  },
  spaceRail: {
    backgroundColor: drawerPalette.spaceRail,
    borderRightColor: drawerPalette.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    width: 56,
  },
  spaceRailContent: {
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    paddingTop: 10,
  },
  spaceButtonWrap: {
    position: "relative",
    width: 48,
  },
  spaceButtonPill: {
    backgroundColor: drawerPalette.accent,
    borderRadius: 999,
    height: 28,
    left: -1,
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -14 }],
    width: 3,
  },
  spaceButton: {
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 2,
  },
  spaceAvatar: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  spaceAvatarText: {
    color: drawerPalette.primary,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 16,
  },
  sidebar: {
    backgroundColor: drawerPalette.sidebar,
    flex: 1,
    minWidth: 0,
  },
  sidebarHeader: {
    alignItems: "center",
    borderBottomColor: drawerPalette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    height: 36,
    paddingHorizontal: 8,
  },
  sidebarHeaderTitleWrap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  sidebarHeaderTitle: {
    color: drawerPalette.primary,
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },
  sidebarHeaderActionRow: {
    flexDirection: "row",
    gap: 4,
  },
  sidebarHeaderAction: {
    alignItems: "center",
    borderRadius: 8,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  sectionScroll: {
    flex: 1,
  },
  sectionScrollContent: {
    gap: 6,
    paddingBottom: 8,
    paddingTop: 8,
  },
  sectionWrap: {
    paddingHorizontal: 4,
  },
  sectionHeader: {
    alignItems: "center",
    backgroundColor: drawerPalette.sectionHeader,
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sectionHeaderTitle: {
    color: drawerPalette.primary,
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    lineHeight: 16,
  },
  sectionHeaderAction: {
    alignItems: "center",
    borderRadius: 6,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  treeWrap: {
    gap: 2,
    paddingTop: 4,
  },
  categoryRow: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    minHeight: 30,
    paddingHorizontal: 8,
  },
  categoryLabel: {
    color: drawerPalette.secondary,
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  categoryBody: {
    gap: 2,
    paddingLeft: 8,
    paddingRight: 4,
  },
  rowItem: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rowAvatar: {
    alignItems: "center",
    backgroundColor: drawerPalette.avatarSurface,
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  rowAvatarText: {
    color: drawerPalette.primary,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },
  avatarImage: {
    borderRadius: 12,
    height: "100%",
    width: "100%",
  },
  rowTitle: {
    color: drawerPalette.primary,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  rowMeta: {
    color: drawerPalette.secondary,
    fontSize: 11,
    lineHeight: 14,
  },
  rowBadge: {
    backgroundColor: drawerPalette.badge,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  emptyText: {
    color: drawerPalette.secondary,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  footer: {
    alignItems: "center",
    backgroundColor: drawerPalette.footer,
    borderTopColor: drawerPalette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footerAvatar: {
    alignItems: "center",
    backgroundColor: drawerPalette.avatarSurface,
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  footerAvatarText: {
    color: drawerPalette.primary,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 15,
  },
  footerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  footerName: {
    color: drawerPalette.primary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  footerMeta: {
    color: drawerPalette.secondary,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },
});

interface MobileChatDrawerProps {
  currentRoomId: number | null;
  currentSpaceId: number | null;
  currentRoomMember: MemberPreviewItem | null;
  currentSpaceMember: MemberPreviewItem | null;
  currentUserId: number | null;
  currentUsername?: string | null;
  memberCount: number;
  onOpenMembers: () => void;
  onOpenSearch: () => void;
  onOpenTools: () => void;
  onRefreshWorkspace: () => void;
  onRequestClose: () => void;
  onSelectRoom: (roomId: number | null) => void;
  onSelectSpace: (spaceId: number | null) => void;
  rooms: Room[];
  roomsError: unknown;
  roomsIsError: boolean;
  roomsIsPending: boolean;
  spaces: Space[];
  spacesError: unknown;
  spacesIsError: boolean;
  spacesIsPending: boolean;
  visible: boolean;
}

function getInitials(source: string) {
  const trimmed = source.trim();
  if (!trimmed) {
    return "TC";
  }
  const latin = trimmed
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2);
  if (latin) {
    return latin.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function resolveEntityImageUrl(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized || normalized === "undefined" || normalized === "null") {
    return null;
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  try {
    const baseOrigin = new URL(DEFAULT_TUANCHAT_API_BASE_URL).origin;
    return new URL(normalized, baseOrigin).toString();
  }
  catch {
    return normalized;
  }
}

function IconButton({
  disabled,
  iconName,
  label,
  onPress,
  size = 18,
  style,
}: {
  disabled?: boolean;
  iconName: ComponentProps<typeof SymbolView>["name"];
  label: string;
  onPress?: () => void;
  size?: number;
  style?: object;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={[
        style,
        disabled ? { opacity: 0.35 } : null,
      ]}
    >
      <SymbolView name={iconName} size={size} tintColor={drawerPalette.primary} weight="medium" />
    </Pressable>
  );
}

function DrawerStateText({
  emptyText,
  error,
  isError,
  isPending,
}: {
  emptyText: string;
  error: unknown;
  isError: boolean;
  isPending: boolean;
}) {
  if (isPending) {
    return <ThemedText style={styles.emptyText}>正在同步列表…</ThemedText>;
  }

  if (isError) {
    return (
      <ThemedText style={styles.emptyText}>
        {getErrorMessage(error, "加载失败，请稍后重试。")}
      </ThemedText>
    );
  }

  return <ThemedText style={styles.emptyText}>{emptyText}</ThemedText>;
}

function ActivityButton({
  active,
  disabled,
  iconName,
  label,
  onPress,
  primary,
}: {
  active?: boolean;
  disabled?: boolean;
  iconName: ComponentProps<typeof SymbolView>["name"];
  label: string;
  onPress?: () => void;
  primary?: boolean;
}) {
  return (
    <View style={styles.activityButtonWrap}>
      {active ? <View style={styles.activityButtonPill} /> : null}
      <Pressable
        accessibilityLabel={label}
        disabled={disabled || !onPress}
        onPress={onPress}
        style={[
          styles.activityButton,
          {
            opacity: disabled ? 0.38 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.activityGlyph,
            {
              backgroundColor: active
                ? drawerPalette.active
                : primary
                  ? "transparent"
                  : drawerPalette.activitySurface,
              borderColor: primary ? drawerPalette.accent : "transparent",
              borderWidth: primary ? 1 : 0,
            },
          ]}
        >
          <SymbolView name={iconName} size={18} tintColor={drawerPalette.primary} weight="medium" />
        </View>
      </Pressable>
    </View>
  );
}

function SpaceRailButton({
  active,
  avatarUrl,
  label,
  onPress,
}: {
  active?: boolean;
  avatarUrl?: string | null;
  label: string;
  onPress: () => void;
}) {
  const resolvedAvatarUrl = resolveEntityImageUrl(avatarUrl);

  return (
    <View style={styles.spaceButtonWrap}>
      {active ? <View style={styles.spaceButtonPill} /> : null}
      <Pressable accessibilityLabel={`切换空间 ${label}`} onPress={onPress} style={styles.spaceButton}>
        <View
          style={[
            styles.spaceAvatar,
            {
              backgroundColor: active ? drawerPalette.active : drawerPalette.activitySurface,
              borderColor: active ? drawerPalette.activeBorder : "transparent",
              borderWidth: active ? 1 : 0,
            },
          ]}
        >
          {resolvedAvatarUrl
            ? <Image source={{ uri: resolvedAvatarUrl }} style={styles.avatarImage} />
            : <ThemedText style={styles.spaceAvatarText}>{getInitials(label)}</ThemedText>}
        </View>
      </Pressable>
    </View>
  );
}

function SidebarSectionHeader({
  actionIcon,
  actionLabel,
  onAction,
  title,
}: {
  actionIcon?: ComponentProps<typeof SymbolView>["name"];
  actionLabel?: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <IconButton
        iconName={{ ios: "chevron.down", android: "expand_more", web: "expand_more" }}
        label={`${title}折叠状态`}
        size={14}
        style={styles.sectionHeaderAction}
      />
      <ThemedText style={styles.sectionHeaderTitle}>{title}</ThemedText>
      {actionIcon && actionLabel
        ? (
            <IconButton
              iconName={actionIcon}
              label={actionLabel}
              onPress={onAction}
              size={14}
              style={styles.sectionHeaderAction}
            />
          )
        : null}
    </View>
  );
}

function SidebarCategory({
  children,
  defaultExpanded = true,
  title,
}: {
  children: ReactNode;
  defaultExpanded?: boolean;
  title: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View>
      <Pressable onPress={() => setExpanded(current => !current)} style={styles.categoryRow}>
        <SymbolView
          name={{ ios: "chevron.down", android: expanded ? "expand_more" : "chevron_right", web: expanded ? "expand_more" : "chevron_right" }}
          size={16}
          tintColor={drawerPalette.secondary}
          weight="medium"
        />
        <ThemedText style={styles.categoryLabel}>{title}</ThemedText>
      </Pressable>
      {expanded ? <View style={styles.categoryBody}>{children}</View> : null}
    </View>
  );
}

function SidebarRoomRow({
  onPress,
  room,
  selected,
}: {
  onPress: () => void;
  room: Room;
  selected: boolean;
}) {
  const roomName = room.name?.trim() || "未命名房间";
  const roomAvatarUrl = resolveEntityImageUrl(room.avatar);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.rowItem,
        selected
          ? {
              backgroundColor: drawerPalette.active,
              borderColor: drawerPalette.activeBorder,
              borderWidth: 1,
            }
          : null,
      ]}
    >
      <View style={styles.rowAvatar}>
        {roomAvatarUrl
          ? <Image source={{ uri: roomAvatarUrl }} style={styles.avatarImage} />
          : <ThemedText style={styles.rowAvatarText}>{getInitials(roomName)}</ThemedText>}
      </View>
      <ThemedText numberOfLines={1} style={styles.rowTitle}>{roomName}</ThemedText>
    </Pressable>
  );
}

function SidebarDocRow({
  title,
}: {
  title: string;
}) {
  return (
    <View style={styles.rowItem}>
      <View style={styles.rowAvatar}>
        <SymbolView
          name={{ ios: "doc.text.fill", android: "description", web: "description" }}
          size={16}
          tintColor={drawerPalette.primary}
          weight="medium"
        />
      </View>
      <ThemedText numberOfLines={1} style={styles.rowTitle}>{title}</ThemedText>
    </View>
  );
}

export function MobileChatDrawer({
  currentRoomId,
  currentSpaceId,
  currentRoomMember,
  currentSpaceMember,
  currentUserId,
  currentUsername,
  memberCount,
  onOpenMembers,
  onOpenSearch,
  onOpenTools,
  onRefreshWorkspace,
  onRequestClose,
  onSelectRoom,
  onSelectSpace,
  rooms,
  roomsError,
  roomsIsError,
  roomsIsPending,
  spaces,
  spacesError,
  spacesIsError,
  spacesIsPending,
  visible,
}: MobileChatDrawerProps) {
  const selectedSpace = spaces.find(space => space.spaceId === currentSpaceId) ?? null;
  const selectedRoom = rooms.find(room => room.roomId === currentRoomId) ?? null;
  const displayName = currentUsername?.trim()
    || (typeof currentUserId === "number" ? `用户 #${currentUserId}` : "当前账号");

  return (
    <Modal
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.panelWrap}>
          <View style={styles.panel}>
              <View style={styles.shellToolbar}>
                <View style={styles.shellToolbarRow}>
                  <IconButton
                    disabled
                    iconName={{ ios: "message.fill", android: "chat", web: "chat" }}
                    label="聊天入口"
                    style={styles.shellToolbarButton}
                  />
                  <IconButton
                    disabled
                    iconName={{ ios: "photo.on.rectangle", android: "image", web: "image" }}
                    label="图像入口"
                    style={styles.shellToolbarButton}
                  />
                  <IconButton
                    disabled
                    iconName={{ ios: "paintbrush.pointed.fill", android: "brush", web: "brush" }}
                    label="创作入口"
                    style={styles.shellToolbarButton}
                  />
                  <View style={styles.shellToolbarSeparator} />
                  <IconButton
                    onPress={onOpenSearch}
                    iconName={{ ios: "magnifyingglass", android: "search", web: "search" }}
                    label="搜索消息"
                    style={styles.shellToolbarButton}
                  />
                  <IconButton
                    onPress={onOpenMembers}
                    iconName={{ ios: "person.2.fill", android: "group", web: "group" }}
                    label="房间成员"
                    style={styles.shellToolbarButton}
                  />
                  <View style={styles.shellToolbarSeparator} />
                  <IconButton
                    onPress={onRefreshWorkspace}
                    iconName={{ ios: "arrow.clockwise", android: "refresh", web: "refresh" }}
                    label="刷新数据"
                    style={styles.shellToolbarButton}
                  />
                </View>
              <Pressable accessibilityLabel="个人入口" onPress={onOpenTools} style={styles.shellToolbarAvatar}>
                <ThemedText style={{ color: drawerPalette.primary, fontSize: 11, fontWeight: "700", lineHeight: 12 }}>
                  {getInitials(displayName).slice(0, 1)}
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.workspaceBody}>
              <View style={styles.activityRail}>
                <View style={styles.activityRailTop}>
                  <ActivityButton
                    active
                    iconName={{ ios: "safari.fill", android: "explore", web: "explore" }}
                    label="发现"
                  />
                  <ActivityButton
                    disabled
                    iconName={{ ios: "bubble.left.and.bubble.right.fill", android: "chat", web: "chat" }}
                    label="私信"
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.activityRailBottom}>
                  <ActivityButton
                    primary
                    iconName={{ ios: "plus", android: "add", web: "add" }}
                    label="创建"
                  />
                </View>
              </View>

              <View style={styles.spaceRail}>
                <ScrollView
                  contentContainerStyle={styles.spaceRailContent}
                  showsVerticalScrollIndicator={false}
                >
                  {spaces.length > 0
                    ? spaces.map(space => {
                        const label = space.name?.trim() || "空间";
                        return (
                          <SpaceRailButton
                            key={String(space.spaceId ?? label)}
                            active={space.spaceId === currentSpaceId}
                            avatarUrl={space.avatar}
                            label={label}
                            onPress={() => onSelectSpace(space.spaceId ?? null)}
                          />
                        );
                      })
                    : (
                        <DrawerStateText
                          emptyText="暂无空间"
                          error={spacesError}
                          isError={spacesIsError}
                          isPending={spacesIsPending}
                        />
                      )}
                </ScrollView>
              </View>

              <View style={styles.sidebar}>
                <View style={styles.sidebarHeader}>
                  <View style={styles.sidebarHeaderTitleWrap}>
                    <SymbolView
                      name={{ ios: "house.fill", android: "home", web: "home" }}
                      size={14}
                      tintColor={drawerPalette.secondary}
                      weight="medium"
                    />
                    <ThemedText numberOfLines={1} style={styles.sidebarHeaderTitle}>
                      {selectedSpace?.name?.trim() || "未选择空间"}
                    </ThemedText>
                    <SymbolView
                      name={{ ios: "chevron.down", android: "expand_more", web: "expand_more" }}
                      size={14}
                      tintColor={drawerPalette.secondary}
                      weight="medium"
                    />
                  </View>

                  <View style={styles.sidebarHeaderActionRow}>
                    <IconButton
                      onPress={onRequestClose}
                      iconName={{ ios: "sidebar.left", android: "view_sidebar", web: "view_sidebar" }}
                      label="收起侧边栏"
                      size={14}
                      style={styles.sidebarHeaderAction}
                    />
                    <IconButton
                      onPress={onOpenTools}
                      iconName={{ ios: "plus", android: "add", web: "add" }}
                      label="更多工具"
                      size={14}
                      style={styles.sidebarHeaderAction}
                    />
                  </View>
                </View>

                <ScrollView
                  contentContainerStyle={styles.sectionScrollContent}
                  showsVerticalScrollIndicator={false}
                  style={styles.sectionScroll}
                >
                  <View style={styles.sectionWrap}>
                    <SidebarSectionHeader
                      title="频道与文档"
                    />

                    <View style={styles.treeWrap}>
                      <SidebarCategory title="频道">
                        {rooms.length > 0
                          ? rooms.map(room => (
                              <SidebarRoomRow
                                key={String(room.roomId ?? room.name ?? "room")}
                                onPress={() => onSelectRoom(room.roomId ?? null)}
                                room={room}
                                selected={room.roomId === currentRoomId}
                              />
                            ))
                          : (
                              <DrawerStateText
                                emptyText="当前空间下还没有可进入房间。"
                                error={roomsError}
                                isError={roomsIsError}
                                isPending={roomsIsPending}
                              />
                            )}
                      </SidebarCategory>

                      <SidebarCategory defaultExpanded={false} title="文档">
                        {selectedSpace
                          ? <SidebarDocRow title="空间简介" />
                          : <ThemedText style={styles.emptyText}>当前空间还没有文档。</ThemedText>}
                      </SidebarCategory>
                    </View>
                  </View>

                  <View style={styles.sectionWrap}>
                    <SidebarSectionHeader
                      actionIcon={{ ios: "shippingbox.fill", android: "inventory_2", web: "inventory_2" }}
                      actionLabel="局内素材包"
                      onAction={onOpenTools}
                      title="素材包"
                    />

                    <View style={styles.treeWrap}>
                      <SidebarCategory defaultExpanded={false} title="局内素材包">
                        <ThemedText style={styles.emptyText}>
                          当前空间还没有导入素材包。
                        </ThemedText>
                      </SidebarCategory>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.footer}>
                  <View style={styles.footerAvatar}>
                    <ThemedText style={styles.footerAvatarText}>{getInitials(displayName)}</ThemedText>
                  </View>
                  <View style={styles.footerTextWrap}>
                    <ThemedText numberOfLines={1} style={styles.footerName}>{displayName}</ThemedText>
                    <ThemedText numberOfLines={1} style={styles.footerMeta}>
                      {getCurrentMemberIdentityText(currentSpaceMember)}
                    </ThemedText>
                    <ThemedText numberOfLines={1} style={styles.footerMeta}>
                      {selectedRoom
                        ? `当前房间：${selectedRoom.name ?? "未命名房间"} · ${memberCount} 位成员`
                        : getCurrentRoomPresenceText(currentRoomMember, currentSpaceMember)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
