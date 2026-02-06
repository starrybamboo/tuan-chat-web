import { useEffect, useMemo } from "react";

import { usePrivateMessageList } from "@/components/privateChat/hooks/usePrivateMessageList";
import { useUnreadCount } from "@/components/privateChat/hooks/useUnreadCount";
import { useGetFriendRequestPageQuery } from "api/hooks/friendQueryHooks";

type UseChatUnreadIndicatorsParams = {
  globalContext: any;
  userId: number;
  isPrivateChatMode: boolean;
  activeRoomId: number | null;
  urlRoomId?: string;
};

type UseChatUnreadIndicatorsResult = {
  unreadMessagesNumber: Record<number, number>;
  privateEntryBadgeCount: number;
};

export default function useChatUnreadIndicators({
  globalContext,
  userId,
  isPrivateChatMode,
  activeRoomId,
  urlRoomId,
}: UseChatUnreadIndicatorsParams): UseChatUnreadIndicatorsResult {
  const privateMessageList = usePrivateMessageList({ globalContext, userId });
  const { unreadMessageNumbers: privateUnreadMessageNumbers } = useUnreadCount({
    realTimeContacts: privateMessageList.realTimeContacts,
    sortedRealTimeMessages: privateMessageList.sortedRealTimeMessages,
    userId,
    urlRoomId: isPrivateChatMode ? urlRoomId : undefined,
  });
  const privateTotalUnreadMessages = useMemo(() => {
    return privateMessageList.realTimeContacts.reduce((sum, contactId) => {
      if (isPrivateChatMode && activeRoomId === contactId) {
        return sum;
      }
      return sum + (privateUnreadMessageNumbers[contactId] ?? 0);
    }, 0);
  }, [activeRoomId, isPrivateChatMode, privateMessageList.realTimeContacts, privateUnreadMessageNumbers]);

  const friendRequestPageQuery = useGetFriendRequestPageQuery({ pageNo: 1, pageSize: 50 });
  const pendingFriendRequestCount = useMemo(() => {
    const list = friendRequestPageQuery.data?.data?.list ?? [];
    if (!Array.isArray(list))
      return 0;
    return list.filter((r: any) => r?.type === "received" && r?.status === 1).length;
  }, [friendRequestPageQuery.data?.data?.list]);

  const privateEntryBadgeCount = useMemo(() => {
    return privateTotalUnreadMessages + pendingFriendRequestCount;
  }, [pendingFriendRequestCount, privateTotalUnreadMessages]);

  const websocketUtils = globalContext.websocketUtils;
  const unreadMessagesNumber = useMemo(() => {
    return (websocketUtils?.unreadMessagesNumber ?? {}) as Record<number, number>;
  }, [websocketUtils?.unreadMessagesNumber]);
  const totalUnreadMessages = useMemo(() => {
    const values = Object.values(unreadMessagesNumber) as number[];
    return values.reduce((sum, count) => sum + count, 0);
  }, [unreadMessagesNumber]);
  useEffect(() => {
    const originalTitle = document.title.replace(/^\(\d+\)\s*/, "");
    if (totalUnreadMessages > 0) {
      document.title = `(${totalUnreadMessages}) ${originalTitle}`;
      return () => {
        document.title = originalTitle;
      };
    }
    document.title = originalTitle;
    return () => {
      document.title = originalTitle;
    };
  }, [totalUnreadMessages]);

  return {
    unreadMessagesNumber,
    privateEntryBadgeCount,
  };
}
