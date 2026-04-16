import { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/use-current-user-query";
import { MemberPreviewList } from "@/features/members/memberPreviewList";
import {
  findCurrentMember,
  getCurrentMemberIdentityText,
  getCurrentRoomPresenceText,
  mergeRoomMembersWithSpaceMembers,
} from "@/features/members/memberUtils";
import { useRoomMembersQuery } from "@/features/members/useRoomMembersQuery";
import { useSpaceMembersQuery } from "@/features/members/useSpaceMembersQuery";
import { useUserRoomsQuery } from "@/features/rooms/use-user-rooms-query";
import { useUserActiveSpacesQuery } from "@/features/spaces/use-user-active-spaces-query";
import { useWorkspaceSession } from "@/features/workspace/workspace-session";
import { useTheme } from "@/hooks/use-theme";
import { DEFAULT_TUANCHAT_API_BASE_URL } from "@/lib/api";

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.four,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  centerState: {
    alignItems: "center",
    gap: Spacing.two,
    justifyContent: "center",
    paddingVertical: Spacing.four,
  },
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  content: {
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
  },
  errorText: {
    color: "#c0392b",
  },
  hero: {
    gap: Spacing.three,
  },
  infoColumn: {
    gap: Spacing.two,
  },
  inlineButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: Spacing.three,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  primaryButtonText: {
    color: "#ffffff",
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: Spacing.three,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  subtitle: {
    lineHeight: 22,
    opacity: 0.75,
  },
  title: {
    textAlign: "left",
  },
});

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return fallback;
}

function getRoomTypeLabel(roomType?: number) {
  if (roomType === 2) {
    return "全员房间";
  }
  return "游戏房间";
}

