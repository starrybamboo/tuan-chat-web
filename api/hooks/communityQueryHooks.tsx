import {useMutation, useQuery, useQueryClient, useInfiniteQuery} from "@tanstack/react-query";
import type {CommunityCreateRequest} from "../models/CommunityCreateRequest";
import type {CommunityUpdateRequest} from "../models/CommunityUpdateRequest";
import type {PagePostRequest} from "../models/PagePostRequest";
import type {PostCreateRequest} from "../models/PostCreateRequest";
import type {PostUpdateRequest} from "../models/PostUpdateRequest";
import type {CommunityMemberRequest} from "../models/CommunityMemberRequest";
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
 * 更新帖子
 */
export function useUpdatePostMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: PostUpdateRequest) => tuanchat.communityPost.updatePost(req),
        mutationKey: ['updatePost'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ['getPostDetail', variables.communityPostId]});
            queryClient.invalidateQueries({queryKey: ['listCommunityPosts', variables.communityPostId]});
            queryClient.invalidateQueries({queryKey: ['pageCommunityPosts']});
            queryClient.invalidateQueries({queryKey: ['listUserPosts']});
        }
    });
}

/**
 * 发布帖子
 */
export function usePublishPostMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: PostCreateRequest) => tuanchat.communityPost.publishPost(req),
        mutationKey: ['publishPost'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ['listCommunityPosts', variables.communityId]});
            queryClient.invalidateQueries({queryKey: ['pageCommunityPosts']});
            queryClient.invalidateQueries({queryKey: ['listUserPosts']});
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
            const params = {...requestBody, pageNo: pageParam};
            return tuanchat.communityPost.pageCommunityPosts(params);
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.data?.isLast) {
                return allPages.length + 1;
            }
            return undefined;
        },
        staleTime: 30000 // 30秒缓存
    });
}

/**
 * 获取社区帖子列表
 * @param communityId 社区ID
 */
export function useListCommunityPostsQuery(communityId: number) {
    return useQuery({
        queryKey: ['listCommunityPosts', communityId],
        queryFn: () => tuanchat.communityPost.listCommunityPosts(communityId),
        staleTime: 300000, // 5分钟缓存
        enabled: communityId > 0
    });
}

/**
 * 获取帖子详情
 * @param postId 帖子ID
 */
export function useGetPostDetailQuery(postId: number) {
    return useQuery({
        queryKey: ['getPostDetail', postId],
        queryFn: () => tuanchat.communityPost.getPostDetail(postId),
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
        mutationFn: (postId: number) => tuanchat.communityPost.deletePost(postId),
        mutationKey: ['deletePost'],
        onSuccess: (_, postId) => {
            queryClient.invalidateQueries({queryKey: ['getPostDetail', postId]});
            queryClient.invalidateQueries({queryKey: ['listCommunityPosts']});
            queryClient.invalidateQueries({queryKey: ['pageCommunityPosts']});
            queryClient.invalidateQueries({queryKey: ['listUserPosts']});
        }
    });
}

/**
 * 获取用户发布的帖子
 */
export function useListUserPostsQuery() {
    return useQuery({
        queryKey: ['listUserPosts'],
        queryFn: () => tuanchat.communityPost.listUserPosts(),
        staleTime: 300000 // 5分钟缓存
    });
}

// ==================== CommunityMember ====================
/**
 * 恢复社区成员状态
 */
export function useRestoreMemberStatusMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CommunityMemberRequest) => tuanchat.communityMember.restoreMemberStatus(req),
        mutationKey: ['restoreMemberStatus'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ['listMembers', variables.communityId]});
        }
    });
}

/**
 * 禁言社区成员
 */
export function useMuteMemberMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CommunityMemberRequest) => tuanchat.communityMember.muteMember(req),
        mutationKey: ['muteMember'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ['listMembers', variables.communityId]});
        }
    });
}

/**
 * 获取社区成员列表
 * @param communityId 社区ID
 */
export function useListMembersQuery(communityId: number) {
    return useQuery({
        queryKey: ['listMembers', communityId],
        queryFn: () => tuanchat.communityMember.listMembers(communityId),
        staleTime: 300000, // 5分钟缓存
        enabled: communityId > 0
    });
}

/**
 * 踢出社区成员
 */
export function useKickOutMemberMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CommunityMemberRequest) => tuanchat.communityMember.kickOutMember(req),
        mutationKey: ['kickOutMember'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ['listMembers', variables.communityId]});
            queryClient.invalidateQueries({queryKey: ['listUserCommunities']});
        }
    });
}

/**
 * 加入社区
 */
export function useJoinCommunityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (communityId: number) => tuanchat.communityMember.joinCommunity(communityId),
        mutationKey: ['joinCommunity'],
        onSuccess: (_, communityId) => {
            queryClient.invalidateQueries({queryKey: ['listMembers', communityId]});
            queryClient.invalidateQueries({queryKey: ['listUserCommunities']});
            queryClient.invalidateQueries({queryKey: ['checkMembership']});
        }
    });
}

/**
 * 检查用户是否为社区成员
 */
export function useCheckMembershipQuery(requestBody: CommunityMemberRequest) {
    return useQuery({
        queryKey: ['checkMembership', requestBody],
        queryFn: () => tuanchat.communityMember.checkMembership(requestBody),
        staleTime: 300000, // 5分钟缓存
        enabled: !!requestBody.communityId && !!requestBody.userId
    });
}

/**
 * 获取用户所属社区ID列表
 */
export function useListUserCommunitiesQuery() {
    return useQuery({
        queryKey: ['listUserCommunities'],
        queryFn: () => tuanchat.communityMember.listUserCommunities(),
        staleTime: 300000 // 5分钟缓存
    });
}
