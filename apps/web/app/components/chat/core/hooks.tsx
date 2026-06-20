import { use, useMemo, useState } from "react";

import { RoomContext } from "@/components/chat/core/roomContext";

import { useGetMessageByIdQuery, useGetRoomExtraQuery, useSetRoomExtraMutation } from "../../../../api/hooks/chatQueryHooks";

/**
 * 智能的获取消息，优先从缓存中获取，如果没有则从服务器获取。
 * @param messageId
 */
export function useGetMessageByIdSmartly(messageId: number) {
  const roomContext = use(RoomContext);
  const resolvedMessageId = roomContext.chatHistory?.resolveMessageId(messageId) ?? messageId;

  // 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用
  const foundMessageInHistory
    = roomContext.chatHistory?.messages?.find(item =>
      item.message.messageId === messageId || item.message.messageId === resolvedMessageId,
    )?.message;
  const messageQuery = useGetMessageByIdQuery(
    foundMessageInHistory ? -1 : resolvedMessageId,
  );
  return foundMessageInHistory || messageQuery.data?.message;
}

export function useRoomExtra<T>(roomId: number, key: string, defaultValue: T) {
  const [localOverride, setLocalOverride] = useState<{
    key: string;
    roomId: number;
    serialized: string;
    value: T;
  } | null>(null);
  const extraQuery = useGetRoomExtraQuery({ roomId, key });
  const roomExtraMutation = useSetRoomExtraMutation();
  const remoteSerialized = extraQuery.data?.data;

  const remoteValue = useMemo(() => {
    return JSON.parse(remoteSerialized || "null") as T || defaultValue;
  }, [defaultValue, remoteSerialized]);

  const value
    = localOverride
      && localOverride.roomId === roomId
      && localOverride.key === key
      && localOverride.serialized !== remoteSerialized
      ? localOverride.value
      : remoteValue;

  const setValue = (newValue: T) => {
    const serialized = JSON.stringify(newValue);
    setLocalOverride({ roomId, key, serialized, value: newValue });
    roomExtraMutation.mutate({ roomId, key, value: serialized });
  };
  return [value, setValue] as const;
}
