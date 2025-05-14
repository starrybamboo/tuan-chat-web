import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import type {CounterOperationDTO} from "../models/CounterOperationDTO";
import type {ApiResultInteger} from "../models/ApiResultInteger";
import type {ApiResultMapLongInteger} from "../models/ApiResultMapLongInteger";
import type {ApiResultMapStringInteger} from "../models/ApiResultMapStringInteger";
import type {ApiResultVoid} from "../models/ApiResultVoid";
import {tuanchat} from "../instance";

/**
 * 手动触发同步到数据库
 */
export function useSyncToDatabaseMutation() {
    return useMutation({
        mutationFn: () => tuanchat.counter.syncToDatabase(),
        mutationKey: ['syncToDatabase']
    });
}

/**
 * 设置计数
 */
export function useSetCounterMutation() {
    return useMutation({
        mutationFn: (requestBody: CounterOperationDTO) => tuanchat.counter.setCounter(requestBody),
        mutationKey: ['setCounter']
    });
}

/**
 * 增加计数
 */
export function useIncrCounterMutation() {
    return useMutation({
        mutationFn: (requestBody: CounterOperationDTO) => tuanchat.counter.incrCounter(requestBody),
        mutationKey: ['incrCounter']
    });
}

/**
 * 批量获取计数
 * @param targetType 目标类型
 * @param counterType 计数类型
 * @param requestBody 目标ID列表
 */
export function useBatchGetCounterQuery(
    targetType: number,
    counterType: string,
    requestBody: Array<number>
) {
    return useQuery({
        queryKey: ['batchGetCounter', targetType, counterType, requestBody],
        queryFn: () => tuanchat.counter.batchGetCounter(targetType, counterType, requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 获取单个计数
 * @param dto 计数操作DTO
 */
export function useGetCounterQuery(dto: CounterOperationDTO) {
    return useQuery({
        queryKey: ['getCounter', dto],
        queryFn: () => tuanchat.counter.getCounter(dto),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 获取所有计数
 * @param dto 计数操作DTO
 */
export function useGetCountersQuery(dto: CounterOperationDTO) {
    return useQuery({
        queryKey: ['getCounters', dto],
        queryFn: () => tuanchat.counter.getCounters(dto),
        staleTime: 300000 // 5分钟缓存
    });
}
