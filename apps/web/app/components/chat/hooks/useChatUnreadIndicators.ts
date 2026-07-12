import { useEffect, useMemo } from "react";

import type { WebsocketUtils } from "api/useWebSocket";

import { usePrivateMessageList } from "@/components/privateChat/hooks/usePrivateMessageList";
import { useUnreadCount } from "@/components/privateChat/hooks/useUnreadCount";
import { useGetFriendRequestPageQuery } from "api/hooks/friendQueryHooks";
import { useGetDirectBadgeSummaryQuery } from "api/hooks/MessageDirectQueryHooks";
import { getPrivateEntryBadgeLoadMode, resolvePrivateEntryBadgeCount } from "./chatUnreadIndicatorMode";

type UseChatUnreadIndicatorsParams = {
  webSocketUtils: WebsocketUtils;
  userId: number;
  isPrivateChatMode: boolean;
  activeRoomId: number | null;
  urlRoomId?: string;
  enablePrivateEntryBadge?: boolean;
};

type UseChatUnreadIndicatorsResult = {
  unreadMessagesNumber: Record<number, number>;
  privateEntryBadgeCount: number;
};

export default function useChatUnreadIndicators({
  webSocketUtils,
  userId,
  isPrivateChatMode,
  activeRoomId,
  urlRoomId,
  enablePrivateEntryBadge = true,
}: UseChatUnreadIndicatorsParams): UseChatUnreadIndicatorsResult {
  const badgeLoadMode = getPrivateEntryBadgeLoadMode(enablePrivateEntryBadge, isPrivateChatMode);
  const privateMessageList = usePrivateMessageList({
    userId,
    includeFriendList: false,
    enabled: badgeLoadMode.loadFullPrivateData,
  });
  const { unreadMessageNumbers: privateUnreadMessageNumbers } = useUnreadCount({
    realTimeContacts: privateMessageList.realTimeContacts,
    sortedRealTimeMessages: privateMessageList.sortedRealTimeMessages,
    userId,
    urlRoomId: isPrivateChatMode ? urlRoomId : undefined,
    isInboxReady: privateMessageList.isInboxReady,
  });
  const privateTotalUnreadMessages = useMemo(() => {
    return privateMessageList.realTimeContacts.reduce((sum, contactId) => {
      if (isPrivateChatMode && activeRoomId === contactId) {
        return sum;
      }
      return sum + (privateUnreadMessageNumbers[contactId] ?? 0);
    }, 0);
  }, [activeRoomId, isPrivateChatMode, privateMessageList.realTimeContacts, privateUnreadMessageNumbers]);

  const friendRequestPageQuery = useGetFriendRequestPageQuery({ pageNo: 1, pageSize: 50 }, badgeLoadMode.loadFullPrivateData);
  const pendingFriendRequestCount = useMemo(() => {
    const list = friendRequestPageQuery.data?.data?.list ?? [];
    if (!Array.isArray(list))
      return 0;
    return list.filter((r: any) => r?.type === "received" && r?.status === 1).length;
  }, [friendRequestPageQuery.data?.data?.list]);

  const badgeSummaryQuery = useGetDirectBadgeSummaryQuery(badgeLoadMode.loadSummary, userId);
  const privateEntryBadgeCount = useMemo(() => {
    return resolvePrivateEntryBadgeCount({
      isPrivateChatMode,
      privateUnreadCount: privateTotalUnreadMessages,
      pendingFriendRequestCount,
      summaryDirectUnreadCount: badgeSummaryQuery.data?.directUnreadCount ?? 0,
      summaryPendingFriendRequestCount: badgeSummaryQuery.data?.pendingFriendRequestCount ?? 0,
    });
  }, [badgeSummaryQuery.data, isPrivateChatMode, pendingFriendRequestCount, privateTotalUnreadMessages]);

  const unreadMessagesNumber = useMemo(() => {
    return (webSocketUtils?.unreadMessagesNumber ?? {}) as Record<number, number>;
  }, [webSocketUtils?.unreadMessagesNumber]);
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
