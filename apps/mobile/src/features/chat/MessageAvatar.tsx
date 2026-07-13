import { useQuery } from "@tanstack/react-query";
import { bindCancelablePromiseToSignal } from "@tuanchat/query";
import { getUserInfoQueryKey, USER_INFO_STALE_TIME_MS } from "@tuanchat/query/users";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { mobileApiClient } from "@/lib/api";
import { avatarThumbUrl } from "@/lib/media-url";

import type { RoomRolesById } from "./chat-avatar-utils";

import { resolveMessageAvatarFileId, resolveMessageAvatarId } from "./chat-avatar-utils";

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

const styles = StyleSheet.create({
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});

function getAvatarColor(userId: number | undefined) {
  if (!userId) {
    return AVATAR_COLORS[0];
  }
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function getAvatarInitial(displayName: string) {
  return displayName ? displayName.slice(0, 1) : "?";
}

type MessageAvatarProps = {
  avatarFileId?: number | null;
  avatarId?: number | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  preferUserAvatar?: boolean;
  roleId?: number | null;
  roomRolesById?: RoomRolesById;
  shouldFetchMissingAvatar?: boolean;
  size?: number;
  userId?: number | null;
};

export const MessageAvatar = memo(({
  avatarFileId,
  avatarId,
  avatarUrl,
  displayName,
  preferUserAvatar,
  roleId,
  roomRolesById,
  shouldFetchMissingAvatar = true,
  size = 40,
  userId,
}: MessageAvatarProps) => {
  const shouldUseUserIdentity = Boolean(preferUserAvatar);
  const resolvedAvatarFileId = shouldUseUserIdentity
    ? null
    : resolveMessageAvatarFileId(
        {
          avatarFileId: avatarFileId ?? undefined,
          roleId: roleId ?? undefined,
        },
        roomRolesById,
      );
  const resolvedAvatarId = shouldUseUserIdentity
    ? null
    : resolveMessageAvatarId(
        {
          avatarId: avatarId ?? undefined,
          roleId: roleId ?? undefined,
        },
        roomRolesById,
      );
  const hasProvidedAvatarUrl = avatarUrl !== undefined;
  const shouldFetchAvatar = shouldFetchMissingAvatar && !hasProvidedAvatarUrl && resolvedAvatarFileId == null && resolvedAvatarId != null;
  const roleAvatarQuery = useQuery({
    enabled: shouldFetchAvatar,
    queryFn: async ({ signal }) => {
      if (resolvedAvatarId == null)
        return null;
      const response = await bindCancelablePromiseToSignal(
        mobileApiClient.avatarController.getRoleAvatar(resolvedAvatarId),
        signal,
      );
      return response;
    },
    queryKey: ["getRoleAvatar", resolvedAvatarId] as const,
    staleTime: 24 * 60 * 60_000,
  });
  const shouldFetchUserAvatar = shouldUseUserIdentity
    && shouldFetchMissingAvatar
    && !hasProvidedAvatarUrl
    && resolvedAvatarFileId == null
    && !roleAvatarQuery.data?.data?.avatarFileId
    && typeof userId === "number"
    && userId > 0;
  const userInfoQuery = useQuery({
    enabled: shouldFetchUserAvatar,
    queryFn: async ({ signal }) => {
      if (typeof userId !== "number" || userId <= 0)
        return null;
      const response = await bindCancelablePromiseToSignal(
        mobileApiClient.userController.getUserInfo(userId),
        signal,
      );
      return response;
    },
    queryKey: getUserInfoQueryKey(userId ?? -1),
    staleTime: USER_INFO_STALE_TIME_MS,
  });
  const resolvedAvatarUrl = hasProvidedAvatarUrl
    ? avatarUrl
    : resolvedAvatarFileId
      ? avatarThumbUrl(resolvedAvatarFileId)
      : avatarThumbUrl(roleAvatarQuery.data?.data?.avatarFileId ?? userInfoQuery.data?.data?.avatarFileId);
  const borderRadius = size / 2;

  if (resolvedAvatarUrl) {
    return (
      <CachedImage
        uri={resolvedAvatarUrl}
        contentFit="cover"
        style={{ borderRadius, height: size, width: size }}
      />
    );
  }

  return (
    <View style={{ alignItems: "center", backgroundColor: getAvatarColor(userId ?? undefined), borderRadius, height: size, justifyContent: "center", width: size }}>
      <ThemedText style={styles.avatarText}>{getAvatarInitial(displayName ?? "")}</ThemedText>
    </View>
  );
});
