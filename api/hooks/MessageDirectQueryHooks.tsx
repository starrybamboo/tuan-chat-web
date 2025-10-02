import { useMutation, useQuery, useQueries, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { MessageDirectPageRequest, MessageDirectReadUpdateRequest, MessageDirectRecallRequest, MessageDirectSendRequest } from "api";
import { tuanchat } from "../instance";
import { useMemo } from "react";


/**
 * 私聊消息无限分页查询
 */
export function useGetMessageDirectPageQuery(targetUserId: number, pageSize: number) {
  const initialPageParam: MessageDirectPageRequest = {
    cursor: undefined,
    pageSize,
    targetUserId
  }
  const infiniteQuery = useInfiniteQuery({
    queryKey: ["directMessages", targetUserId],
    queryFn: async ({ pageParam }) => {
      return tuanchat.messageDirectController.getMessagePage(pageParam);
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.data?.isLast && lastPage.data?.cursor) {
        const nextQueryParam: MessageDirectPageRequest = {
          cursor: lastPage.data.cursor,
          pageSize,
          targetUserId,
        }
        return nextQueryParam;
      }
      return undefined;
    },
    initialPageParam,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const isLastPage = useMemo(() => {
    const pages = infiniteQuery.data?.pages;
    if (!pages || pages.length === 0) return true;
    const lastPage = pages[pages.length - 1];
    return lastPage.data?.isLast === true;
  }, [infiniteQuery.data?.pages]);

  const historyMessages = useMemo(() => {
    const pages = infiniteQuery.data?.pages;
    if (!pages) return [];
    return [...pages].reverse().flatMap(p => p.data?.list ?? []);
  }, [infiniteQuery.data?.pages]);

  return {
    historyMessages,
    isLoading: infiniteQuery.isLoading,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    refetch: infiniteQuery.refetch,
    isLastPage
  }
}

/**
 * 获取收件箱消息全量数据
 */
export function useGetInboxMessagePageQuery() {
  return useQuery({
    queryKey: ["getInboxMessagePage"],
    queryFn: () => tuanchat.messageDirectController.getInboxMessages("ANY_STRING"),
    staleTime: 300000
  });
}

/**
 * 获取与某个联系人的收件箱消息
 */
export function useGetInboxMessageWithUserQuery(userId: number, targetUserId: number) {
  const getInboxMessageWithUser = useQuery({
    queryKey: ["inboxMessageWithUser", userId, targetUserId],
    queryFn: async () => {
      const res = await tuanchat.messageDirectController.getInboxMessages("ANY_STRING");
      return res.data;
    },
    staleTime: 300000
  });
  const historyMessages = useMemo(() => {
    return getInboxMessageWithUser.data?.filter((msg) => {
      return (
        msg.senderId === userId && msg.receiverId === targetUserId ||
        msg.senderId === targetUserId && msg.receiverId === userId
      );
    }) || [];
  }, [getInboxMessageWithUser.data, userId, targetUserId]);
  const queryClient = useQueryClient();
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["inboxMessageWithUser", userId, targetUserId] });
    getInboxMessageWithUser.refetch();
  }

  return { historyMessages, refetch };
}

/**
 * 发送私聊消息
 */
export function useSendMessageDirectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestBody: MessageDirectSendRequest) => tuanchat.messageDirectController.sendMessage(requestBody),
    mutationKey: ["sendMessageDirect"],
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["getMessageDirectPage"] });
      queryClient.invalidateQueries({ queryKey: ["getInboxMessagePage"] });
    },
  });
}

/**
 * 撤回私聊消息
 */
export function useRecallMessageDirectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: MessageDirectRecallRequest) => tuanchat.messageDirectController.recallMessage(messageId),
    mutationKey: ["recallMessageDirect"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getMessageDirectPage"] });
      queryClient.invalidateQueries({ queryKey: ["getInboxMessagePage"] });
    },
  });
}

/**
 * 更新私聊线消息
 */
export function useUpdateReadPositionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestBody: MessageDirectReadUpdateRequest) => tuanchat.messageDirectController.updateReadPosition(requestBody),
    mutationKey: ["updateReadPosition"],
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["getInboxMessagePage"] });
      queryClient.invalidateQueries({ queryKey: ["directMessages", variables.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["getMessageDirectPage"] });
    }
  });
}

/**
 * 获取所有好友的用户信息
 */
export function useGetFriendsUserInfoQuery(friends: (number | undefined)[]) {
  return useQueries({
    queries: friends.map(friendId => ({
      queryKey: ['getAllMyFriendsInfo', friendId],
      queryFn: () => tuanchat.userController.getUserInfo(friendId || -1),
      staleTime: 300000, 
    }))
  });
}