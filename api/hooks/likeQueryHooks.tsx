import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BatchMarkStatusRequest } from "../models/BatchMarkStatusRequest";
import type { MarkCountRequest } from "../models/MarkCountRequest";
import type { MarkRecordRequest } from "../models/MarkRecordRequest";
import type { MarkTarget } from "../models/MarkTarget";
import { tuanchat } from "../instance";

const LIKE_MARK_TYPE = "like";

export type LikeRecordRequest = MarkTarget;

export interface LikeCountRequest {
  targetIds: number[];
  targetType: string;
}

export interface BatchLikeRecordRequest {
  targets: MarkTarget[];
}

function buildLikeMarkRequest(request: LikeRecordRequest): MarkRecordRequest {
  return {
    targetId: request.targetId,
    targetType: request.targetType,
    markType: LIKE_MARK_TYPE as MarkRecordRequest.markType,
  };
}

function buildLikeCountRequest(request: LikeCountRequest): MarkCountRequest {
  return {
    targetIds: request.targetIds,
    targetType: request.targetType,
    markType: LIKE_MARK_TYPE as MarkCountRequest.markType,
  };
}

/**
 * 查询是否点赞过
 * @param request 点赞记录请求
 */
export function useIsLikedQuery(request: LikeRecordRequest) {
  return useQuery({
    queryKey: ["isLiked", request],
    queryFn: () => tuanchat.markController.isMarked(request.targetId, request.targetType, LIKE_MARK_TYPE),
    staleTime: 300000, // 5分钟缓存
    enabled: request.targetId > 0 && !!request.targetType,
  });
}

/**
 * 获取点赞数量
 * @param request 点赞记录请求
 */
export function useGetLikeCountQuery(request: LikeRecordRequest) {
  return useQuery({
    queryKey: ["getLikeCount", request],
    queryFn: () => tuanchat.markController.getMarkCount(request.targetId, request.targetType, LIKE_MARK_TYPE),
    staleTime: 300000, // 5分钟缓存
    enabled: request.targetId > 0 && !!request.targetType,
  });
}

/**
 * 批量获取点赞数量
 * @param requestBody 批量查询请求
 */
function useBatchGetLikeCountQuery(requestBody: LikeCountRequest) {
  return useQuery({
    queryKey: ["batchGetLikeCount", requestBody],
    queryFn: () => tuanchat.markController.batchGetMarkCount(buildLikeCountRequest(requestBody)),
    staleTime: 300000, // 5分钟缓存
  });
}

/**
 * 点赞操作
 */
export function useLikeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestBody: LikeRecordRequest) => tuanchat.markController.mark(buildLikeMarkRequest(requestBody)),
    mutationKey: ["like"],
    onSuccess: (_, variables) => {
      // 使相关查询失效
      queryClient.invalidateQueries({ queryKey: ["isLiked", variables] });
      queryClient.invalidateQueries({ queryKey: ["getLikeCount", variables] });
      queryClient.invalidateQueries({ queryKey: ["batchIsLiked"] });
      queryClient.invalidateQueries({ queryKey: ["batchGetLikeCount"] });
    },
  });
}

/**
 * 取消点赞操作
 */
export function useUnlikeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestBody: LikeRecordRequest) => tuanchat.markController.unmark(buildLikeMarkRequest(requestBody)),
    mutationKey: ["unlike"],
    onSuccess: (_, variables) => {
      // 使相关查询失效
      queryClient.invalidateQueries({ queryKey: ["isLiked", variables] });
      queryClient.invalidateQueries({ queryKey: ["getLikeCount", variables] });
      queryClient.invalidateQueries({ queryKey: ["batchIsLiked"] });
      queryClient.invalidateQueries({ queryKey: ["batchGetLikeCount"] });
    },
  });
}

/**
 * 批量查询是否点赞过
 * @param requestBody 批量查询请求
 */
function useBatchIsLikedQuery(requestBody: BatchLikeRecordRequest) {
  return useQuery({
    queryKey: ["batchIsLiked", requestBody],
    queryFn: () =>
      tuanchat.markController.batchIsMarked({
        markType: LIKE_MARK_TYPE as BatchMarkStatusRequest.markType,
        targets: requestBody.targets,
      }),
    staleTime: 300000, // 5分钟缓存
  });
}
