import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import type {BatchLikeRecordRequest} from "../models/BatchLikeRecordRequest";
import type {LikeRecordRequest} from "../models/LikeRecordRequest";
import type {PageBaseRequest} from "../models/PageBaseRequest";
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
            queryClient.invalidateQueries({queryKey: ['batchIsLiked']});
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
            queryClient.invalidateQueries({queryKey: ['batchIsLiked']});
        }
    });
}

/**
 * 获取用户点赞的内容分页
 * @param requestBody 分页请求参数
 */
export function useGetUserLikedPageQuery(requestBody: PageBaseRequest) {
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
export function useBatchIsLikedQuery(requestBody: BatchLikeRecordRequest) {
    return useQuery({
        queryKey: ['batchIsLiked', requestBody],
        queryFn: () => tuanchat.likeRecordController.batchIsLiked(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}