function getTokenPreview(token?: string) {
  const trimmed = token?.trim() ?? "";
  if (!trimmed) {
    return "未保存";
  }

  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}...${trimmed.slice(-6)}`;
}

function getStorageBackendLabel() {
  return Platform.OS === "web" ? "localStorage" : "SecureStore";
}

function SectionHeader({
  title,
  actionLabel,
  onPress,
  disabled,
}: {
  title: string;
  actionLabel?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {actionLabel && onPress
        ? (
            <Pressable
              disabled={disabled}
              onPress={onPress}
              style={[
                styles.inlineButton,
                {
                  borderColor: theme.backgroundSelected,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            >
              <ThemedText type="small">{actionLabel}</ThemedText>
            </Pressable>
          )
        : null}
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, isAuthenticated, isBootstrapping, signOut } = useAuthSession();
  const {
    clearWorkspaceSelection,
    selectedRoomId,
    selectedSpaceId,
  } = useWorkspaceSession();
  const currentUserQuery = useCurrentUserQuery();
  const spacesQuery = useUserActiveSpacesQuery();
  const roomsQuery = useUserRoomsQuery(selectedSpaceId);
  const spaceMembersQuery = useSpaceMembersQuery(selectedSpaceId);
  const roomMembersQuery = useRoomMembersQuery(selectedRoomId);

  const activeSpaces = spacesQuery.data?.data ?? [];
  const availableRooms = roomsQuery.data?.data?.rooms ?? [];
  const selectedSpace = activeSpaces.find(space => space.spaceId === selectedSpaceId) ?? null;
  const selectedRoom = availableRooms.find(room => room.roomId === selectedRoomId) ?? null;
  const currentUserId = currentUserQuery.data?.data?.userId ?? session?.userId ?? null;
  const spaceMembers = useMemo(() => {
    return spaceMembersQuery.data?.data ?? [];
  }, [spaceMembersQuery.data?.data]);
  const roomMembers = useMemo(() => {
    return mergeRoomMembersWithSpaceMembers(roomMembersQuery.data?.data ?? [], spaceMembers);
  }, [roomMembersQuery.data?.data, spaceMembers]);
  const currentSpaceMember = useMemo(() => {
    return findCurrentMember(spaceMembers, currentUserId);
  }, [currentUserId, spaceMembers]);
  const currentRoomMember = useMemo(() => {
    return findCurrentMember(roomMembers, currentUserId);
  }, [currentUserId, roomMembers]);

  const isRefreshingWorkspace = currentUserQuery.isFetching
    || spacesQuery.isFetching
    || roomsQuery.isFetching
    || spaceMembersQuery.isFetching
    || roomMembersQuery.isFetching;

  const handleRefreshAll = async () => {
    await currentUserQuery.refetch();
    await spacesQuery.refetch();

    if (selectedSpaceId) {
      await Promise.all([
        roomsQuery.refetch(),
        spaceMembersQuery.refetch(),
      ]);
    }

    if (selectedRoomId) {
      await roomMembersQuery.refetch();
    }
  };

  const handleClearWorkspaceSelection = () => {
    clearWorkspaceSelection();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.hero}>
            <ThemedText type="title" style={styles.title}>
              我的
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              这里现在不只是调试页，还会承担账号资料、工作区恢复和本地设置入口。
            </ThemedText>
          </ThemedView>

          {isBootstrapping
            ? (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ActivityIndicator />
                  <ThemedText>正在恢复本地登录态…</ThemedText>
                </ThemedView>
              )
            : null}

          {!isBootstrapping && !isAuthenticated
            ? (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <SectionHeader title="当前状态" />
                  <ThemedText>你还没有登录，请先回到工作台完成登录。</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    登录完成后，这里会展示账号资料、当前工作区、本地存储和成员信息。
                  </ThemedText>
                </ThemedView>
              )
            : null}

          {!isBootstrapping && isAuthenticated
            ? (
                <>
                  <ThemedView type="backgroundElement" style={styles.card}>
                    <SectionHeader
                      title="账号资料"
                      actionLabel="刷新全部"
                      onPress={() => void handleRefreshAll()}
                      disabled={isRefreshingWorkspace}
                    />
                    {currentUserQuery.isPending
                      ? (
                          <View style={styles.centerState}>
                            <ActivityIndicator />
                            <ThemedText themeColor="textSecondary">正在读取当前用户信息…</ThemedText>
                          </View>
                        )
                      : currentUserQuery.isError
                        ? (
                            <ThemedText style={styles.errorText}>
                              {getErrorMessage(currentUserQuery.error, "获取当前用户信息失败。")}
                            </ThemedText>
                          )
                        : (
                            <View style={styles.infoColumn}>
                              <ThemedText>
                                用户名：
                                {currentUserQuery.data?.data?.username ?? session?.username ?? "未返回"}
                              </ThemedText>
                              <ThemedText>
                                用户 ID：
                                {String(currentUserQuery.data?.data?.userId ?? session?.userId ?? "-")}
                              </ThemedText>
                              <ThemedText>
                                邮箱：
                                {currentUserQuery.data?.data?.email ?? "未返回"}
                              </ThemedText>
                              <ThemedText>
                                简介：
                                {currentUserQuery.data?.data?.description ?? "未填写"}
                              </ThemedText>
                              <ThemedText themeColor="textSecondary">
                                Token 预览：
                                {getTokenPreview(session?.token)}
                              </ThemedText>
                            </View>
                          )}
                  </ThemedView>

                  <ThemedView type="backgroundElement" style={styles.card}>
                    <SectionHeader
                      title="工作区与成员"
                      actionLabel="刷新工作区"
                      onPress={() => void handleRefreshAll()}
                      disabled={isRefreshingWorkspace}
                    />
                    <View style={styles.infoColumn}>
                      <ThemedText>
                        当前空间：
                        {selectedSpace?.name ?? "尚未选择空间"}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        当前空间 ID：
                        {String(selectedSpace?.spaceId ?? "-")}
                      </ThemedText>
                      <ThemedText>
                        当前房间：
                        {selectedRoom?.name ?? "尚未选择房间"}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        房间类型：
                        {selectedRoom ? getRoomTypeLabel(selectedRoom.roomType) : "尚未进入房间"}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        {getCurrentMemberIdentityText(currentSpaceMember)}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        {getCurrentRoomPresenceText(currentRoomMember, currentSpaceMember)}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        已加入活跃空间
                        {activeSpaces.length}
                        个，当前空间下房间
                        {availableRooms.length}
                        个。
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        当前空间成员
                        {spaceMembers.length}
                        名，当前房间成员
                        {roomMembers.length}
                        名。
                      </ThemedText>
                    </View>

                    <View style={styles.buttonRow}>
                      <Pressable
                        onPress={handleClearWorkspaceSelection}
                        style={[
                          styles.secondaryButton,
                          {
                            borderColor: theme.backgroundSelected,
                          },
                        ]}
                      >
                        <ThemedText>清空工作区选择</ThemedText>
                      </Pressable>
                    </View>
                  </ThemedView>

                  {selectedSpaceId
                    ? (
                        <ThemedView type="backgroundElement" style={styles.card}>
                          <SectionHeader
                            title="空间成员预览"
                            actionLabel="刷新成员"
                            onPress={() => void spaceMembersQuery.refetch()}
                            disabled={spaceMembersQuery.isFetching}
                          />
                          <MemberPreviewList
                            currentUserId={currentUserId}
                            emptyText="当前空间还没有可显示的成员。"
                            error={spaceMembersQuery.error}
                            isError={spaceMembersQuery.isError}
                            isPending={spaceMembersQuery.isPending}
                            members={spaceMembers}
                          />
                        </ThemedView>
                      )
                    : null}

                  {selectedRoomId
                    ? (
                        <ThemedView type="backgroundElement" style={styles.card}>
                          <SectionHeader
                            title="房间成员预览"
                            actionLabel="刷新成员"
                            onPress={() => void roomMembersQuery.refetch()}
                            disabled={roomMembersQuery.isFetching}
                          />
                          <MemberPreviewList
                            currentUserId={currentUserId}
                            emptyText="当前房间还没有可显示的成员。"
                            error={roomMembersQuery.error}
                            isError={roomMembersQuery.isError}
                            isPending={roomMembersQuery.isPending}
                            members={roomMembers}
                          />
                        </ThemedView>
                      )
                    : null}

                  <ThemedView type="backgroundElement" style={styles.card}>
                    <SectionHeader title="本地设置与环境" />
                    <View style={styles.infoColumn}>
                      <ThemedText>
                        平台：
                        {Platform.OS}
                      </ThemedText>
                      <ThemedText>
                        默认 API Base：
                        {DEFAULT_TUANCHAT_API_BASE_URL}
                      </ThemedText>
                      <ThemedText>
                        会话存储：
                        {getStorageBackendLabel()}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        工作区恢复：已启用，会在重新打开 App 后尽量恢复上次空间和房间。
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        退出登录时会清除本地会话和工作区记忆，避免跨账号串状态。
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        查询层：React Query + 共享 `@tuanchat/query`
                      </ThemedText>
                    </View>
                  </ThemedView>

                  <ThemedView type="backgroundElement" style={styles.card}>
                    <SectionHeader title="账号操作" />
                    <View style={styles.buttonRow}>
                      <Pressable
                        onPress={() => void signOut()}
                        style={[styles.primaryButton, { backgroundColor: theme.text }]}
                      >
                        <ThemedText style={styles.primaryButtonText}>退出登录</ThemedText>
                      </Pressable>
                    </View>
                  </ThemedView>
                </>
              )
            : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
