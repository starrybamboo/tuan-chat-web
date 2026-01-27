import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type { ItemAddRequest } from "../models/ItemAddRequest";
import type { ItemUpdateRequest } from "../models/ItemUpdateRequest";
import type { ItemPageRequest } from "../models/ItemPageRequest";
import type { ItemsGetRequest } from "../models/ItemsGetRequest";
import type { ModulePageRequest } from "../models/ModulePageRequest";
import type { ModuleUpdateRequest } from "../models/ModuleUpdateRequest";
import type { StageEntityResponse } from "../deprecated/StageEntityResponse";

//========================item (物品相关) ==================================
/**
 * 更新物品
 */
export function useUpdateItemMutation() {
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
export function useAddItemMutation() {
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
export function useDeleteItemMutation() {
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
export function useItemsQuery(requestBody: ItemPageRequest) {
    return useQuery({
        queryKey: ['items', requestBody],
        queryFn: () => tuanchat.itemController.page(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 获取物品详情
 */
export function useItemDetailQuery(id: number) {
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
export function useItemsBatchQuery(requestBody: ItemsGetRequest) {
    return useQuery({
        queryKey: ['itemsBatch', requestBody],
        queryFn: () => tuanchat.itemController.getByIds(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

//========================module (模组相关) ==================================

/**
 * 更新模组
 */
export function useUpdateModuleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ModuleUpdateRequest) => tuanchat.moduleController.updateModule(req),
        mutationKey: ['updateModule'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['moduleList'] });
            // 注意：ModuleUpdateRequest中应该有moduleId字段，如果没有请根据实际情况调整
            if ('moduleId' in variables) {
                queryClient.invalidateQueries({ queryKey: ['moduleDetail', variables.moduleId] });
            }
        }
    });
}

/**
 * 添加模组
 */
export function useAddModuleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        // 后端已下线「创建模组」接口；保留 mutation 仅用于让旧页面不报类型错误。
        mutationFn: async (_req: unknown) => {
            throw new Error("创建模组接口已下线");
        },
        mutationKey: ['addModule'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moduleList'] });
        }
    });
}

/**
 * 分页获取模组列表
 */
export function useModuleListQuery(requestBody: ModulePageRequest) {
    return useQuery({
        queryKey: ['moduleList', requestBody],
        queryFn: () => tuanchat.moduleController.page1(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

//========================commit (提交相关) ==================================

type DeprecatedApiResult<T> = {
    success: boolean;
    data?: T;
    message?: string;
    code?: number;
};

type DeprecatedModuleInfoResponse = {
    responses?: StageEntityResponse[];
    moduleMap?: {
        sceneMap?: Record<string, number[]>;
        [key: string]: unknown;
    };
    [key: string]: unknown;
};

/**
 * 获取模组信息
 */
export function useModuleInfoQuery(moduleId: number, branchId?: number) {
    return useQuery<DeprecatedApiResult<DeprecatedModuleInfoResponse>>({
        queryKey: ['moduleInfo', moduleId, branchId],
        // 后端已下线 Commit/ModuleInfo；返回占位数据，避免旧页面报错。
        queryFn: async () => ({
            success: true,
            data: {
                responses: [],
                moduleMap: { sceneMap: {} },
            },
        }),
        enabled: !!moduleId,
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 根据提交ID获取模组信息
 */
export function useModuleInfoByCommitIdQuery(commitId: number) {
    return useQuery<DeprecatedApiResult<DeprecatedModuleInfoResponse>>({
        queryKey: ['moduleInfoByCommitId', commitId],
        // 后端已下线 Commit/ModuleInfo；返回占位数据，避免旧页面报错。
        queryFn: async () => ({
            success: true,
            data: {
                responses: [],
                moduleMap: { sceneMap: {} },
            },
        }),
        enabled: !!commitId,
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 获取单个模组的基本信息（通过列表查询筛选）
 */
export function useModuleDetailQuery(moduleId: number) {
    const { data: listData, ...rest } = useModuleListQuery({
        pageNo: 1,
        pageSize: 100,
    });

    const moduleDetail = listData?.data?.list?.find((module: any) => module.moduleId === moduleId);

    return {
        data: moduleDetail ? { data: moduleDetail } : undefined,
        ...rest
    };
}

export function useModuleDetailByIdQuery(moduleId: number) {
    return useQuery({
        queryKey: ['moduleDetail', moduleId],
        queryFn: () => tuanchat.moduleController.getById1(moduleId),
        enabled: !!moduleId,
        staleTime: 300000 // 5分钟缓存
    });
}

/*====================stages=======================*/
type DeprecatedStageResult<T> = { success: boolean; data: T };
type DeprecatedStageSpaceIdRequest = { spaceId: number; [key: string]: unknown };
type DeprecatedStageEntityUpdateRequest = { id: number; [key: string]: unknown };
type DeprecatedStageDeleteEntityRequest = { id: number; spaceId: number; [key: string]: unknown };

// 回退文件信息
export function useStageRollbackMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (_req: unknown) => {
            throw new Error("后端已下线 stage rollback 接口");
        },
        mutationKey: ['rollback'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staging'] });
        }
    });
}

// 自动查询并显示自己拥有的模组
export function useStagingQuery() {
    return useQuery({
        queryKey: ['staging'],
        // 后端已下线 staging；返回空数据占位，避免旧页面报错。
        queryFn: async () => ({ success: true, data: [] } as any),
        staleTime: 300000 // 5分钟缓存
    });
}

// 提交对应的修改
export function useCommitMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (_req: unknown) => {
            throw new Error("后端已下线 stage commit 接口");
        },
        mutationKey: ['commit'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staging'] });
        }
    });
}

// 查询所有的实体
export function useQueryEntitiesQuery(spaceId: number) {
    return useQuery<DeprecatedStageResult<StageEntityResponse[]>>({
        queryKey: ['queryEntities', spaceId],
        // 后端已下线 stage entities；返回空列表占位，避免旧页面与类型报错。
        queryFn: async () => ({ success: true, data: [] }),
        staleTime: 300000 // 5分钟缓存
    });
}

// 添加也可以删除实体
/**
 * @deprecated
 */
export function useAddMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (_req: DeprecatedStageSpaceIdRequest) => {
            throw new Error("后端已下线 stage addEntity 接口");
        },
        mutationKey: ['addEntity'],
        onSuccess: (_data, variables: DeprecatedStageSpaceIdRequest) => {
            queryClient.invalidateQueries({ queryKey: ['queryEntities', variables.spaceId] });
        }
    });
}

// 根据entityType添加实体
export function useAddEntityMutation(entityType: 1 | 2 | 3 | 4 | 5) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (_req: DeprecatedStageSpaceIdRequest) => {
            throw new Error("后端已下线 stage addEntity 接口");
        },
        mutationKey: ['addEntity'],
        onSuccess: (_data, variables: DeprecatedStageSpaceIdRequest) => {
            queryClient.invalidateQueries({ queryKey: ['queryEntities', variables.spaceId] });
        }
    });
}

// 直接传入完整EntityAddRequest对象（包括entityType）
export function useAddEntityWithoutTypeMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (_req: unknown) => {
            throw new Error("后端已下线 stage addEntity 接口");
        },
        mutationKey: ['addEntityWithType'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queryEntities'] });
        },
    });
}

