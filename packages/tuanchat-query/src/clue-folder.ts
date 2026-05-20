import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ClueFolderScope } from "@tuanchat/domain/clue-folder";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { SpaceMember } from "@tuanchat/openapi-client/models/SpaceMember";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import {
  buildClueFolderExtraValue,
  buildClueMessageCopyRequest,
  canCopyMessageToClueFolder,
  CLUE_FOLDER_EXTRA_KEY,
  getClueFolderRoomName,
  getPublicClueFolderMemberIds,
  partitionClueFolderRooms,
} from "@tuanchat/domain/clue-folder";

import { getAllRoomMessagesQueryKey } from "./chat";
import { getRoomMembersQueryKey } from "./members";
import { getUserMessageSessionsQueryKey } from "./message-sessions";
import { upsertRoomMessagesListData } from "./room-message";
import { getUserRoomsQueryKey, fetchUserRoomsWithCache, upsertUserRoomQueryData } from "./spaces";

type ClueFolderClient = Pick<TuanChat, "chatController" | "roomController" | "spaceController">;

type ApiResultLike = {
  errMsg?: string;
  success?: boolean;
};

type ClueFolderRoom = Room & { roomId: number };

type CopyMessageToClueFolderRequest = {
  currentUserId?: number | null;
  fallbackRoleId?: number | null;
  hasHostPrivileges?: boolean;
  scope: ClueFolderScope;
  sourceMessage: Message;
  spaceId?: number | null;
  spaceMembers?: SpaceMember[];
};

function hasRoomId(room: Room | null | undefined): room is Room & { roomId: number } {
  return typeof room?.roomId === "number" && Number.isFinite(room.roomId) && room.roomId > 0;
}

function isSuccess(result: ApiResultLike | null | undefined): boolean {
  return result?.success === true;
}

function getErrorMessage(result: ApiResultLike | null | undefined, fallback: string): string {
  return result?.errMsg?.trim() || fallback;
}

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function useJoinPublicClueFolderMutation(client: ClueFolderClient) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spaceId: number) => {
      const result = await client.roomController.joinPublicClueFolder(spaceId);
      if (!hasRoomId(result.data)) {
        throw new Error(result.errMsg?.trim() || "加入公共线索失败");
      }
      return {
        room: result.data,
        spaceId,
      };
    },
    mutationKey: ["joinPublicClueFolder"],
    onSuccess: ({ room, spaceId }) => {
      upsertUserRoomQueryData(queryClient, spaceId, room);
      queryClient.invalidateQueries({ queryKey: getUserRoomsQueryKey(spaceId) });
      queryClient.invalidateQueries({ queryKey: ["getUserRooms"] });
      queryClient.invalidateQueries({ queryKey: getRoomMembersQueryKey(room.roomId) });
      queryClient.invalidateQueries({ queryKey: getUserMessageSessionsQueryKey() });
    },
  });
}

