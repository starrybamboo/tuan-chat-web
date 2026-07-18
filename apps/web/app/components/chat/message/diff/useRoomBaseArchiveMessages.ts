import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { buildBaseArchiveMessageIndex } from "@/components/chat/message/diff/messageVersionDiff";

import { tuanchat } from "../../../../../api/instance";

type UseRoomBaseArchiveMessagesResult = {
  baseMessageByArchiveId: ReturnType<typeof buildBaseArchiveMessageIndex>;
  loading: boolean;
  error: unknown;
};

export default function useRoomBaseArchiveMessages(
  roomId: number,
  baseArchiveCommitId: number | null | undefined,
  enabled: boolean,
): UseRoomBaseArchiveMessagesResult {
  const validCommitId = typeof baseArchiveCommitId === "number" && baseArchiveCommitId > 0
    ? baseArchiveCommitId
    : -1;
  const queryEnabled = enabled && roomId > 0 && validCommitId > 0;
  const archiveMessagesQuery = useQuery({
    queryKey: roomBaseArchiveMessagesQueryKey(roomId, validCommitId),
    queryFn: async () => {
      const response = await tuanchat.chatController.getHistoryMessages({
        roomId,
        syncId: 0,
        commitId: validCommitId,
      });
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: queryEnabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const baseMessageByArchiveId = useMemo(() => {
    const messages = queryEnabled ? (archiveMessagesQuery.data ?? []) : [];
    return buildBaseArchiveMessageIndex(messages);
  }, [archiveMessagesQuery.data, queryEnabled]);

  return {
    baseMessageByArchiveId,
    loading: queryEnabled && archiveMessagesQuery.isPending,
    error: queryEnabled ? archiveMessagesQuery.error : null,
  };
}

export function roomBaseArchiveMessagesQueryKey(roomId: number, baseArchiveCommitId: number) {
  return ["roomBaseArchiveMessages", roomId, baseArchiveCommitId] as const;
}
