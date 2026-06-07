import { useCallback } from "react";
import toast from "react-hot-toast";

import {
  useCopyMessageToClueFolderMutation,
  useEnsureClueFolderRoomMutation,
  useJoinPublicClueFolderMutation,
} from "@tuanchat/query/clue-folder";

import type { Message, SpaceMember } from "../../../../api";
import type { ClueFolderScope } from "./clueRooms";

import { tuanchat } from "../../../../api/instance";

type UseClueFolderActionsParams = {
  currentUserId?: number | null;
  fallbackRoleId?: number | null;
  hasHostPrivileges?: boolean;
  spaceId?: number | null;
  spaceMembers?: SpaceMember[];
};

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

export function useClueFolderActions({
  currentUserId,
  fallbackRoleId,
  hasHostPrivileges = false,
  spaceId,
  spaceMembers = [],
}: UseClueFolderActionsParams) {
  const { mutateAsync: joinPublicClueFolderAsync } = useJoinPublicClueFolderMutation(tuanchat);
  const { mutateAsync: ensureClueFolderRoomAsync } = useEnsureClueFolderRoomMutation(tuanchat);
  const { mutateAsync: copyMessageToClueFolderAsync } = useCopyMessageToClueFolderMutation(tuanchat);

  const ensureClueFolderRoom = useCallback(async (scope: ClueFolderScope) => {
    return (await ensureClueFolderRoomAsync({
      currentUserId,
      scope,
      spaceId,
      spaceMembers,
    })).room;
  }, [currentUserId, ensureClueFolderRoomAsync, spaceId, spaceMembers]);

  const joinPublicClueFolder = useCallback(async () => {
    const resolvedSpaceId = toPositiveNumber(spaceId);
    if (!resolvedSpaceId) {
      throw new Error("未选择空间，无法查看公共线索");
    }

    return (await joinPublicClueFolderAsync(resolvedSpaceId)).room;
  }, [joinPublicClueFolderAsync, spaceId]);

  const copyMessageToClueFolder = useCallback(async (sourceMessage: Message, scope: ClueFolderScope) => {
    const toastId = toast.loading(scope === "private" ? "正在收藏到我的线索..." : "正在收藏到公共线索...");
    try {
      await copyMessageToClueFolderAsync({
        currentUserId,
        fallbackRoleId,
        hasHostPrivileges,
        scope,
        sourceMessage,
        spaceId,
        spaceMembers,
      });

      toast.success(scope === "private" ? "已收藏到我的线索" : "已收藏到公共线索", { id: toastId });
    }
    catch (error) {
      console.error("[ClueFolder] copy message failed", error);
      toast.error(error instanceof Error ? error.message : "收藏线索失败", { id: toastId });
    }
  }, [
    copyMessageToClueFolderAsync,
    currentUserId,
    fallbackRoleId,
    hasHostPrivileges,
    spaceId,
    spaceMembers,
  ]);

  return {
    copyMessageToClueFolder,
    ensureClueFolderRoom,
    joinPublicClueFolder,
  };
}