export function useEnsureClueFolderRoomMutation(client: ClueFolderClient) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: {
      currentUserId?: number | null;
      scope: ClueFolderScope;
      spaceId?: number | null;
      spaceMembers?: SpaceMember[];
    }): Promise<{ room: ClueFolderRoom; spaceId: number }> => {
      const resolvedSpaceId = toPositiveNumber(request.spaceId);
      const resolvedUserId = toPositiveNumber(request.currentUserId);
      if (!resolvedSpaceId) {
        throw new Error("未选择空间，无法收藏线索");
      }
      if (!resolvedUserId) {
        throw new Error("未识别当前用户，无法收藏线索");
      }

      const roomsResult = await fetchUserRoomsWithCache(queryClient, client, resolvedSpaceId);
      if (!isSuccess(roomsResult)) {
        throw new Error(getErrorMessage(roomsResult, "获取房间列表失败"));
      }

      const existingRooms = partitionClueFolderRooms(roomsResult.data?.rooms ?? [], resolvedUserId);
      const existing = request.scope === "private"
        ? existingRooms.privateClueRoom
        : existingRooms.publicClueRoom;
      if (hasRoomId(existing)) {
        return { room: existing, spaceId: resolvedSpaceId };
      }

      const userIdList = request.scope === "private"
        ? [resolvedUserId]
        : getPublicClueFolderMemberIds(request.spaceMembers ?? [], resolvedUserId);
      const createResult = await client.spaceController.createRoom({
        roomName: getClueFolderRoomName(request.scope),
        spaceId: resolvedSpaceId,
        userIdList,
      });
      const createdRoom = createResult.data;
      const roomId = toPositiveNumber(createdRoom?.roomId);
      if (!isSuccess(createResult) || !createdRoom || !roomId) {
        throw new Error(getErrorMessage(createResult, "创建线索夹失败"));
      }

      const extraValue = buildClueFolderExtraValue({
        createdAt: new Date().toISOString(),
        ownerUserId: request.scope === "private" ? resolvedUserId : undefined,
        scope: request.scope,
      });
      const setExtraResult = await client.roomController.setRoomExtra({
        key: CLUE_FOLDER_EXTRA_KEY,
        roomId,
        value: extraValue,
      });
      if (!isSuccess(setExtraResult)) {
        throw new Error(getErrorMessage(setExtraResult, "标记线索夹失败"));
      }

      return {
        room: {
          ...createdRoom,
          extra: JSON.stringify({ [CLUE_FOLDER_EXTRA_KEY]: extraValue }),
          roomId,
        },
        spaceId: resolvedSpaceId,
      };
    },
    mutationKey: ["ensureClueFolderRoom"],
    onSuccess: ({ room, spaceId }) => {
      upsertUserRoomQueryData(queryClient, spaceId, room);
      queryClient.invalidateQueries({ queryKey: getUserRoomsQueryKey(spaceId) });
      queryClient.invalidateQueries({ queryKey: getUserMessageSessionsQueryKey() });
    },
  });
}

export function useCopyMessageToClueFolderMutation(client: ClueFolderClient) {
  const queryClient = useQueryClient();
  const ensureClueFolderRoom = useEnsureClueFolderRoomMutation(client);

  return useMutation({
    mutationFn: async (request: CopyMessageToClueFolderRequest) => {
      if (!canCopyMessageToClueFolder(request.sourceMessage)) {
        throw new Error("这条消息不能添加为线索");
      }
      if (!request.hasHostPrivileges && !toPositiveNumber(request.fallbackRoleId)) {
        throw new Error("请先选择一个可发言角色，再添加线索");
      }

      const { room } = await ensureClueFolderRoom.mutateAsync({
        currentUserId: request.currentUserId,
        scope: request.scope,
        spaceId: request.spaceId,
        spaceMembers: request.spaceMembers,
      });
      const messageRequest = buildClueMessageCopyRequest({
        fallbackRoleId: request.fallbackRoleId,
        sourceMessage: request.sourceMessage,
        targetRoomId: room.roomId,
      });
      const sendResult = await client.chatController.batchSendMessages([messageRequest]);
      if (!isSuccess(sendResult)) {
        throw new Error(getErrorMessage(sendResult, "添加线索失败"));
      }

      return {
        messages: sendResult.data ?? [],
        room,
      };
    },
    mutationKey: ["copyMessageToClueFolder"],
    onSuccess: ({ messages, room }) => {
      if (messages.length > 0) {
        queryClient.setQueryData<ChatMessageResponse[]>(
          getAllRoomMessagesQueryKey(room.roomId),
          current => upsertRoomMessagesListData(current, messages.map(message => ({ message }))),
        );
      }
      queryClient.invalidateQueries({ queryKey: getAllRoomMessagesQueryKey(room.roomId) });
      queryClient.invalidateQueries({ queryKey: getUserMessageSessionsQueryKey() });
    },
  });
}
