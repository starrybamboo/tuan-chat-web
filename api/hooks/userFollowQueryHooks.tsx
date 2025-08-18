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
      queryClient.invalidateQueries({queryKey: ['userFollowers',variables]});
      queryClient.invalidateQueries({queryKey: ['userFollowings',variables]});
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
      queryClient.invalidateQueries({queryKey: ['userFollowers',variables]});
      queryClient.invalidateQueries({queryKey: ['userFollowings',variables]});
    }
  })
}

/**
 * 获取某人关注列表
 * @param targetUserId 目标用户ID
 * @param requestBody 分页请求参数
 */
export function useGetUserFollowingsQuery(targetUserId: number, requestBody: PageBaseRequest) {
    return useQuery({
        queryKey: ['userFollowings', targetUserId, requestBody],
        queryFn: () => tuanchat.userFollowController.followings(targetUserId, requestBody),
        staleTime: 300000, // 5分钟缓存
    });
}

/**
 * 获取某人粉丝列表
 * @param targetUserId 目标用户ID
 * @param requestBody 分页请求参数
 */
export function useGetUserFollowersQuery(targetUserId: number, requestBody: PageBaseRequest) {
    return useQuery({
        queryKey: ['userFollowers', targetUserId, requestBody],
        queryFn: () => tuanchat.userFollowController.followers(targetUserId, requestBody),
        staleTime: 300000, // 5分钟缓存
    });
}

/**
 * 获取某人互相关注的好友列表
 * @param targetUserId 目标用户ID
 * @param requestBody 分页请求参数
 */
export function useGetUserFriendsQuery(targetUserId: number, requestBody: PageBaseRequest) {
  return useQuery({
    queryKey: ['userFriends', targetUserId, requestBody],
    queryFn: () => tuanchat.userFollowController.friends(requestBody),
    staleTime: 300000, // 5分钟缓存
  });
}