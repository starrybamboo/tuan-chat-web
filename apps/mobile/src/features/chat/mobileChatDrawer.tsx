import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { ComponentProps, ReactNode } from "react";

import { SymbolView } from "expo-symbols";
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { DEFAULT_TUANCHAT_API_BASE_URL } from "@/lib/api";

import { getErrorMessage } from "./mobileChatUtils";

const drawerPalette = {
  accent: "#20b7ff",
  active: "rgba(96, 146, 255, 0.18)",
  activeBorder: "rgba(121, 162, 255, 0.68)",
  activityRail: "#171b22",
  activitySurface: "#212732",
  body: "#1b2027",
  border: "#303642",
  primary: "#f3f6fb",
  secondary: "#aab4c4",
  shell: "#171c22",
  sidebar: "#1d2229",
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
    paddingHorizontal: 6,
    paddingTop: 10,
    width: 56,
  },
  activityRailTop: {
    gap: 8,
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
  spaceRailContent: {
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    paddingTop: 10,
  },
  spaceButtonWrap: {
    position: "relative",
    width: 44,
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
  createSpaceAvatar: {
    borderColor: drawerPalette.accent,
    borderStyle: "dashed",
    borderWidth: 1,
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
    gap: 14,
    paddingBottom: 18,
    paddingTop: 12,
  },
  sectionWrap: {
    paddingHorizontal: 12,
  },
  navSectionLabel: {
    color: drawerPalette.tertiary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    lineHeight: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  navSectionBody: {
    gap: 2,
  },
  navRow: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  navDot: {
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  navRowTitle: {
    color: drawerPalette.primary,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  avatarImage: {
    borderRadius: 12,
    height: "100%",
    width: "100%",
  },
  emptyText: {
    color: drawerPalette.secondary,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
});

interface MobileChatDrawerProps {
  currentSpaceId: number | null;
  currentUserId: number | null;
  currentUsername?: string | null;
  onOpenMembers: () => void;
  onOpenSearch: () => void;
  onOpenTools: () => void;
  onCreateSpace?: () => void;
  onRefreshWorkspace: () => void;
  onRequestClose: () => void;
  onSelectSpace: (spaceId: number | null) => void;
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

function CreateSpaceButton({ onPress }: { onPress?: () => void }) {
  return (
    <View style={styles.spaceButtonWrap}>
      <Pressable
        accessibilityLabel="创建空间"
        disabled={!onPress}
        onPress={onPress}
        style={[styles.spaceButton, { opacity: onPress ? 1 : 0.5 }]}
      >
        <View style={[styles.spaceAvatar, styles.createSpaceAvatar]}>
          <SymbolView name={{ ios: "plus", android: "add", web: "add" }} size={24} tintColor={drawerPalette.accent} weight="medium" />
        </View>
      </Pressable>
    </View>
  );
}

function DiscoverNavRow({
  active,
  color,
  label,
  onPress,
}: {
  active?: boolean;
  color: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.navRow,
        active ? { backgroundColor: "rgba(10, 14, 20, 0.44)" } : null,
      ]}
    >
      <View style={[styles.navDot, { backgroundColor: color }]} />
      <ThemedText numberOfLines={1} style={styles.navRowTitle}>{label}</ThemedText>
    </Pressable>
  );
}

function DiscoverNavSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.sectionWrap}>
      <ThemedText style={styles.navSectionLabel}>{title}</ThemedText>
      <View style={styles.navSectionBody}>{children}</View>
    </View>
  );
}

export function MobileChatDrawer({
  currentSpaceId,
  currentUserId,
  currentUsername,
  onCreateSpace,
  onOpenMembers,
  onOpenSearch,
  onOpenTools,
  onRefreshWorkspace,
  onRequestClose,
  onSelectSpace,
  spaces,
  spacesError,
  spacesIsError,
  spacesIsPending,
  visible,
}: MobileChatDrawerProps) {
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

                <ScrollView
                  contentContainerStyle={styles.spaceRailContent}
                  showsVerticalScrollIndicator={false}
                  style={{ flex: 1 }}
                >
                  {spaces.length > 0
                    ? spaces.map((space) => {
                        const label = space.name?.trim() || "空间";
                        return (
                          <SpaceRailButton
                            key={String(space.spaceId ?? label)}
                            active={space.spaceId === currentSpaceId}
                            avatarUrl={space.avatar}
                            label={label}
                            onPress={() => {
                              onSelectSpace(space.spaceId ?? null);
                              onRequestClose();
                            }}
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
                  <CreateSpaceButton onPress={onCreateSpace ?? onOpenTools} />
                </ScrollView>
              </View>

              <View style={styles.sidebar}>
                <View style={styles.sidebarHeader}>
                  <View style={styles.sidebarHeaderTitleWrap}>
                    <SymbolView
                      name={{ ios: "safari.fill", android: "explore", web: "explore" }}
                      size={14}
                      tintColor={drawerPalette.secondary}
                      weight="medium"
                    />
                    <ThemedText numberOfLines={1} style={styles.sidebarHeaderTitle}>
                      发现
                    </ThemedText>
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
                  <DiscoverNavSection title="局外素材">
                    <DiscoverNavRow active color="#d4a72c" label="素材广场" onPress={onRequestClose} />
                    <DiscoverNavRow color="#cf3d9f" label="我的素材包" onPress={onOpenTools} />
                  </DiscoverNavSection>

                  <DiscoverNavSection title="归档仓库">
                    <DiscoverNavRow color="#10b89a" label="广场" onPress={onOpenTools} />
                    <DiscoverNavRow color="#6b69d6" label="我的归档" onPress={onOpenTools} />
                  </DiscoverNavSection>
                </ScrollView>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
