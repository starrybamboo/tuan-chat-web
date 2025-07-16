import { useMutation, useQuery, useQueries, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { MessageDirectPageRequest } from "api/models/MessageDirectPageRequest";
import type { MessageDirectResponse } from "api/models/MessageDirectResponse";
import type { MessageDirectSendRequest } from "api/models/MessageDirectSendRequest";
import { tuanchat } from "../instance";


/**
 * 私聊消息无限分页查询，只会调用一次
 */
export function useGetMessageDirectPageQuery(targetUserId: number, pageSize: number) {
  const initialPageParam: MessageDirectPageRequest = {
    cursor: undefined,
    pageSize,
    targetUserId
  }

  // 创建这样的层次结构：
  // directMessages
  //   └── 10008 (targetUserId)
  //   └── 10013 (targetUserId)
  //   └── 15043 (targetUserId)
  const infiniteQuery = useInfiniteQuery({
    queryKey: ["directMessages", targetUserId],
    queryFn: async ({ pageParam }) => {
      return tuanchat.messageDirectController.getMessagePage(pageParam);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data?.isLast === false && lastPage.data?.cursor) {
        const nextQueryParam: MessageDirectPageRequest = {
          cursor: lastPage.data.cursor,
          pageSize,
          targetUserId,
        }
        return nextQueryParam;
      }
      return undefined;
    },
    initialPageParam, // 初始请求参数
    refetchOnWindowFocus: false, // 窗口重新聚焦时不会自动获取数据
    staleTime: Infinity,  // 永不过期，使过了很长时间，也不会因为数据过期而自动重新查询
  });

  return {
    historyMessages: infiniteQuery.data?.pages.reverse().flatMap(p => p.data?.list ?? []) ?? [],
    isLoading: infiniteQuery.isLoading,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    refetch: infiniteQuery.refetch,
  }
}


/** 
 * 查询与多个人的私聊消息
 * @param friends - 好友列表，包含 userId 和 status
 */
export function useGetMessageDirectPageQueries(friends: { userId: number, status: number }[]) {
  return useQueries({
    queries: friends.map((friend) => ({
      queryKey: ["getMessageDirectPage", { cursor: undefined, pageSize: 1, targetUserId: friend.userId }],
      queryFn: () => tuanchat.messageDirectController.getMessagePage({
        cursor: undefined,
        pageSize: 1,
        targetUserId: friend.userId
      }),
      refetchInterval: 10000, // 每10秒轮询一次
      refetchIntervalInBackground: false, // 只在页面活跃时轮询
      staleTime: 300000, // 5分钟缓存
    })),
  });
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
      // 刷新对应的私聊消息列表
      queryClient.invalidateQueries({ queryKey: ["getMessageDirectPage"] });
      // 刷新收件箱消息列表
      queryClient.invalidateQueries({ queryKey: ["getInboxMessagePage"] });
    },
  });
}

/**
 * 撤回私聊消息
 */
// export function useRecallMessageDirectMutation() {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: (messageId: number) => tuanchat.messageDirectController.recallMessage(messageId),
//     mutationKey: ["recallMessageDirect"],
//     onSuccess: () => {
//       // 刷新私聊消息列表
//       queryClient.invalidateQueries({ queryKey: ["getMessageDirectPage"] });
//       // 刷新收件箱消息列表
//       queryClient.invalidateQueries({ queryKey: ["getInboxMessagePage"] });
//     },
//   });
// }


/**
 * 获取收件箱消息分页查询（普通查询）
 * @param requestBody - 分页请求体
 * 格式：
 * {
 *   cursor?: number; // 可选，分页游标
 *   pageSize?: number; // 可选，页面大小
 *  }
 */
// export function useGetInboxMessagePageQuery(requestBody: CursorPageBaseRequest) {
//   return useQuery({
//     queryKey: ["getInboxMessagePage", requestBody],
//     queryFn: () => tuanchat.messageDirectController.getInboxMessagePage(requestBody),
//     staleTime: 300000 // 5分钟缓存
//   });
// }