// 重命名实体(调用更新接口)
// export function useRenameMutation(entityType: 'item' | 'scene' | 'role' | 'location') {
//     const queryClient = useQueryClient();
//     return useMutation({
//         mutationFn: (req: { id: number, name: string }) => tuanchat.stageController.update({
//             id:req.id,
//             name:req.name,
//             entityType
//         }),
//         mutationKey: ['renameEntity'],
//         onSuccess: (_data, variables) => {
//             queryClient.invalidateQueries({ queryKey: ['queryEntities', variables.id] });
//         }
//     });
// }

export function useUpdateEntityMutation(spaceId: number, roomId?: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (_req: DeprecatedStageEntityUpdateRequest) => {
            throw new Error("后端已下线 stage updateEntity 接口");
        },
        mutationKey: ['updateEntity'],
        onSuccess: (_data, variables: DeprecatedStageEntityUpdateRequest) => {
            queryClient.invalidateQueries({ queryKey: ['queryEntities', spaceId], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['roleAvatar', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['item-detail', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['location-detail', variables.id] });
            if (roomId) {
                queryClient.invalidateQueries({ queryKey: ['roomItems', roomId] });
                queryClient.invalidateQueries({ queryKey: ['roomLocations', roomId] });
            }
        }
    })
}

// 删除实体
export function useDeleteEntityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (_req: DeprecatedStageDeleteEntityRequest) => {
            throw new Error("后端已下线 stage deleteEntity 接口");
        },
        mutationKey: ['deleteEntity'],
        onSuccess: (_data, variables: DeprecatedStageDeleteEntityRequest) => {
            queryClient.invalidateQueries({ queryKey: ['queryEntities', variables.spaceId] });
        }
    });
}

// 增加角色的hook
export function useAddRoleMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (_req: DeprecatedStageSpaceIdRequest) => {
            throw new Error("后端已下线 stage importRole 接口");
        },
        mutationKey: ['addRole'],
        onSuccess: (_data, variables: DeprecatedStageSpaceIdRequest) => {
            queryClient.invalidateQueries({ queryKey: ['queryEntities', variables.spaceId] });
        }
    });
}

// 模组角色上传头像
export function useUploadModuleRoleAvatarMutation() {
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
        mutationKey: ['uploadModuleRoleAvatar'],
    });
}

export function useIdToSearchQuery(id: number) {
    return useQuery<{ data?: StageEntityResponse } | undefined>({
        queryKey: ['idToSearch'],
        queryFn: async () => {
            // 后端已下线 stage get；返回 undefined 占位。
            return undefined;
        }
    });
}

export function useVersionIdSearchQuery(spaceId:number, versionId: number) {
    return useQuery<{ data?: StageEntityResponse } | undefined>({
        queryKey: ['versionIdToSearch'],
        queryFn: async () => {
            // 后端已下线 stage getByVersionIds；返回 undefined 占位。
            void spaceId;
            void versionId;
            return undefined;
        }
    });
}

export function useModuleItemDetailQuery(itemId: number) {
    return useQuery<StageEntityResponse | undefined>({
        queryKey: ['item-detail', itemId],
        queryFn: async () => {
            // 后端已下线 stage get；返回 undefined 占位。
            return undefined;
        },
        enabled: itemId > 0,
    });
}

export function useLocationDetailQuery(locationId: number) {
    return useQuery<StageEntityResponse | undefined>({
        queryKey: ['location-detail', locationId],
        queryFn: async () => {
            // 后端已下线 stage get；返回 undefined 占位。
            return undefined;
        },
        enabled: locationId > 0,
    });
}