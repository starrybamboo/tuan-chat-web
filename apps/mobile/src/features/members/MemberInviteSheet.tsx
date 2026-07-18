import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";
import type { RoomMember } from "@tuanchat/openapi-client/models/RoomMember";
import type { SpaceMember } from "@tuanchat/openapi-client/models/SpaceMember";

import { FlashList } from "@shopify/flash-list";
import { UserPlus } from "phosphor-react-native";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { ContactListAvatar } from "@/features/friends/ContactListAvatar";
import { useFriendsQuery } from "@/features/friends/useFriendsQuery";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

import type { MemberInviteCandidate } from "./memberInviteModel";

import { buildMemberInviteCandidates } from "./memberInviteModel";
import { SpaceInviteSettings } from "./SpaceInviteSettings";
import { getDefaultSpaceInviteMode } from "./spaceInviteLink";
import { useAddSpaceMemberMutation } from "./useAddSpaceMemberMutation";
import { useAddRoomMemberMutation } from "./useRoomMemberMutations";

const MEMBER_AVATAR_SIZE = 36;

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "600" },
  description: { fontSize: 12 },
  header: { gap: Spacing.sm, marginBottom: Spacing.lg },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  listContent: { gap: Spacing.sm, paddingBottom: Spacing.xl },
  memberRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  memberInfo: { flex: 1, gap: 2, minWidth: 0 },
  action: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 64,
    paddingHorizontal: Spacing.lg,
  },
  stateText: { paddingVertical: Spacing.xxl, textAlign: "center" },
  errorText: { fontSize: 12, marginBottom: Spacing.md },
});

type MemberInviteRowProps = {
  avatarFileId?: number;
  disabled: boolean;
  isAdding: boolean;
  isRoomMember: boolean;
  onAddMember: (userId: number) => void;
  source: MemberInviteCandidate["source"];
  userId: number;
  username: string;
  targetLabel: string;
};

const MemberInviteRow = memo(function MemberInviteRow({
  avatarFileId,
  disabled,
  isAdding,
  isRoomMember,
  onAddMember,
  source,
  userId,
  username,
  targetLabel,
}: MemberInviteRowProps) {
  const theme = useTheme();
  const handleAdd = useCallback(() => onAddMember(userId), [onAddMember, userId]);
  return (
    <View style={[styles.memberRow, { backgroundColor: theme.backgroundElement }]}>
      <ContactListAvatar
        colorSeed={userId}
        displayName={username}
        labelFontSize={13}
        size={MEMBER_AVATAR_SIZE}
        uri={avatarThumbUrl(avatarFileId)}
      />
      <View style={styles.memberInfo}>
        <ThemedText numberOfLines={1}>{username}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {source === "space" ? "空间成员" : "好友"}
          {` · ID ${userId}`}
        </ThemedText>
      </View>
      <Pressable
        accessibilityLabel={isRoomMember ? `${username} 已在${targetLabel}` : `邀请 ${username}`}
        accessibilityRole="button"
        accessibilityState={{ busy: isAdding, disabled }}
        disabled={disabled}
        onPress={handleAdd}
        style={[
          styles.action,
          {
            backgroundColor: isRoomMember ? theme.backgroundSelected : theme.accent,
            opacity: disabled && !isRoomMember ? 0.6 : 1,
          },
        ]}
      >
        {isAdding
          ? <ActivityIndicator color="#fff" size="small" />
          : <ThemedText type="smallBold" style={{ color: isRoomMember ? theme.textSecondary : "#fff" }}>{isRoomMember ? "已加入" : "邀请"}</ThemedText>}
      </Pressable>
    </View>
  );
});

type MemberInviteSheetProps = {
  canInvitePlayers?: boolean;
  currentUserId: number | null;
  onClose: () => void;
  roomId?: number | null;
  roomMembers: readonly RoomMember[];
  spaceId: number;
  spaceMembers: readonly SpaceMember[];
  visible: boolean;
  targetType?: "room" | "space";
};

