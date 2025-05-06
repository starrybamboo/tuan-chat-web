import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {tuanchat} from "../instance";
import type { PageBaseRequest } from '../models/PageBaseRequest';

/**
 * 判断是否关注了某个用户
 * @param targetUserId 目标用户ID
 */

export const useUserIsFollowedQuery = (targetUserId: number) => {
  return useQuery({
    queryKey: ['userIsFollowed', targetUserId],
    queryFn: () => tuanchat.userFollowController.isFollow(targetUserId),
    staleTime: 300000, // 5分钟缓存
  })
}

/**
 * 关注用户
 * @param targetUserId 目标用户ID
 */

export function useUserFollowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) => tuanchat.userFollowController.follow(targetUserId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({queryKey: ['userIsFollowed',variables]});
    }
  });
}

/**
 * 取消关注用户
 * @param targetUserId 目标用户ID
 */

export function useUserUnfollowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) => tuanchat.userFollowController.unfollow(targetUserId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({queryKey: ['userIsFollowed',variables]});
    }
  })
}

/**
 * 获取某人关注列表
 * @param targetUserId 目标用户ID
 * @param requestBody 分页请求参数
 */
export function useGetUserFollowingsMutation() {
    return useMutation({
        mutationFn: (params: { targetUserId: number; requestBody: PageBaseRequest }) => 
            tuanchat.userFollowController.followings(params.targetUserId, params.requestBody)
    })
}

/**
 * 获取某人粉丝列表
 * @param targetUserId 目标用户ID
 * @param requestBody 分页请求参数
 */
export function useGetUserFollowersMutation() {
    return useMutation({
        mutationFn: (params: { targetUserId: number; requestBody: PageBaseRequest }) => 
            tuanchat.userFollowController.followers(params.targetUserId, params.requestBody)
    })
}