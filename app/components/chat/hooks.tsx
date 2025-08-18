import { RoomContext } from "@/components/chat/roomContext";
import { use, useEffect, useState } from "react";
import { useGetMessageByIdQuery, useGetRoomExtraQuery, useSetRoomExtraMutation } from "../../../api/hooks/chatQueryHooks";

/**
 * 智能的获取消息，优先从缓存中获取，如果没有则从服务器获取。
 * @param messageId
 */
export function useGetMessageByIdSmartly(messageId: number) {
  const roomContext = use(RoomContext);

  // 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用
  const foundMessageInHistory
    = roomContext.chatHistory?.messages?.find(item => item.message.messageId === messageId)?.message;
  const messageQuery = useGetMessageByIdQuery(
    foundMessageInHistory ? -1 : messageId,
  );
  return foundMessageInHistory || messageQuery.data?.message;
}

export function useRoomExtra<T>(roomId: number, key: string, defaultValue: T) {
  const [value, setValueRaw] = useState<T>(defaultValue);
  const extraQuery = useGetRoomExtraQuery({ roomId, key });
  const roomExtraMutation = useSetRoomExtraMutation();

  // 加快相应速度，
  useEffect(() => {
    setValueRaw(JSON.parse(extraQuery.data?.data || "null") as T || defaultValue);
  }, [extraQuery.data?.data]);

  const setValue = (newValue: T) => {
    setValueRaw(newValue);
    roomExtraMutation.mutate({ roomId, key, value: JSON.stringify(newValue) });
  };
  return [value, setValue] as const;
}
