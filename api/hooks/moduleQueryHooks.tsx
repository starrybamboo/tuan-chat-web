import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type {ModuleItemUpdateRequest} from "../models/ModuleItemUpdateRequest";
import type {ModuleItemCreateRequest} from "../models/ModuleItemCreateRequest";
import type {ModuleItemDeleteRequest} from "../models/ModuleItemDeleteRequest";
import type {ModuleItemListRequest} from "../models/ModuleItemListRequest";
import type {ModulePageRequest} from "../models/ModulePageRequest";
import type {ModuleDeleteRequest} from "../models/ModuleDeleteRequest";
import type {ModuleCreateRequest} from "../models/ModuleCreateRequest";
import type {ModuleUpdateRequest} from "../models/ModuleUpdateRequest";
import type {ModuleRolePageRequest} from "../models/ModuleRolePageRequest";
import type {ModuleRoleDeleteRequest} from "../models/ModuleRoleDeleteRequest";
import type {ModuleRoleCreateRequest} from "../models/ModuleRoleCreateRequest";
import type {ModuleSceneUpdateRequest} from "../models/ModuleSceneUpdateRequest";
import type {ModuleSceneCreateRequest} from "../models/ModuleSceneCreateRequest";
import type {ModuleSceneDeleteRequest} from "../models/ModuleSceneDeleteRequest";
import type {ModuleScenePageRequest} from "../models/ModuleScenePageRequest";

//========================module item ==================================
/**
 * 更新物品
 */
export function useUpdateItemMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ModuleItemUpdateRequest) => tuanchat.moduleItemController.updateItem(req),
        mutationKey: ['updateItem'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moduleItems'] });
        }
    });
}

/**
 * 添加物品
 */
export function useAddItemMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ModuleItemCreateRequest) => tuanchat.moduleItemController.addItem(req),
        mutationKey: ['addItem'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moduleItems'] });
        }
    });
}

/**
 * 删除物品
 */
export function useDeleteItemMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ModuleItemDeleteRequest) => tuanchat.moduleItemController.deleteItem(req),
        mutationKey: ['deleteItem'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moduleItems'] });
        }
    });
}

/**
 * 获取物品列表
 */
export function useModuleItemsQuery(requestBody: ModuleItemListRequest) {
    return useQuery({
        queryKey: ['moduleItems', requestBody],
        queryFn: () => tuanchat.moduleItemController.list(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

//========================module==================================

/**
 * 更新剧本
 */
export function useUpdateModuleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ModuleUpdateRequest) => tuanchat.moduleController.updateModule(req),
        mutationKey: ['updateModule'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['moduleList'] });
            queryClient.invalidateQueries({ queryKey: ['moduleDetail', variables.moduleId] });
        }
    });
}

/**
 * 添加剧本
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
 * 删除剧本
 */
export function useDeleteModuleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ModuleDeleteRequest) => tuanchat.moduleController.deleteModule(req),
        mutationKey: ['deleteModule'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moduleList'] });
        }
    });
}

/**
 * 分页获取剧本列表
 */
export function useModuleListQuery(requestBody: ModulePageRequest) {
    return useQuery({
        queryKey: ['moduleList', requestBody],
        queryFn: () => tuanchat.moduleController.page1(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 获取剧本详情
 */
export function useModuleDetailQuery(id: number) {
    return useQuery({
        queryKey: ['moduleDetail', id],
        queryFn: () => tuanchat.moduleController.getById(id),
        staleTime: 300000, // 5分钟缓存
        enabled: !!id
    });
}

//========================module role==================================

/**
 * 获取预设卡详情
 */
export function useModuleRoleInfoQuery(moduleId: number, roleId: number) {
    return useQuery({
        queryKey: ['moduleRoleInfo', moduleId, roleId],
        queryFn: () => tuanchat.moduleRoleController.getModuleRoleInfo(moduleId, roleId),
        staleTime: 300000, // 5分钟缓存
        enabled: !!moduleId && !!roleId
    });
}

/**
 * 创建模组角色
 */
export function useCreateModuleRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ModuleRoleCreateRequest) => tuanchat.moduleRoleController.createModuleRole(req),
        mutationKey: ['createModuleRole'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moduleRoles'] });
        }
    });
}

/**
 * 删除模组角色
 */
export function useDeleteModuleRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ModuleRoleDeleteRequest) => tuanchat.moduleRoleController.deleteModuleRole(req),
        mutationKey: ['deleteModuleRole'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moduleRoles'] });
        }
    });
}

/**
 * 分页获取模组角色
 */
export function useModuleRolesQuery(requestBody: ModuleRolePageRequest) {
    return useQuery({
        queryKey: ['moduleRoles', requestBody],
        queryFn: () => tuanchat.moduleRoleController.getModuleRolePage(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

//========================module scene==================================

/**
 * 更新场景
 */
export function useUpdateSceneMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ModuleSceneUpdateRequest) => tuanchat.moduleScene.updateScene(req),
        mutationKey: ['updateScene'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['moduleScenes'] });
            queryClient.invalidateQueries({ queryKey: ['sceneDetail', variables.moduleSceneId] });
        }
    });
}

/**
 * 添加场景
 */
export function useAddSceneMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ModuleSceneCreateRequest) => tuanchat.moduleScene.addScene(req),
        mutationKey: ['addScene'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moduleScenes'] });
        }
    });
}

/**
 * 删除场景
 */
export function useDeleteSceneMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ModuleSceneDeleteRequest) => tuanchat.moduleScene.deleteScene(req),
        mutationKey: ['deleteScene'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moduleScenes'] });
        }
    });
}

/**
 * 分页获取场景列表
 */
export function useModuleScenesQuery(requestBody: ModuleScenePageRequest) {
    return useQuery({
        queryKey: ['moduleScenes', requestBody],
        queryFn: () => tuanchat.moduleScene.page(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 获取场景详情
 */
export function useSceneDetailQuery(id: number) {
    return useQuery({
        queryKey: ['sceneDetail', id],
        queryFn: () => tuanchat.moduleScene.getSceneById(id),
        staleTime: 300000, // 5分钟缓存
        enabled: !!id
    });
}

/*====================stages=======================*/


