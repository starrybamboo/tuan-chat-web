import type { QueryClient } from "@tanstack/react-query";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CLIENT_METADATA_STALE_TIME_MS,
  clientMetadataBatchQueryKey,
  loadClientMetadataBatch,
  seedClientMetadataCaches,
} from "@tuanchat/query/metadata";
import { getUserInfoQueryKey } from "@tuanchat/query/users";
import { useEffect, useMemo } from "react";

import { mobileApiClient } from "@/lib/api";
import { avatarThumbUrl } from "@/lib/media-url";

import type { RoomRolesById } from "./chat-avatar-utils";

import { buildDeferredChatMetadataRequest } from "./chat-avatar-resolution";
import { resolveMessageAvatarFileId, resolveMessageAvatarId } from "./chat-avatar-utils";
import { isOutOfCharacterMessage } from "./messageAuthorLabel";

const EMPTY_USER_AVATAR_FILE_IDS = new Map<number, number>();

type CachedAvatarResponse = {
  data?: {
    avatarFileId?: number | null;
  } | null;
};

function getCachedAvatarFileId(queryClient: QueryClient, queryKey: readonly unknown[]) {
  const avatarFileId = queryClient.getQueryData<CachedAvatarResponse>(queryKey)?.data?.avatarFileId;
  return typeof avatarFileId === "number" && avatarFileId > 0 ? avatarFileId : undefined;
}

export function resolveChatMessageAvatarUrl(
  message: Message,
  roomRolesById: RoomRolesById,
  roleAvatarFileIdByAvatarId: ReadonlyMap<number, number>,
  userAvatarFileIdByUserId: ReadonlyMap<number, number>,
): string | null {
  if (isOutOfCharacterMessage(message) && typeof message.userId === "number" && message.userId > 0) {
    const userAvatarFileId = userAvatarFileIdByUserId.get(message.userId);
    return userAvatarFileId != null ? avatarThumbUrl(userAvatarFileId) : null;
  }

  const directAvatarFileId = resolveMessageAvatarFileId(message, roomRolesById);
  if (directAvatarFileId != null) {
    return avatarThumbUrl(directAvatarFileId);
  }

  const avatarId = resolveMessageAvatarId(message, roomRolesById);
  const roleAvatarFileId = avatarId == null ? undefined : roleAvatarFileIdByAvatarId.get(avatarId);
  return roleAvatarFileId != null ? avatarThumbUrl(roleAvatarFileId) : null;
}

export function useChatAvatarMetadata(
  messages: readonly Message[],
  roomRolesById: RoomRolesById,
  knownUserAvatarFileIdByUserId: ReadonlyMap<number, number> = EMPTY_USER_AVATAR_FILE_IDS,
  enabled = true,
) {
  const knownUserIds = useMemo(
    () => new Set(knownUserAvatarFileIdByUserId.keys()),
    [knownUserAvatarFileIdByUserId],
  );
  const candidateRequest = useMemo(
    () => buildDeferredChatMetadataRequest(messages, roomRolesById, knownUserIds),
    [knownUserIds, messages, roomRolesById],
  );
  const queryClient = useQueryClient();
  const request = useMemo(() => ({
    avatarIds: candidateRequest.avatarIds.filter(
      avatarId => getCachedAvatarFileId(queryClient, ["getRoleAvatar", avatarId]) == null,
    ),
    userIds: candidateRequest.userIds.filter(
      userId => getCachedAvatarFileId(queryClient, getUserInfoQueryKey(userId)) == null,
    ),
  }), [candidateRequest.avatarIds, candidateRequest.userIds, queryClient]);
  const metadataQuery = useQuery({
    enabled: enabled && (request.avatarIds.length > 0 || request.userIds.length > 0),
    queryFn: () => loadClientMetadataBatch(mobileApiClient, request),
    queryKey: clientMetadataBatchQueryKey(request, mobileApiClient),
    staleTime: CLIENT_METADATA_STALE_TIME_MS,
  });

  useEffect(() => {
    if (metadataQuery.data) {
      seedClientMetadataCaches(queryClient, metadataQuery.data);
    }
  }, [metadataQuery.data, queryClient]);

  const roleAvatarFileIdByAvatarId = useMemo(() => {
    const avatarFileIds = new Map<number, number>();
    candidateRequest.avatarIds.forEach((avatarId) => {
      const avatarFileId = getCachedAvatarFileId(queryClient, ["getRoleAvatar", avatarId]);
      if (avatarFileId != null) {
        avatarFileIds.set(avatarId, avatarFileId);
      }
    });
    Object.values(metadataQuery.data?.avatars ?? {}).forEach((avatar) => {
      if (avatar.avatarId && avatar.avatarFileId) {
        avatarFileIds.set(avatar.avatarId, avatar.avatarFileId);
      }
    });
    return avatarFileIds;
  }, [candidateRequest.avatarIds, metadataQuery.data?.avatars, queryClient]);
  const userAvatarFileIdByUserId = useMemo(() => {
    const avatarFileIds = new Map(knownUserAvatarFileIdByUserId);
    candidateRequest.userIds.forEach((userId) => {
      const avatarFileId = getCachedAvatarFileId(queryClient, getUserInfoQueryKey(userId));
      if (avatarFileId != null) {
        avatarFileIds.set(userId, avatarFileId);
      }
    });
    Object.values(metadataQuery.data?.users ?? {}).forEach((user) => {
      if (user.userId && user.avatarFileId) {
        avatarFileIds.set(user.userId, user.avatarFileId);
      }
    });
    return avatarFileIds;
  }, [candidateRequest.userIds, knownUserAvatarFileIdByUserId, metadataQuery.data?.users, queryClient]);

  return {
    roleAvatarFileIdByAvatarId,
    userAvatarFileIdByUserId,
  };
}
