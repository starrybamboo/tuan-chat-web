import {useMutation, useQuery, useQueryClient, useInfiniteQuery} from "@tanstack/react-query";
import type {CommunityCreateRequest} from "../models/CommunityCreateRequest";
import type {CommunityUpdateRequest} from "../models/CommunityUpdateRequest";
import type {PagePostRequest} from "../models/PagePostRequest";
import type {PostCreateRequest} from "../models/PostCreateRequest";
import {tuanchat} from "../instance";

// ==================== Community ====================
/**
 * 更新社区信息
 */
export function useUpdateCommunityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CommunityUpdateRequest) => tuanchat.community.updateCommunity(req),
        mutationKey: ['updateCommunity'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ['getCommunityInfo', variables.communityId]});
            queryClient.invalidateQueries({queryKey: ['listCommunities']});
        }
    });
}

/**
 * 获取社区信息
 * @param communityId 社区ID
 */
export function useGetCommunityInfoQuery(communityId: number) {
    return useQuery({
        queryKey: ['getCommunityInfo', communityId],
        queryFn: () => tuanchat.community.getCommunityInfo(communityId),
        staleTime: 300000, // 5分钟缓存
        enabled: communityId > 0
    });
}

/**
 * 启用社区
 */
export function useEnableCommunityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (communityId: number) => tuanchat.community.enableCommunity(communityId),
        mutationKey: ['enableCommunity'],
        onSuccess: (_, communityId) => {
            queryClient.invalidateQueries({queryKey: ['getCommunityInfo', communityId]});
            queryClient.invalidateQueries({queryKey: ['listCommunities']});
        }
    });
}

/**
 * 禁用社区
 */
export function useDisableCommunityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (communityId: number) => tuanchat.community.disableCommunity(communityId),
        mutationKey: ['disableCommunity'],
        onSuccess: (_, communityId) => {
            queryClient.invalidateQueries({queryKey: ['getCommunityInfo', communityId]});
            queryClient.invalidateQueries({queryKey: ['listCommunities']});
        }
    });
}

/**
 * 创建社区
 */
export function useCreateCommunityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CommunityCreateRequest) => tuanchat.community.createCommunity(req),
        mutationKey: ['createCommunity'],
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['listCommunities']});
        }
    });
}

/**
 * 获取社区列表
 */
export function useListCommunitiesQuery() {
    return useQuery({
        queryKey: ['listCommunities'],
        queryFn: () => tuanchat.community.listCommunities(),
        staleTime: 300000 // 5分钟缓存
    });
}

// ==================== CommunityPost ====================
/**
 * 发布帖子
 */
export function usePublishPostMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: PostCreateRequest) => tuanchat.communityPostController.publishPost(req),
        mutationKey: ['publishPost'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ['pageCommunityPosts']});
            queryClient.invalidateQueries({queryKey: ['pageUserPosts']});
        }
    });
}

/**
 * 分页获取社区帖子
 */
export function usePageCommunityPostsInfiniteQuery(requestBody: PagePostRequest) {
    return useInfiniteQuery({
        queryKey: ['pageCommunityPosts', requestBody],
        queryFn: ({pageParam}) => {
            const params = {...requestBody, cursor: pageParam};
            return tuanchat.communityPostController.pageCommunityPosts(params);
        },
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (lastPage) => {
            if (lastPage.data?.isLast) {
                return undefined;
            }
            return lastPage.data?.cursor;
        },
    });
}

export function usePageCommunityPostsQuery(requestBody: PagePostRequest) {
    return useQuery({
        queryKey: ['pageCommunityPosts', requestBody],
        queryFn: () => tuanchat.communityPostController.pageCommunityPosts(requestBody),
        staleTime: 30000, // 30秒缓存
        enabled: !!requestBody.communityId
    });
}

/**
 * 分页获取用户帖子
 */
export function usePageUserPostsQuery(requestBody: PagePostRequest) {
    return useQuery({
        queryKey: ['pageUserPosts', requestBody],
        queryFn: () => tuanchat.communityPostController.pageUserPosts(requestBody),
        staleTime: 30000, // 30秒缓存
        enabled: !!requestBody.userId
    });
}

/**
 * 获取帖子详情
 * @param postId 帖子ID
 */
export function useGetPostDetailQuery(postId: number) {
    return useQuery({
        queryKey: ['getPostDetail', postId],
        queryFn: () => tuanchat.communityPostController.getPostDetail(postId),
        staleTime: 300000, // 5分钟缓存
        enabled: postId > 0
    });
}

/**
 * 删除帖子
 */
export function useDeletePostMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: number) => tuanchat.communityPostController.deletePost(postId),
        mutationKey: ['deletePost'],
        onSuccess: (_, postId) => {
            queryClient.invalidateQueries({queryKey: ['getPostDetail', postId]});
            queryClient.invalidateQueries({queryKey: ['pageCommunityPosts']});
            queryClient.invalidateQueries({queryKey: ['pageUserPosts']});
        }
    });
}
