import { RoomContext } from "@/components/chat/roomContext";
import { use } from "react";
import { useGetMessageByIdQuery } from "../../../api/hooks/chatQueryHooks";

/**
 * 智能的获取消息，优先从缓存中获取，如果没有则从服务器获取。
 * @param messageId
 */
export function useGetMessageByIdSmartly(messageId: number) {
  const roomContext = use(RoomContext);

  // 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用
  const foundMessageInHistory
    = roomContext.historyMessages?.find(item => item.message.messageID === messageId)?.message;
  const messageQuery = useGetMessageByIdQuery(
    foundMessageInHistory ? -1 : messageId,
  );
  return foundMessageInHistory || messageQuery.data?.message;
}
