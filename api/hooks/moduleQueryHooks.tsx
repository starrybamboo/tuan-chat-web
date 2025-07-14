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