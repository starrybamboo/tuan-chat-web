import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type { ItemAddRequest } from "../models/ItemAddRequest";
import type { ItemUpdateRequest } from "../models/ItemUpdateRequest";
import type { ItemPageRequest } from "../models/ItemPageRequest";
import type { ItemsGetRequest } from "../models/ItemsGetRequest";
import type { RepositoryPageByUserRequest } from "../models/RepositoryPageByUserRequest";
import type { RepositoryForkPageRequest } from "../models/RepositoryForkPageRequest";
import type { RepositoryPageRequest } from "../models/RepositoryPageRequest";
import type { RepositoryUpdateRequest } from "../models/RepositoryUpdateRequest";
import type { RepositoryEntityResponse } from "../deprecated/RepositoryEntityResponse";

//========================item (物品相关) ==================================
/**
 * 更新物品
 */
function useUpdateItemMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ItemUpdateRequest) => tuanchat.itemController.updateItem(req),
        mutationKey: ['updateItem'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
        }
    });
}

/**
 * 添加物品
 */
function useAddItemMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ItemAddRequest) => tuanchat.itemController.addItem(req),
        mutationKey: ['addItem'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
        }
    });
}

/**
 * 删除物品
 */
function useDeleteItemMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => tuanchat.itemController.deleteItem(id),
        mutationKey: ['deleteItem'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
        }
    });
}

/**
 * 获取物品列表
 */
function useItemsQuery(requestBody: ItemPageRequest) {
    return useQuery({
        queryKey: ['items', requestBody],
        queryFn: () => tuanchat.itemController.page(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 获取物品详情
 */
function useItemDetailQuery(id: number) {
    return useQuery({
        queryKey: ['itemDetail', id],
        queryFn: () => tuanchat.itemController.getById(id),
        staleTime: 300000, // 5分钟缓存
        enabled: !!id
    });
}

/**
 * 批量获取物品
 */
function useItemsBatchQuery(requestBody: ItemsGetRequest) {
    return useQuery({
        queryKey: ['itemsBatch', requestBody],
        queryFn: () => tuanchat.itemController.getByIds(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

//========================repository (仓库相关) ==================================

/**
 * 更新仓库
 */
function useUpdateRepositoryMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RepositoryUpdateRequest) => tuanchat.repositoryController.updateRepository(req),
        mutationKey: ['updateRepository'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['repositoryList'] });
            // 注意：RepositoryUpdateRequest中应该有repositoryId字段，如果没有请根据实际情况调整
            if ('repositoryId' in variables) {
                queryClient.invalidateQueries({ queryKey: ['repositoryDetail', variables.repositoryId] });
            }
        }
    });
}

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

type DeprecatedApiResult<T> = {
    success: boolean;
    data?: T;
    message?: string;
    code?: number;
};

type DeprecatedRepositoryInfoResponse = {
    responses?: RepositoryEntityResponse[];
    repositoryMap?: {
        sceneMap?: Record<string, number[]>;
        [key: string]: unknown;
    };
    [key: string]: unknown;
};

/**
 * 获取仓库信息
 */
function useRepositoryInfoQuery(repositoryId: number, branchId?: number) {
    return useQuery<DeprecatedApiResult<DeprecatedRepositoryInfoResponse>>({
        queryKey: ['repositoryInfo', repositoryId, branchId],
        // 后端已下线 Commit/RepositoryInfo；返回占位数据，避免旧页面报错。
        queryFn: async () => ({
            success: true,
            data: {
                responses: [],
                repositoryMap: { sceneMap: {} },
            },
        }),
        enabled: !!repositoryId,
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 根据提交ID获取仓库信息
 */
function useRepositoryInfoByCommitIdQuery(commitId: number) {
    return useQuery<DeprecatedApiResult<DeprecatedRepositoryInfoResponse>>({
        queryKey: ['repositoryInfoByCommitId', commitId],
        // 后端已下线 Commit/RepositoryInfo；返回占位数据，避免旧页面报错。
        queryFn: async () => ({
            success: true,
            data: {
                responses: [],
                repositoryMap: { sceneMap: {} },
            },
        }),
        enabled: !!commitId,
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 获取单个仓库的基本信息（通过列表查询筛选）
 */
function useRepositoryDetailQuery(repositoryId: number) {
    const { data: listData, ...rest } = useRepositoryListQuery({
        pageNo: 1,
        pageSize: 100,
    });

    const repositoryDetail = listData?.data?.list?.find((repository: any) => repository.repositoryId === repositoryId);

    return {
        data: repositoryDetail ? { data: repositoryDetail } : undefined,
        ...rest
    };
}

export function useRepositoryDetailByIdQuery(repositoryId: number) {
    return useQuery({
        queryKey: ['repositoryDetail', repositoryId],
        queryFn: () => tuanchat.repositoryController.getById(repositoryId),
        enabled: !!repositoryId,
        staleTime: 300000 // 5分钟缓存
    });
}

// 仓库角色上传头像
function useUploadRepositoryRoleAvatarMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ avatarUrl, spriteUrl, id }: { avatarUrl: string; spriteUrl: string; id: number }) => {
            const res = await tuanchat.avatarController.setRoleAvatar({});
            if (!res.success || !res.data) {
                console.error("头像创建失败", res);
                return undefined;
            }
            const avatarId = res.data;
            await tuanchat.avatarController.updateRoleAvatar({
                avatarId,
                avatarUrl,
                spriteUrl
            });
            return avatarId;
        },
        mutationKey: ['uploadRepositoryRoleAvatar'],
    });
}

