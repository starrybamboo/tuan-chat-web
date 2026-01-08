import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserPreferenceRequest } from "../models/UserPreferenceRequest";
import { tuanchat } from "../instance";

// 删除Hooks我觉得未来有注销系统可能才用得上，暂时没写
/**
 * 用户偏好 (GNS) 请求
 */
export function useGetGNSQuery(userId: number) {
    return useQuery({
        queryKey: ["getUserPreference", userId],
        queryFn: () => tuanchat.userPreference.getUserPreference(userId),
        // Cache longer: preferences rarely change and are user-scoped.
        // React Query v5 uses `gcTime` (was `cacheTime` in v4).
        staleTime: 10 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        enabled: !!userId, // 确保userId存在时才启用查询
    });
}

/**
 * 更新用户偏好 (GNS) 请求
 */
export function useUpdateGNSMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, ...req }: UserPreferenceRequest & { userId: number }) =>
            tuanchat.userPreference.updateUserPreference(req),
        mutationKey: ["updateUserPreference"],
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["getUserPreference", variables.userId]
            });
        },
    });
}

/**
 * 创建用户偏好 (GNS) 请求
 */
export function useCreateGNSMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, ...req }: UserPreferenceRequest & { userId: number }) =>
            tuanchat.userPreference.createUserPreference(req),
        mutationKey: ["createUserPreference"],
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["getUserPreference", variables.userId]
            });
        },
    });
}

/**
 * 创建或更新用户偏好的组合 hook
 */
export function useUpsertGNSMutation() {
    const updateMutation = useUpdateGNSMutation();
    const createMutation = useCreateGNSMutation();
    return {
        mutateAsync: async (data: UserPreferenceRequest & { userId: number, isCreate?: boolean }) => {
            if (data.isCreate) {
                return createMutation.mutateAsync(data);
            } else {
                return updateMutation.mutateAsync(data);
            }
        },
        isPending: updateMutation.isPending || createMutation.isPending,
        error: updateMutation.error || createMutation.error,
    };
}