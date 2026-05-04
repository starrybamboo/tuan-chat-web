import type { QueryClient } from "@tanstack/react-query";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type { RepositoryPageByUserRequest } from "@tuanchat/openapi-client/models/RepositoryPageByUserRequest";
import type { RepositoryForkPageRequest } from "@tuanchat/openapi-client/models/RepositoryForkPageRequest";
import type { RepositoryPageRequest } from "@tuanchat/openapi-client/models/RepositoryPageRequest";

export const REPOSITORY_DETAIL_STALE_TIME_MS = 300_000;

export function repositoryDetailQueryKey(repositoryId: number): readonly ["repositoryDetail", number] {
    return ["repositoryDetail", repositoryId];
}

export function fetchRepositoryDetailWithCache(queryClient: QueryClient, repositoryId: number) {
    return queryClient.fetchQuery({
        queryKey: repositoryDetailQueryKey(repositoryId),
        queryFn: () => tuanchat.repositoryController.getById(repositoryId),
        staleTime: REPOSITORY_DETAIL_STALE_TIME_MS,
    });
}

//========================repository (仓库相关) ==================================

/**
 * 添加仓库
 */
export function useAddRepositoryMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        // 后端已下线「创建仓库」接口；保留 mutation 仅用于让旧页面不报类型错误。
        mutationFn: async (_req: unknown) => {
            throw new Error("创建仓库接口已下线");
        },
        mutationKey: ['addRepository'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repositoryList'] });
        }
    });
}

/**
 * 分页获取仓库列表
 */
export function useRepositoryListQuery(requestBody: RepositoryPageRequest) {
    return useQuery({
        queryKey: ['repositoryList', requestBody],
        queryFn: () => tuanchat.repositoryController.page(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 根据用户ID获取仓库列表
 */
export function useRepositoryListByUserQuery(requestBody: RepositoryPageByUserRequest) {
    return useQuery({
        queryKey: ['repositoryListByUser', requestBody],
        queryFn: () => tuanchat.repositoryController.pageByUserId(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 分页获取仓库 fork 列表（包含根仓库）
 */
export function useRepositoryForkListQuery(requestBody: RepositoryForkPageRequest) {
    return useQuery({
        queryKey: ['repositoryForkList', requestBody],
        queryFn: () => tuanchat.repositoryController.pageForks(requestBody),
        staleTime: 300000, // 5分钟缓存
    });
}

//========================commit (提交相关) ==================================

type ApiResult<T> = {
    success: boolean;
    errCode?: number;
    errMsg?: string;
    data?: T;
};

type RepositoryCommitChainNode = {
    commitId?: number;
    parentCommitId?: number;
    commitType?: number;
    userId?: number;
    createTime?: string;
    updateTime?: string;
};

export type RepositoryCommitChainData = {
    repositoryId?: number;
    headCommitId?: number;
    commits?: RepositoryCommitChainNode[];
    truncated?: boolean;
    broken?: boolean;
};

/**
 * 获取仓库 commit 链
 */
export function useRepositoryCommitChainQuery(repositoryId: number, limit: number = 120) {
    const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 120;
    return useQuery<ApiResult<RepositoryCommitChainData>>({
        queryKey: ['repositoryCommitChain', repositoryId, normalizedLimit],
        queryFn: () => tuanchat.repositoryController.getCommitChain(repositoryId, normalizedLimit) as Promise<ApiResult<RepositoryCommitChainData>>,
        enabled: repositoryId > 0,
        staleTime: 60_000,
    });
}

export function useRepositoryDetailByIdQuery(repositoryId: number) {
    return useQuery({
        queryKey: repositoryDetailQueryKey(repositoryId),
        queryFn: () => tuanchat.repositoryController.getById(repositoryId),
        enabled: !!repositoryId,
        staleTime: REPOSITORY_DETAIL_STALE_TIME_MS // 5分钟缓存
    });
}

