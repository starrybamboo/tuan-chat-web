import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type { ItemAddRequest } from "../models/ItemAddRequest";
import type { ItemUpdateRequest } from "../models/ItemUpdateRequest";
import type { ItemPageRequest } from "../models/ItemPageRequest";
import type { ItemsGetRequest } from "../models/ItemsGetRequest";
import type { ModulePageRequest } from "../models/ModulePageRequest";
import type { ModuleCreateRequest } from "../models/ModuleCreateRequest";
import type { ModuleUpdateRequest } from "../models/ModuleUpdateRequest";
import type { ApiResultModuleInfo } from "../models/ApiResultModuleInfo";
import type { EntityAddRequest } from "api/models/EntityAddRequest";
import type { EntityRenameRequest } from "api/models/EntityRenameRequest";
import type { RoleImportRequest } from "api/models/RoleImportRequest";
import type { CommitRequest } from "api/models/CommitRequest";
import type { StageRollbackRequest } from "api/models/StageRollbackRequest";
import type { BranchSwitchRequest } from "api/models/BranchSwitchRequest";

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
        mutationFn: (req: ItemAddRequest) => tuanchat.itemController.addItem1(req),
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
        queryFn: () => tuanchat.itemController.page1(requestBody),
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
        mutationFn: (req: ModuleCreateRequest) => tuanchat.moduleController.addModule(req),
        mutationKey: ['addModule'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moduleList'] });
            queryClient.invalidateQueries({ queryKey: ['staging'] });
        }
    });
}

/**
 * 分页获取模组列表
 */
export function useModuleListQuery(requestBody: ModulePageRequest) {
    return useQuery({
        queryKey: ['moduleList', requestBody],
        queryFn: () => tuanchat.moduleController.page(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

//========================commit (提交相关) ==================================

/**
 * 获取模组信息
 */
export function useModuleInfoQuery(moduleId: number, branchId?: number) {
    return useQuery({
        queryKey: ['moduleInfo', moduleId, branchId],
        queryFn: () => tuanchat.commitController.getModuleInfo(moduleId, branchId),
        enabled: !!moduleId,
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 根据提交ID获取模组信息
 */
export function useModuleInfoByCommitIdQuery(commitId: number) {
    return useQuery({
        queryKey: ['moduleInfoByCommitId', commitId],
        queryFn: () => tuanchat.commitController.getModuleInfoByCommitId(commitId),
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

/*====================stages=======================*/
// 回退文件信息
export function useStageRollbackMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: StageRollbackRequest) => tuanchat.stageController.rollback(req),
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
        queryFn: () => tuanchat.stageController.staging(),
        staleTime: 300000 // 5分钟缓存
    });
}

// 提交对应的修改
export function useCommitMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CommitRequest) => tuanchat.stageController.commit(req),
        mutationKey: ['commit'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staging'] });
        }
    });
}

// 查询最新提交的修改
export function useQueryCommitQuery(stageId: number) {
    return useQuery({
        queryKey: ['queryCommit', stageId],
        queryFn: () => tuanchat.stageController.queryCommit(stageId),
        staleTime: 300000 // 5分钟缓存
    });
}

// 查询所有的实体
export function useQueryEntitiesQuery(stageId: number) {
    return useQuery({
        queryKey: ['queryEntities', stageId],
        queryFn: () => tuanchat.stageController.queryEntities(stageId),
        staleTime: 300000 // 5分钟缓存
    });
}

// 导入角色实体
export function useImportRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoleImportRequest) => tuanchat.stageController.importRole(req),
        mutationKey: ['importRole'],
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['queryEntities', variables.stageId] });
        }
    });
}

// 修改实体
export function useRenameMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: EntityRenameRequest) => tuanchat.stageController.rename(req),
        mutationKey: ['rename'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staging'] });
        }
    });
}

// 添加也可以删除实体
export function useAddMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: EntityAddRequest) => tuanchat.stageController.add(req),
        mutationKey: ['addEntity'],
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['queryEntities', variables.stageId] });
        }
    });
}

export function useBranchListQuery(stageId: number) {
    return useQuery({
        queryKey: ['branchList'],
        queryFn: () => tuanchat.stageController.branches(stageId),
        staleTime: 300000 // 5分钟缓存
    });
}

export function useSwitchBranchMutation() {
    return useMutation({
        mutationFn: (data: BranchSwitchRequest) => tuanchat.stageController.switchBranch(data),
    });
}