import { useEffect, useMemo, useRef } from "react";

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
  const unreadMessagesNumber = websocketUtils.unreadMessagesNumber;
  const totalUnreadMessages = useMemo(() => {
    return Object.values(unreadMessagesNumber).reduce((sum, count) => sum + count, 0);
  }, [unreadMessagesNumber]);
  const unreadDebugEnabled = typeof window !== "undefined" && localStorage.getItem("tc:unread:debug") === "1";
  const unreadDebugSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (!unreadDebugEnabled) {
      unreadDebugSnapshotRef.current = null;
      return;
    }

    const path = `${window.location.pathname}${window.location.search}`;
    const groupDetails = Object.entries(unreadMessagesNumber)
      .map(([roomId, unread]) => ({
        roomId: Number(roomId),
        unread: unread ?? 0,
      }))
      .sort((a, b) => a.roomId - b.roomId);
    const privateDetails = privateMessageList.realTimeContacts
      .map(contactId => ({
        contactId,
        unread: privateUnreadMessageNumbers[contactId] ?? 0,
        isActive: isPrivateChatMode && activeRoomId === contactId,
      }))
      .sort((a, b) => a.contactId - b.contactId);

    const snapshot = {
      path,
      isPrivateChatMode,
      activeRoomId,
      totalUnreadMessages,
      privateTotalUnreadMessages,
      pendingFriendRequestCount,
      privateEntryBadgeCount,
      groupUnreadTotal: totalUnreadMessages,
      groupDetails,
      privateDetails,
    };
    const nextSnapshot = JSON.stringify(snapshot);
    if (unreadDebugSnapshotRef.current === nextSnapshot) {
      return;
    }
    unreadDebugSnapshotRef.current = nextSnapshot;
    console.warn(`[tc:unread] ${path}`, snapshot);
  }, [
    activeRoomId,
    isPrivateChatMode,
    pendingFriendRequestCount,
    privateEntryBadgeCount,
    privateMessageList.realTimeContacts,
    privateTotalUnreadMessages,
    privateUnreadMessageNumbers,
    totalUnreadMessages,
    unreadDebugEnabled,
    unreadMessagesNumber,
  ]);

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
