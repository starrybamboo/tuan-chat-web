import { useMutation, useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import type { MessageDirectPageRequest } from "api/models/MessageDirectPageRequest";
import type { MessageDirectResponse } from "api/models/MessageDirectResponse";
import type { MessageDirectSendRequest } from "api/models/MessageDirectSendRequest";
import { tuanchat } from "../instance";

/**
 * 私聊消息分页查询
 * @param requestBody - 分页请求体
 * 格式：
 * {
 *   cursor?: number; // 可选，分页游标
 *   pageSize?: number; // 可选，页面大小
 *   targetUserId: number; // 必填，目标用户ID
 *  }
 */
export function useGetMessageDirectPageQuery(requestBody: MessageDirectPageRequest) {
  return useQuery({
    queryKey: ["getMessageDirectPage", requestBody],
    queryFn: () => tuanchat.messageDirectController.getMessagePage(requestBody),
    refetchInterval: 3000, // 每3秒轮询一次
    refetchIntervalInBackground: false, // 只在页面活跃时轮询
    staleTime: 300000, // 5分钟缓存
  });
}

/** 
 * 查询与多个人的私聊消息
 * @param  - 
 */
export function useGetMessageDirectPageQueries(friends: { userId: number, status: number }[]) {
  return useQueries({
    queries: friends.map((friend) => ({
      queryKey: ["getMessageDirectPage", { cursor: 99, pageSize: 1, targetUserId: friend.userId }],
      queryFn: () => tuanchat.messageDirectController.getMessagePage({
        cursor: 99,
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