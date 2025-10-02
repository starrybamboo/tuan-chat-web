import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import type {RatingPageRequest} from "../models/RatingPageRequest";
import type {RatingRequest} from "../models/RatingRequest";
import {tuanchat} from "../instance";

/**
 * 分页获取目标评分列表
 * @param requestBody 分页请求参数
 */
export function useGetTargetRatingsByPageQuery(requestBody: RatingPageRequest) {
    return useQuery({
        queryKey: ['getTargetRatingsByPage', requestBody],
        queryFn: () => tuanchat.rating.getTargetRatingsByPage(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 提交评分
 */
export function useSubmitRatingMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RatingRequest) => tuanchat.rating.submitRating(req),
        mutationKey: ['submitRating'],
        onSuccess: (_, variables) => {
            // 提交评分成功后，使相关查询失效
            queryClient.invalidateQueries({
                queryKey: ['getTargetRatingsByPage', {
                    targetId: variables.targetId,
                    targetType: variables.targetType
                }]
            });
            queryClient.invalidateQueries({
                queryKey: ['getUserRating', {
                    targetId: variables.targetId,
                    targetType: variables.targetType
                }]
            });
            queryClient.invalidateQueries({
                queryKey: ['getAverageScore', {
                    targetId: variables.targetId,
                    targetType: variables.targetType
                }]
            });
        }
    });
}

/**
 * 获取用户评分
 * @param userId 用户ID，不传则获取当前登录用户的评分
 * @param targetId 目标ID
 * @param targetType ContentTypeEnums
 */
export function useGetUserRatingQuery(
    userId: number | undefined,
    targetId: number,
    targetType: string
) {
    return useQuery({
        queryKey: ['getUserRating', { userId, targetId, targetType }],
        queryFn: () => tuanchat.rating.getUserRating(
            userId ?? 0, // 传0表示获取当前用户
            targetId,
            targetType
        ),
        staleTime: 300000, // 5分钟缓存
        enabled: !!targetId && !!targetType
    });
}

/**
 * 计算评分消耗
 * @param score 评分值(-2~15)
 */
export function useCalculateCostQuery(score: string) {
    return useQuery({
        queryKey: ['calculateCost', score],
        queryFn: () => tuanchat.rating.calculateCost(score),
        staleTime: 300000, // 5分钟缓存
        enabled: !!score
    });
}

/**
 * 获取目标平均评分
 * @param targetId 目标ID
 * @param targetType ContentTypeEnums
 */
export function useGetAverageScoreQuery(targetId: number, targetType: string) {
    return useQuery({
        queryKey: ['getAverageScore', { targetId, targetType }],
        queryFn: () => tuanchat.rating.getAverageScore(targetId, targetType),
        staleTime: 300000, // 5分钟缓存
        enabled: !!targetId && !!targetType
    });
}
