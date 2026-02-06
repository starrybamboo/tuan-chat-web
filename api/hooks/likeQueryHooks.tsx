import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import type {BatchLikeRecordRequest} from "../models/BatchLikeRecordRequest";
import type {LikeRecordRequest} from "../models/LikeRecordRequest";
import type {PageBaseRequest} from "../models/PageBaseRequest";
import type {LikeCountRequest} from "../models/LikeCountRequest";
import {tuanchat} from "../instance";

/**
 * 查询是否点赞过
 * @param request 点赞记录请求
 */
export function useIsLikedQuery(request: LikeRecordRequest) {
    return useQuery({
        queryKey: ['isLiked', request],
        queryFn: () => tuanchat.likeRecordController.isLiked(request.targetId,request.targetType),
        staleTime: 300000, // 5分钟缓存
        enabled: !!request.targetId && !!request.targetType
    });
}

/**
 * 获取点赞数量
 * @param request 点赞记录请求
 */
export function useGetLikeCountQuery(request: LikeRecordRequest) {
    return useQuery({
        queryKey: ['getLikeCount', request],
        queryFn: () => tuanchat.likeRecordController.getLikeCount(request.targetId, request.targetType),
        staleTime: 300000, // 5分钟缓存
        enabled: !!request.targetId && !!request.targetType
    });
}

/**
 * 批量获取点赞数量
 * @param requestBody 批量查询请求
 */
function useBatchGetLikeCountQuery(requestBody: LikeCountRequest) {
    return useQuery({
        queryKey: ['batchGetLikeCount', requestBody],
        queryFn: () => tuanchat.likeRecordController.batchGetLikeCount(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 点赞操作
 */
export function useLikeMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (requestBody: LikeRecordRequest) => tuanchat.likeRecordController.like(requestBody),
        mutationKey: ['like'],
        onSuccess: (_, variables) => {
            // 使相关查询失效
            queryClient.invalidateQueries({queryKey: ['isLiked', variables]});
            queryClient.invalidateQueries({queryKey: ['getLikeCount', variables]});
            queryClient.invalidateQueries({queryKey: ['batchIsLiked']});
            queryClient.invalidateQueries({queryKey: ['batchGetLikeCount']});
        }
    });
}

/**
 * 取消点赞操作
 */
export function useUnlikeMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (requestBody: LikeRecordRequest) => tuanchat.likeRecordController.unlike(requestBody),
        mutationKey: ['unlike'],
        onSuccess: (_, variables) => {
            // 使相关查询失效
            queryClient.invalidateQueries({queryKey: ['isLiked', variables]});
            queryClient.invalidateQueries({queryKey: ['getLikeCount', variables]});
            queryClient.invalidateQueries({queryKey: ['batchIsLiked']});
            queryClient.invalidateQueries({queryKey: ['batchGetLikeCount']});
        }
    });
}

/**
 * 获取用户点赞的内容分页
 * @param requestBody 分页请求参数
 */
function useGetUserLikedPageQuery(requestBody: PageBaseRequest) {
    return useQuery({
        queryKey: ['getUserLikedPage', requestBody],
        queryFn: () => tuanchat.likeRecordController.getUserLikedPage(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 批量查询是否点赞过
 * @param requestBody 批量查询请求
 */
function useBatchIsLikedQuery(requestBody: BatchLikeRecordRequest) {
    return useQuery({
        queryKey: ['batchIsLiked', requestBody],
        queryFn: () => tuanchat.likeRecordController.batchIsLiked(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