export function MemberInviteSheet({
  canInvitePlayers = false,
  currentUserId,
  onClose,
  roomId,
  roomMembers,
  spaceId,
  spaceMembers,
  visible,
  targetType = "room",
}: MemberInviteSheetProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const friendsQuery = useFriendsQuery();
  const [spaceInviteMode, setSpaceInviteMode] = useState(() => getDefaultSpaceInviteMode(canInvitePlayers));
  const effectiveSpaceInviteMode = canInvitePlayers ? spaceInviteMode : "spectator";
  const addRoomMemberMutation = useAddRoomMemberMutation(roomId ?? 0, spaceId);
  const addSpaceMemberMutation = useAddSpaceMemberMutation(spaceId, effectiveSpaceInviteMode === "player");
  const addMemberMutation = targetType === "space" ? addSpaceMemberMutation : addRoomMemberMutation;
  const { mutateAsync: addMember } = addMemberMutation;
  const [query, setQuery] = useState("");
  const [addingUserId, setAddingUserId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && targetType === "space") {
      setSpaceInviteMode(getDefaultSpaceInviteMode(canInvitePlayers));
    }
  }, [canInvitePlayers, targetType, visible]);

  const roomMemberUserIds = useMemo(() => new Set(
    (targetType === "space" ? spaceMembers : roomMembers)
      .flatMap(member => typeof member.userId === "number" ? [member.userId] : []),
  ), [roomMembers, spaceMembers, targetType]);
  const candidates = useMemo(() => buildMemberInviteCandidates({
    currentUserId,
    friends: (friendsQuery.data ?? []) as FriendResponse[],
    query,
    roomMemberUserIds,
    spaceMembers: targetType === "space" ? [] : spaceMembers,
  }), [currentUserId, friendsQuery.data, query, roomMemberUserIds, spaceMembers, targetType]);

  const handleAddMember = useCallback(async (userId: number) => {
    setAddingUserId(userId);
    setErrorMessage(null);
    try {
      await addMember(userId);
    }
    catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `邀请${targetType === "space" ? "空间" : "房间"}成员失败。`);
    }
    finally {
      setAddingUserId(null);
    }
  }, [addMember, targetType]);

  const renderCandidate = useCallback(({ item }: { item: MemberInviteCandidate }) => (
    <MemberInviteRow
      avatarFileId={item.avatarFileId}
      disabled={item.isRoomMember || addMemberMutation.isPending}
      isAdding={addingUserId === item.userId}
      isRoomMember={item.isRoomMember}
      onAddMember={handleAddMember}
      source={item.source}
      userId={item.userId}
      username={item.username}
      targetLabel={targetType === "space" ? "空间" : "房间"}
    />
  ), [addMemberMutation.isPending, addingUserId, handleAddMember, targetType]);

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="85%"
      onClose={onClose}
      visible={visible}
    >
      <View style={styles.header}>
        <ThemedText style={styles.title}>{targetType === "space" ? "邀请空间成员" : "邀请房间成员"}</ThemedText>
        <ThemedText style={styles.description} themeColor="textSecondary">
          {targetType === "space" ? "通过邀请链接，或从好友中选择" : "从空间成员或好友中选择"}
        </ThemedText>
        {targetType === "space"
          ? (
              <SpaceInviteSettings
                canInvitePlayers={canInvitePlayers}
                inviteMode={effectiveSpaceInviteMode}
                onChangeInviteMode={setSpaceInviteMode}
                spaceId={spaceId}
                visible={visible}
              />
            )
          : null}
        <TextInput
          accessibilityLabel={`搜索可邀请的${targetType === "space" ? "空间" : "房间"}成员`}
          onChangeText={setQuery}
          placeholder="搜索用户名或 ID"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          value={query}
        />
      </View>
      {errorMessage ? <ThemedText accessibilityRole="alert" style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</ThemedText> : null}
      <FlashList
        contentContainerStyle={styles.listContent}
        data={candidates}
        keyboardShouldPersistTaps="handled"
        keyExtractor={item => `invite:${item.userId}`}
        ListEmptyComponent={(
          <View style={styles.stateText}>
            {friendsQuery.isPending ? <ActivityIndicator color={theme.accent} /> : <UserPlus color={theme.textSecondary} size={28} />}
            <ThemedText themeColor="textSecondary">{query ? "没有匹配的成员" : "暂无可邀请成员"}</ThemedText>
          </View>
        )}
        renderItem={renderCandidate}
        style={{ maxHeight: Math.max(180, windowHeight * (targetType === "space" ? 0.32 : 0.58)) }}
      />
    </BottomSheetModal>
  );
}
