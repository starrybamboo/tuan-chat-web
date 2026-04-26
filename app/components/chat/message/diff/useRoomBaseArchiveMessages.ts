import { useEffect, useMemo, useState } from "react";

import { buildBaseArchiveMessageIndex } from "@/components/chat/message/diff/messageVersionDiff";

import type { ChatMessageResponse } from "../../../../../api";

import { tuanchat } from "../../../../../api/instance";

type UseRoomBaseArchiveMessagesResult = {
  baseMessageByArchiveId: ReturnType<typeof buildBaseArchiveMessageIndex>;
  loading: boolean;
  error: unknown;
};

export default function useRoomBaseArchiveMessages(
  roomId: number,
  parentCommitId: number | null | undefined,
  enabled: boolean,
): UseRoomBaseArchiveMessagesResult {
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!enabled || roomId <= 0 || !parentCommitId) {
      queueMicrotask(() => setMessages([]));
      queueMicrotask(() => setLoading(false));
      queueMicrotask(() => setError(null));
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    queueMicrotask(() => setError(null));

    tuanchat.chatController.getHistoryMessages({
      roomId,
      syncId: 0,
      commitId: parentCommitId,
    })
      .then((response) => {
        if (cancelled) {
          return;
        }
        setMessages(Array.isArray(response?.data) ? response.data : []);
      })
      .catch((nextError: unknown) => {
        if (cancelled) {
          return;
        }
        console.error("[message-version-diff] Failed to load base archive messages", nextError);
        setMessages([]);
        setError(nextError);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, parentCommitId, roomId]);

  const baseMessageByArchiveId = useMemo(() => buildBaseArchiveMessageIndex(messages), [messages]);

  return {
    baseMessageByArchiveId,
    loading,
    error,
  };
}
