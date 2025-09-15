import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type {ModulePageRequest} from "../models/ModulePageRequest";
import type {ModuleCreateRequest} from "../models/ModuleCreateRequest";
import type {ModuleUpdateRequest} from "../models/ModuleUpdateRequest";
import type { StageRollbackRequest } from "api/models/StageRollbackRequest";
import type { CommitRequest } from "api/models/CommitRequest";
import type { RoleImportRequest } from "api/models/RoleImportRequest";
import type { EntityAddRequest } from "api/models/EntityAddRequest";
import type {ModulePageByUserRequest} from "../models/ModulePageByUserRequest";
// import type { EntityRenameRequest } from "api/models/EntityRenameRequest";
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
            queryClient.invalidateQueries({queryKey: ['staging'] });
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
            queryClient.invalidateQueries({ queryKey: ['staging'] });
        }
    });
}

/**
 * 分页获取剧本列表
 */
export function useModuleListQuery(requestBody: ModulePageRequest) {
    return useQuery({
        queryKey: ['moduleList', requestBody],
        queryFn: () => tuanchat.moduleController.page(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 根据用户ID获取剧本列表
 */
export function useModuleListByUserQuery(requestBody: ModulePageByUserRequest) {
    return useQuery({
        queryKey: ['moduleListByUser', requestBody],
        queryFn: () => tuanchat.moduleController.pageByUserId(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
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

// // 查询最新提交的修改
// export function useQueryCommitQuery(stageId: number) {
//     return useQuery({
//         queryKey: ['queryCommit', stageId],
//         queryFn: () => tuanchat.stageController.queryCommit(stageId),
//         staleTime: 300000 // 5分钟缓存
//     });
// }

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staging'] });
        }
    });
}

// // 修改实体
// export function useRenameMutation() {
//     const queryClient = useQueryClient();
//     return useMutation({
//         mutationFn: (req: EntityRenameRequest) => tuanchat.stageController.rename(req),
//         mutationKey: ['rename'],
//         onSuccess: () => {
//             queryClient.invalidateQueries({ queryKey: ['staging'] });
//         }
//     });
// }

// 添加也可以删除实体
export function useAddMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: EntityAddRequest) => tuanchat.stageController.add(req),
        mutationKey: ['addEntity'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staging'] });
        }
    });
}
