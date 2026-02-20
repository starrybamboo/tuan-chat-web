/**
 * AI根据Service生成的hook, 使用的时候请好好检查.
 * 请不要在function外定义一个queryClient, React 上下文作用域外使用是不行的
 * 以后这里只放通用的hooks
 */
/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { useQuery, useMutation, useQueryClient, useQueries, useInfiniteQuery } from '@tanstack/react-query';
import { tuanchat } from '../instance';


// import type { RoleAbilityTable } from './models/RoleAbilityTable';
import type { RoleAvatar } from '../models/RoleAvatar';
import type { RoleAvatarCreateRequest } from '../models/RoleAvatarCreateRequest';
import type { UserLoginRequest } from '../models/UserLoginRequest';
import type { UserRegisterRequest } from '../models/UserRegisterRequest';
import type { RolePageQueryRequest } from '../models/RolePageQueryRequest'
import type { Transform } from '../../app/components/Role/sprite/TransformControl';
import type { UserRole } from '../models/UserRole';

import { emitWebgalAvatarUpdated } from "../../app/webGAL/avatarSync";

import {
  type ApiResultRoleAbility,
  type ApiResultUserRole,
  type ApiResultRoleAvatar,
  type UserInfoResponse,
  type RoleCreateRequest
} from "api";
import type { Role } from '@/components/Role/types';

function getErrorStatusCode(error: unknown): number | undefined {
  const e = error as any;
  return e?.status ?? e?.response?.status;
}

function shouldRetryRoleQuery(failureCount: number, error: unknown): boolean {
  const statusCode = getErrorStatusCode(error);
  // 角色不存在等 4xx 客户端错误不重试，避免同一 roleId 连续发起多次失败请求。
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return false;
  }
  return failureCount < 2;
}

function upsertRoleAvatarQueryCaches(queryClient: any, avatar: RoleAvatar, roleId?: number): void {
  const avatarId = avatar.avatarId;
  if (!avatarId) {
    return;
  }

  if (roleId) {
    queryClient.setQueryData(["getRoleAvatars", roleId], (old: any) => {
      if (!old) {
        return old;
      }

      const replaceAvatar = (list: RoleAvatar[]) =>
        list.map((item) => (item.avatarId === avatarId ? { ...item, ...avatar } : item));

      if (Array.isArray(old)) {
        return replaceAvatar(old);
      }

      if (Array.isArray(old.data)) {
        return {
          ...old,
          data: replaceAvatar(old.data),
        };
      }

      return old;
    });
  }

  queryClient.setQueryData(["getRoleAvatar", avatarId], { data: avatar });
  queryClient.invalidateQueries({ queryKey: ["getRoleAvatar", avatarId] });
  queryClient.invalidateQueries({ queryKey: ["avatar", avatarId] });
}

// ==================== 角色管理 ====================
/**
 * 根据id获取角色
 * @param roleId 角色ID
 */
export function useGetRoleQuery(roleId: number) {
  return useQuery({
    queryKey: ['getRole', roleId],
    queryFn: () => tuanchat.roleController.getRole(roleId),
    staleTime: 600000, // 10分钟缓存
    retry: shouldRetryRoleQuery,
    retryOnMount: false,
    enabled: typeof roleId === 'number' && !isNaN(roleId) && roleId > 0
  });
}

/**
 * 根据id批量获取角色
 */
export function useGetRolesQueries(roleIds: number[]) {
  return useQueries({
    queries: roleIds.map((roleId) => ({
      queryKey: ["getRole", roleId],
      queryFn: () => tuanchat.roleController.getRole(roleId),
      staleTime: 600000, // 10分钟缓存
      retry: shouldRetryRoleQuery,
      retryOnMount: false,
      enabled: typeof roleId === 'number' && !isNaN(roleId) && roleId > 0
    }))
  });
}

/**
 * 更新角色信息（带本地角色状态）
 * @param onSave 保存成功的回调函数，接收本地角色状态
 */
export function useUpdateRoleWithLocalMutation(onSave: (localRole: Role) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["UpdateRole"],
    mutationFn: async (data: any) => {
      if (data.id !== 0) {
        const updateRes = await tuanchat.roleController.updateRole({
          roleId: data.id,
          roleName: data.name,
          description: data.description,
          avatarId: data.avatarId,
          modelName: data.modelName,
          speakerName: data.speakerName,
          voiceUrl: data.voiceUrl,
          extra: data.extra,
        });
        return updateRes;
      }
    },
    onSuccess: (_, variables) => {
      const resolvedRoleId = variables?.roleId ?? variables?.id;
      onSave(variables);
      if (resolvedRoleId && variables?.avatar) {
        queryClient.setQueryData(["roleAvatar", resolvedRoleId], {
          avatar: variables.avatar,
          avatarThumb: variables.avatarThumb || variables.avatar,
          avatarId: variables.avatarId,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["roleInfinite"] });
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByType"] });
      queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
      if (resolvedRoleId) {
        queryClient.invalidateQueries({ queryKey: ["getRole", resolvedRoleId] });
        queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", resolvedRoleId] });
        queryClient.invalidateQueries({ queryKey: ["roleAvatar", resolvedRoleId] });
      }
      queryClient.invalidateQueries({ queryKey: ["roomRole"] });
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      if (error.response && error.response.data) {
        console.error("Server response:", error.response.data);
      }
    },
  });
}

/**
 * 创建角色的hook
 * @returns 创建角色的mutation对象
 */
export function useCreateRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["createRole"],
    mutationFn: async (req: RoleCreateRequest) => {
      const res = await tuanchat.roleController.createRole(req);
      if (res.success) {
        console.warn("角色创建成功");
        return res.data;
      }
      else {
        console.error("创建角色失败");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roleInfinite"] });
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
      queryClient.invalidateQueries({ queryKey: ['getRole'] });
      queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
    },
  });
}

/**
 * 批量删除角色的hook
 * @param onSuccess 删除成功的回调函数
 * @returns 删除角色的mutation对象
 */
export function useDeleteRolesMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["deleteRoles"],
    mutationFn: async (roleIds: number[]) => {
      const res = await tuanchat.roleController.deleteRole1(roleIds);
      if (!res.success) {
        throw new Error("删除角色失败");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roleInfinite"] });
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
      queryClient.invalidateQueries({ queryKey: ['getRole'] });
      queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
      queryClient.invalidateQueries({ queryKey: ["roomRole"] });
    },
    onError: (error) => {
      console.error("删除角色失败:", error);
    }
  });
}

// 复制角色，保持与角色模块的 hooks 汇总
export type TargetType = "dicer" | "normal";

function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function cleanDicerFields(obj: any): any {
  if (!obj) return obj;
  const cleaned = deepCopy(obj);
  if (cleaned.extra && typeof cleaned.extra === "object") {
    delete cleaned.extra.dicerRoleId;
  }
  return cleaned;
}

interface CopyRoleArgs {
  sourceRole: Role;
  targetType: TargetType;
  newName: string;
  newDescription: string;
}

export function useCopyRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["copyRole"],
    mutationFn: async ({ sourceRole, targetType, newName, newDescription }: CopyRoleArgs): Promise<Role> => {
      if (targetType === "dicer") {
        const copyRes = await tuanchat.request.request<ApiResultUserRole>({
          method: "POST",
          url: "/role/copy",
          body: {
            sourceRoleId: sourceRole.id,
            newRoleName: newName?.trim() || undefined,
            newRoleDescription: newDescription?.trim() || undefined,
            targetType: 1,
          },
          mediaType: "application/json",
        });

        const copiedRole = copyRes?.data;
        if (!copyRes?.success || !copiedRole?.roleId) {
          throw new Error(copyRes?.errMsg || "角色复制失败");
        }

        let avatarUrl = sourceRole.avatar || "/favicon.ico";
        let avatarThumb = sourceRole.avatarThumb || avatarUrl;
        const copiedAvatarId = copiedRole.avatarId ?? 0;
        if (copiedAvatarId > 0) {
          try {
            const avatarRes = await tuanchat.avatarController.getRoleAvatar(copiedAvatarId);
            if (avatarRes?.success && avatarRes.data) {
              avatarUrl = avatarRes.data.avatarUrl || avatarUrl;
              avatarThumb = avatarRes.data.avatarThumbUrl || avatarUrl;
            }
          }
          catch (error) {
            console.warn("复制角色后获取头像失败", error);
          }
        }

        return {
          id: copiedRole.roleId,
          name: copiedRole.roleName || newName,
          description: copiedRole.description || newDescription || "",
          avatar: avatarUrl,
          avatarThumb,
          avatarId: copiedAvatarId,
          type: copiedRole.type,
          modelName: copiedRole.modelName || sourceRole.modelName,
          speakerName: copiedRole.speakerName || sourceRole.speakerName,
          voiceUrl: copiedRole.voiceUrl || sourceRole.voiceUrl,
          extra: copiedRole.extra ?? cleanDicerFields(sourceRole.extra),
        };
      }

      // 走到这里表示目标为 normal（dicer 已在前面走后端 copy 接口直接返回）
      const targetRoleType = 0;
      const isSameType = sourceRole.type === targetRoleType;

      // 1. 创建新角色
      const createRes = await tuanchat.roleController.createRole({
        roleName: newName,
        description: newDescription,
        type: targetRoleType,
      });
      const newRoleId = createRes?.data;
      if (!createRes?.success || !newRoleId || newRoleId <= 0) {
        throw new Error("角色创建失败");
      }

      let finalAvatarUrl = "/favicon.ico";
      let finalAvatarId: number | undefined;

      // 2. 复制所有头像（并行 + 容错）
      try {
        const sourceAvatarsRes = await tuanchat.avatarController.getRoleAvatars(sourceRole.id);
        const avatarList = sourceAvatarsRes?.data || [];

        const copyTasks = avatarList.map((sourceAvatar: any) => (async () => {
          const setRes = await tuanchat.avatarController.setRoleAvatar({ roleId: newRoleId });
          const newAvatarId = setRes?.data;
          if (!newAvatarId) throw new Error("创建新头像失败");

          await tuanchat.avatarController.updateRoleAvatar({
            roleId: newRoleId,
            avatarId: newAvatarId,
            avatarUrl: sourceAvatar.avatarUrl,
            avatarThumbUrl: sourceAvatar.avatarThumbUrl,
            spriteUrl: sourceAvatar.spriteUrl || "",
            spriteXPosition: sourceAvatar.spriteXPosition ?? 0,
            spriteYPosition: sourceAvatar.spriteYPosition ?? 0,
            spriteScale: sourceAvatar.spriteScale ?? 1,
            spriteTransparency: sourceAvatar.spriteTransparency ?? 1,
            spriteRotation: sourceAvatar.spriteRotation ?? 0,
          });

          return {
            sourceAvatarId: sourceAvatar.avatarId as number | undefined,
            newAvatarId: newAvatarId as number,
            avatarUrl: sourceAvatar.avatarUrl as string,
          };
        })());

        const results = await Promise.allSettled(copyTasks);
        const successes: Array<{ sourceAvatarId?: number; newAvatarId: number; avatarUrl: string }> = [];
        const failures: Array<any> = [];

        results.forEach((res, idx) => {
          if (res.status === "fulfilled") successes.push(res.value);
          else failures.push({ index: idx, reason: res.reason });
        });

        if (failures.length > 0) {
          console.warn(`部分头像复制失败，共 ${failures.length} 个`, failures);
        }

        const matched = successes.find(s => s.sourceAvatarId && s.sourceAvatarId === sourceRole.avatarId);
        const chosen = matched ?? successes[0];
        if (chosen) {
          await tuanchat.roleController.updateRole({ roleId: newRoleId, avatarId: chosen.newAvatarId });
          finalAvatarUrl = chosen.avatarUrl;
          finalAvatarId = chosen.newAvatarId;
        }
      } catch (e) {
        console.error("复制头像失败", e);
      }

      // 3. 同类型复制能力
      if (isSameType) {
        try {
          const sourceAbilitiesRes = await tuanchat.abilityController.listRoleAbility(sourceRole.id);
          const sourceAbilities = sourceAbilitiesRes?.data || [];

          for (const ability of sourceAbilities) {
            const newAbilityData = deepCopy({
              act: ability.act || {},
              basic: ability.basic || {},
              ability: ability.ability || {},
              skill: ability.skill || {},
              extra: ability.extra || {},
            });

            if (ability.ruleId !== undefined) {
              await tuanchat.abilityController.setRoleAbility({
                ruleId: ability.ruleId,
                roleId: newRoleId,
                act: newAbilityData.act,
                basic: newAbilityData.basic,
                ability: newAbilityData.ability,
                skill: newAbilityData.skill,
                extra: newAbilityData.extra,
              });
            }
          }
        } catch (e) {
          console.error("复制能力数据失败", e);
        }
      } else {
        // 异类型复制：不创建能力组，仅清除骰娘专有字段，留空以便后续用户手动添加
      }

      const newRole: Role = {
        id: newRoleId,
        name: newName,
        description: newDescription,
        avatar: finalAvatarUrl,
        avatarId: finalAvatarId ?? 0,
        type: targetRoleType,
        modelName: sourceRole.modelName,
        speakerName: sourceRole.speakerName,
        voiceUrl: sourceRole.voiceUrl,
        extra: isSameType ? sourceRole.extra : cleanDicerFields(sourceRole.extra),
      };

      return newRole;
    },
    onSuccess: (newRole) => {
      // 统一失效相关查询
      queryClient.invalidateQueries({ queryKey: ["getRole", newRole.id] });
      queryClient.invalidateQueries({ queryKey: ["getUserRoles"] });
      queryClient.invalidateQueries({ queryKey: ["roleInfinite"] });
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
      queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", newRole.id] });
      queryClient.invalidateQueries({ queryKey: ["listRoleAbility", newRole.id] });
      queryClient.invalidateQueries({ queryKey: ["roleAbilityByRule"] });
    },
  });
}

// ==================== 用户管理 ====================
/**
 * 用户注册
 * @param onSuccess 注册成功回调
 */
export function useRegisterMutation(onSuccess?: () => void) {
  return useMutation({
    mutationFn: (req: UserRegisterRequest) => tuanchat.userController.register(req),
    mutationKey: ['register'],
    onSuccess: () => {
      onSuccess?.();
    }
  });
}




// ==================== 头像系统 ====================
/**
 * 获取角色所有头像
 * @param roleId 角色ID
 */
type RoleAvatarQueryOptions = {
  enabled?: boolean;
};

export function useGetRoleAvatarsQuery(roleId: number, options?: RoleAvatarQueryOptions) {
  const enabled = (options?.enabled ?? true) && typeof roleId === "number" && roleId > 0;
  return useQuery({
    queryKey: ['getRoleAvatars', roleId],
    queryFn: () => tuanchat.avatarController.getRoleAvatars(roleId),
    staleTime: 86400000, // 24小时缓存
    select: (res) => {
      if (!res || !Array.isArray(res.data)) {
        return res;
      }
      const sorted = [...res.data].sort((a, b) => {
        const aId = a.avatarId ?? Number.MAX_SAFE_INTEGER;
        const bId = b.avatarId ?? Number.MAX_SAFE_INTEGER;
        return aId - bId;
      });
      return { ...res, data: sorted };
    },
    enabled,
  });
}

/**
 * 获取角色回收站的头像
 * @param roleId 角色ID
 */
export function useGetDeletedRoleAvatarsQuery(roleId: number, options?: RoleAvatarQueryOptions) {
  const enabled = (options?.enabled ?? true) && typeof roleId === "number" && roleId > 0;
  return useQuery({
    queryKey: ['getDeletedRoleAvatars', roleId],
    queryFn: () => tuanchat.avatarController.getDeletedRoleAvatars(roleId),
    staleTime: 60000,
    enabled,
  });
}

/**
 * 获取单个头像详情
 * @param avatarId 头像ID
 */
type SingleRoleAvatarQueryOptions = {
  enabled?: boolean;
};

export function useGetRoleAvatarQuery(avatarId: number, options?: SingleRoleAvatarQueryOptions) {
  const enabled = (options?.enabled ?? true) && Boolean(avatarId);
  return useQuery({
    queryKey: ['getRoleAvatar', avatarId],
    queryFn: () => tuanchat.avatarController.getRoleAvatar(avatarId),
    staleTime: 86400000, // 24小时缓存
    enabled, // 仅在avatarId存在时启用查询
  });
}

/**
 * 更新角色头像
 * @param roleId 关联的角色ID（用于缓存刷新）
 */
export function useUpdateRoleAvatarMutation(roleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: RoleAvatar) => tuanchat.avatarController.updateRoleAvatar(req),
    mutationKey: ['updateRoleAvatar'],
    onSuccess: (res, variables) => {
      const nextAvatar = res?.data ?? variables;
      const resolvedRoleId = nextAvatar?.roleId ?? roleId;
      if (resolvedRoleId) {
        queryClient.setQueryData(["getRoleAvatars", resolvedRoleId], (old: any) => {
          if (!old || !nextAvatar?.avatarId) {
            return old;
          }

          const replaceAvatar = (list: RoleAvatar[]) => list.map((avatar) => {
            if (avatar.avatarId === nextAvatar.avatarId) {
              return { ...avatar, ...nextAvatar };
            }
            return avatar;
          });

          if (Array.isArray(old)) {
            return replaceAvatar(old);
          }

          if (Array.isArray(old.data)) {
            return {
              ...old,
              data: replaceAvatar(old.data),
            };
          }

          return old;
        });
        queryClient.invalidateQueries({ queryKey: ['getRoleAvatars', resolvedRoleId] });
      }
      if (nextAvatar?.avatarId) {
        queryClient.setQueryData(["getRoleAvatar", nextAvatar.avatarId], { data: nextAvatar });
        emitWebgalAvatarUpdated({ avatarId: nextAvatar.avatarId, avatar: nextAvatar });
        queryClient.invalidateQueries({ queryKey: ['getRoleAvatar', nextAvatar.avatarId] });
        queryClient.invalidateQueries({ queryKey: ['avatar', nextAvatar.avatarId] });
      }
    }
  });
}

/**
 * 创建角色头像
 * @param roleId 关联的角色ID（用于缓存刷新）
 */
export function useSetRoleAvatarMutation(roleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: RoleAvatarCreateRequest) => tuanchat.avatarController.setRoleAvatar(req),
    mutationKey: ['setRoleAvatar'],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getRoleAvatars', roleId] });
    }
  });
}

/**
 * 删除角色头像（单个）
 * @param roleId 关联的角色ID（用于缓存刷新）
 */
export function useDeleteRoleAvatarMutation(roleId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (avatarId: number) => tuanchat.avatarController.deleteRoleAvatar(avatarId),
    mutationKey: ['deleteRoleAvatar'],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getRoleAvatars', roleId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['getDeletedRoleAvatars', roleId], exact: true });
    }
  });
}

/**
 * 批量删除角色头像
 * @param roleId 关联的角色ID（用于缓存刷新）
 */
export function useBatchDeleteRoleAvatarsMutation(roleId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (avatarIds: number[]) => 
      Promise.all(avatarIds.map(id => tuanchat.avatarController.deleteRoleAvatar(id))),
    mutationKey: ['batchDeleteRoleAvatars'],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getRoleAvatars', roleId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['getDeletedRoleAvatars', roleId], exact: true });
    }
  });
}

/**
 * 恢复头像
 * @param roleId 关联的角色ID（用于缓存刷新）
 */
export function useRestoreRoleAvatarMutation(roleId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['restoreRoleAvatar', roleId],
    mutationFn: (avatarId: number) => tuanchat.avatarController.restoreRoleAvatar(avatarId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getRoleAvatars', roleId] });
      queryClient.invalidateQueries({ queryKey: ['getDeletedRoleAvatars', roleId] });
      queryClient.invalidateQueries({ queryKey: ['getRole', roleId] });
    },
  });
}

/**
 * 清空角色头像回收站（物理删除）
 * @param roleId 关联的角色ID（用于缓存刷新）
 */
export function useClearDeletedRoleAvatarsMutation(roleId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['clearDeletedRoleAvatars', roleId],
    mutationFn: (targetRoleId: number) => tuanchat.avatarController.clearDeletedRoleAvatars(targetRoleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getDeletedRoleAvatars', roleId] });
    },
  });
}


/**
 * 上传头像
 * 支持Transform参数：scale, positionX, positionY, alpha, rotation
 * Transform参数会被验证并转换为后端所需的字符串格式
 */
export function useApplyCropMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["applyCrop"],
    mutationFn: async ({ roleId, avatarId, croppedImageBlob, transform, currentAvatar }: {
      roleId: number;
      avatarId: number;
      croppedImageBlob: Blob;
      transform?: Transform;
      currentAvatar: RoleAvatar;
    }) => {
      if (!roleId || !avatarId || !croppedImageBlob || !currentAvatar) {
        console.error("参数错误：缺少必要参数");
        return undefined;
      }

      try {
        // 首先上传裁剪后的图片
        // 将Blob转换为File对象
        const croppedFile = new File([croppedImageBlob], `cropped_sprite_${avatarId}_${Date.now()}.png`, {
          type: 'image/png'
        });

        // 使用UploadUtils上传图片，场景3表示角色差分
        const { UploadUtils } = await import('../../app/utils/UploadUtils');
        const uploadUtils = new UploadUtils();
        const newSpriteUrl = await uploadUtils.uploadImg(croppedFile, 3, 0.9, 2560);


        // 直接使用传入的transform参数或默认值
        const finalTransform: Transform = transform || {
          scale: 1,
          positionX: 0,
          positionY: 0,
          alpha: 1,
          rotation: 0
        };

        // 使用新的spriteUrl和transform参数更新头像记录
        const updateRes = await tuanchat.avatarController.updateRoleAvatar({
          roleId: roleId,
          avatarId,
          avatarUrl: currentAvatar.avatarUrl, // 保持原有的avatarUrl
          avatarThumbUrl: currentAvatar.avatarThumbUrl,
          spriteUrl: newSpriteUrl, // 使用新的spriteUrl
          spriteXPosition: finalTransform.positionX,
          spriteYPosition: finalTransform.positionY,
          spriteScale: finalTransform.scale,
          spriteTransparency: finalTransform.alpha,
          spriteRotation: finalTransform.rotation,
        });

        if (!updateRes.success) {
          console.error("头像记录更新失败", updateRes);
          return undefined;
        }

        const nextAvatar: RoleAvatar = updateRes.data ?? {
          ...currentAvatar,
          roleId,
          avatarId,
          avatarUrl: currentAvatar.avatarUrl,
          spriteUrl: newSpriteUrl,
          spriteXPosition: finalTransform.positionX,
          spriteYPosition: finalTransform.positionY,
          spriteScale: finalTransform.scale,
          spriteTransparency: finalTransform.alpha,
          spriteRotation: finalTransform.rotation,
        };
        upsertRoleAvatarQueryCaches(queryClient, nextAvatar, roleId);
        emitWebgalAvatarUpdated({ avatarId, avatar: nextAvatar });
        await queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", roleId] });
        return updateRes;
      }
      catch (error) {
        console.error("裁剪应用请求失败", error);
        throw error;
      }
    },
    onError: (error) => {
      console.error("Crop application mutation failed:", error.message || error);
    },
  });
}

/**
 * 应用头像裁剪的hook - 专门用于更新头像而非立绘
 */
export function useApplyCropAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["applyCropAvatar"],
    mutationFn: async ({ roleId, avatarId, croppedImageBlob, currentAvatar }: {
      roleId: number;
      avatarId: number;
      croppedImageBlob: Blob;
      currentAvatar: RoleAvatar;
    }) => {
      if (!roleId || !avatarId || !croppedImageBlob || !currentAvatar) {
        console.error("参数错误：缺少必要参数");
        return undefined;
      }

      try {
        // 首先上传裁剪后的头像图片
        // 将Blob转换为File对象
        const croppedFile = new File([croppedImageBlob], `cropped_avatar_${avatarId}_${Date.now()}.png`, {
          type: 'image/png'
        });

        // 使用UploadUtils上传图片，场景2表示头像
        const { UploadUtils } = await import('../../app/utils/UploadUtils');
        const uploadUtils = new UploadUtils();
        const [newAvatarUrl, newAvatarThumbUrl] = await Promise.all([
          uploadUtils.uploadImg(croppedFile, 2, 0.9, 2560),
          uploadUtils.uploadImg(croppedFile, 2, 0.8, 128),
        ]);


        // 使用新的avatarUrl更新头像记录，保持原有的spriteUrl和Transform参数
        const updateRes = await tuanchat.avatarController.updateRoleAvatar({
          roleId: roleId,
          avatarId,
          avatarUrl: newAvatarUrl, // 使用新的avatarUrl
          avatarThumbUrl: newAvatarThumbUrl,
        });

        if (!updateRes.success) {
          console.error("头像记录更新失败", updateRes);
          return undefined;
        }

        await queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", roleId] });
        return updateRes;
      }
      catch (error) {
        console.error("头像裁剪应用请求失败", error);
        throw error;
      }
    },
    onSuccess: (res, variables) => {
      const nextAvatar: RoleAvatar = res?.data ?? {
        ...variables.currentAvatar,
        roleId: variables.roleId,
        avatarId: variables.avatarId,
      };
      upsertRoleAvatarQueryCaches(queryClient, nextAvatar, variables.roleId);
      emitWebgalAvatarUpdated({ avatarId: variables.avatarId, avatar: nextAvatar });
    },
    onError: (error) => {
      console.error("Crop avatar application mutation failed:", error.message || error);
    },
  });
}

export function useUpdateAvatarTransformMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateAvatarTransform"],
    mutationFn: async ({ roleId, avatarId, transform, currentAvatar }: {
      roleId: number;
      avatarId: number;
      transform: Transform;
      currentAvatar: RoleAvatar;
    }) => {
      if (!roleId || !avatarId || !transform || !currentAvatar) {
        console.error("参数错误：缺少必要参数");
        return undefined;
      }

      try {
        // 直接使用transform参数
        const t = transform;
        const updateRes = await tuanchat.avatarController.updateRoleAvatar({
          roleId: roleId,
          avatarId,
          avatarUrl: currentAvatar.avatarUrl,
          avatarThumbUrl: currentAvatar.avatarThumbUrl,
          spriteUrl: currentAvatar.spriteUrl,
          spriteXPosition: t.positionX,
          spriteYPosition: t.positionY,
          spriteScale: t.scale,
          spriteTransparency: t.alpha,
          spriteRotation: t.rotation,
        });

        if (!updateRes.success) {
          console.error("Transform更新失败", updateRes);
          return undefined;
        }

        await queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", roleId] });
        return updateRes;
      }
      catch (error) {
        console.error("Transform更新请求失败", error);
        throw error;
      }
    },
    onSuccess: (res, variables) => {
      const nextAvatar: RoleAvatar = res?.data ?? {
        ...variables.currentAvatar,
        roleId: variables.roleId,
        avatarId: variables.avatarId,
        avatarUrl: variables.currentAvatar.avatarUrl,
        spriteUrl: variables.currentAvatar.spriteUrl,
        spriteXPosition: variables.transform.positionX,
        spriteYPosition: variables.transform.positionY,
        spriteScale: variables.transform.scale,
        spriteTransparency: variables.transform.alpha,
        spriteRotation: variables.transform.rotation,
      };
      upsertRoleAvatarQueryCaches(queryClient, nextAvatar, variables.roleId);
      emitWebgalAvatarUpdated({ avatarId: variables.avatarId, avatar: nextAvatar });
    },
    onError: (error) => {
      console.error("Transform update mutation failed:", error.message || error);
    },
  });
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation<ApiResultRoleAvatar | undefined, Error, { avatarUrl: string; avatarThumbUrl?: string; spriteUrl: string; roleId: number; originUrl?: string; transform?: Transform; autoApply?: boolean; autoNameFirst?: boolean; }>({
    mutationKey: ["uploadAvatar"],
    mutationFn: async ({ avatarUrl, avatarThumbUrl, spriteUrl, roleId, originUrl, transform, autoApply = true, autoNameFirst = false }) => {
      if (!avatarUrl || !roleId || !spriteUrl) {
        console.error("参数错误：avatarUrl 或 roleId 为空");
        return undefined;
      }

      const resolvedAvatarThumbUrl = avatarThumbUrl || avatarUrl;

      try {
        const res = await tuanchat.avatarController.setRoleAvatar({
          roleId: roleId,
        });

        if (!res.success || !res.data) {
          console.error("头像创建失败", res);
          return undefined;
        }

        const avatarId = res.data;

        if (avatarId) {
          // 直接使用transform参数或默认值
          const t: Transform = transform || {
            scale: 1,
            positionX: 0,
            positionY: 0,
            alpha: 1,
            rotation: 0
          };
          const uploadRes = await tuanchat.avatarController.updateRoleAvatar({
            roleId: roleId,
            avatarId,
            avatarUrl,
            avatarThumbUrl: resolvedAvatarThumbUrl,
            spriteUrl,
            originUrl,
            spriteXPosition: t.positionX,
            spriteYPosition: t.positionY,
            spriteScale: t.scale,
            spriteTransparency: t.alpha,
            spriteRotation: t.rotation,
          });
          if (!uploadRes.success) {
            console.error("头像更新失败", uploadRes);
            return undefined;
          }

          // 根据 autoApply 参数决定是否自动应用头像
          if (autoApply) {
            try {
              await tuanchat.roleController.updateRole({
                roleId: roleId,
                avatarId: avatarId,
              });
            } catch (error) {
              console.error("更新角色avatarId失败:", error);
            }
          }
          
          // 如果是首次上传且需要自动命名
          if (autoNameFirst) {
            try {
              const list = await tuanchat.avatarController.getRoleAvatars(roleId);
              const avatars = list?.data ?? [];
              
              if (avatars.length === 1) {
                const firstAvatar = avatars[0];
                const currentLabel = firstAvatar?.avatarTitle?.label;
                
                if (!currentLabel || currentLabel.trim() === "") {
                  await tuanchat.avatarController.updateRoleAvatar({
                    ...firstAvatar,
                    avatarTitle: {
                      ...firstAvatar.avatarTitle,
                      label: "默认",
                    },
                  });
                }
              }
            } catch (error) {
              console.error("首次头像自动命名失败", error);
            }
          }
          
          await queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", roleId] });
          await queryClient.invalidateQueries({ queryKey: ["roleInfinite"] });
          await queryClient.invalidateQueries({ queryKey: ["getUserRoles"] });
          await queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
          return uploadRes;
        } else {
          console.error("头像ID无效");
          return undefined;
        }
      }
      catch (error) {
        console.error("头像上传请求失败", error);
        throw error;
      }
    },
    onError: (error) => {
      console.error("Mutation failed:", error.message || error);
    },
  });
}

/**
 * 更新头像标题
 * 使用乐观更新避免整表刷新导致 UI 抖动/选中项重置
 * @param roleId 角色ID（用于缓存刷新）
 */
export function useUpdateAvatarTitleMutation(roleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateAvatarTitle"],
    mutationFn: async ({ avatarId, title, avatarsForUpdate }: { 
      avatarId: number; 
      title: string;
      avatarsForUpdate: RoleAvatar[];
    }) => {
      const targetAvatar = avatarsForUpdate.find((a: RoleAvatar) => a.avatarId === avatarId);
      if (!targetAvatar) {
        console.error("未找到要更新的头像");
        return;
      }

      const res = await tuanchat.avatarController.updateRoleAvatar({
        ...targetAvatar,
        avatarTitle: {
          ...targetAvatar.avatarTitle,
          label: title,
        },
      });

      if (res.success) {
        console.warn("更新头像名称成功");
      } else {
        console.error("更新头像名称失败");
      }
      
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["getRoleAvatars", roleId],
        exact: true,
      });
    },
  });
}

// 根据头像id获取头像
export function useRoleAvatarQuery(avatarId: number) {
  const avatarQuery = useQuery({
    queryKey: ["avatar", avatarId],
    queryFn: async (): Promise<string | undefined> => {
      try {
        const res = await tuanchat.avatarController.getRoleAvatar(avatarId);
        if (
          res.success
          && res.data !== null
        )
          return res.data?.avatarUrl;
      }
      catch (error) {
        console.error(`${avatarId} 的头像时出错`, error);
      }
    }
  })
  return avatarQuery.data;
}

// 头像查询
export function useRoleAvatars(roleId: number) {
  const roleAvatarQuery = useQuery({
    queryKey: ["roleAvatar", roleId],
    queryFn: async () => {
      try {
        const res = await tuanchat.avatarController.getRoleAvatars(roleId);
        if (
          res.success
          && Array.isArray(res.data)
          && res.data.length > 0
          && res.data[0]?.avatarUrl !== undefined
        ) {
          return res.data;
        }
        else {
          console.warn(`角色 ${roleId} 的头像数据无效或为空`);
          return undefined;
        }
      }
      catch (error) {
        console.error(`加载角色 ${roleId} 的头像时出错`, error);
        return undefined;
      }
    },
    enabled: !!roleId,
  },
  );
  return roleAvatarQuery;
}

// ==================== 头像删除 Mutation ====================
/**
 * 删除单个头像的 mutation（带乐观更新）
 * @param roleId 角色ID（用于缓存刷新）
 */
export function useDeleteRoleAvatarWithOptimisticMutation(roleId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['deleteRoleAvatarOptimistic', roleId],
    mutationFn: async (avatarId: number) => {
      const res = await tuanchat.avatarController.deleteRoleAvatar(avatarId);
      if (!res.success) {
        throw new Error("删除头像失败");
      }
      return res;
    },
    onMutate: async (avatarId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["getRoleAvatars", roleId],
      });

      // Snapshot previous value for rollback
      const previousAvatars = queryClient.getQueryData(["getRoleAvatars", roleId]);

      // Optimistically update the cache
      queryClient.setQueryData(["getRoleAvatars", roleId], (old: any) => {
        if (!old) return old;

        // Handle both direct array and wrapped response
        if (Array.isArray(old)) {
          return old.filter((a: RoleAvatar) => a.avatarId !== avatarId);
        }

        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.filter((a: RoleAvatar) => a.avatarId !== avatarId),
          };
        }

        return old;
      });

      return { previousAvatars };
    },
    onError: (err, avatarId, context) => {
      console.error("删除头像失败:", err);

      // Rollback optimistic update
      if (context?.previousAvatars) {
        queryClient.setQueryData(
          ["getRoleAvatars", roleId],
          context.previousAvatars,
        );
      }
    },
    onSuccess: () => {
      console.warn("删除头像成功");
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["getRoleAvatars", roleId],
      });

      // Also invalidate role query to ensure avatar consistency
      queryClient.invalidateQueries({
        queryKey: ["getRole", roleId],
      });

      queryClient.invalidateQueries({
        queryKey: ["getDeletedRoleAvatars", roleId],
      });
    },
  });
}

/**
 * 批量删除头像的 mutation（带乐观更新）
 * @param roleId 角色ID（用于缓存刷新）
 */
export function useBatchDeleteRoleAvatarsWithOptimisticMutation(roleId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['batchDeleteRoleAvatarsOptimistic', roleId],
    mutationFn: async (avatarIds: number[]) => {
      // Delete all avatars concurrently
      const deletePromises = avatarIds.map(avatarId =>
        tuanchat.avatarController.deleteRoleAvatar(avatarId),
      );

      const results = await Promise.allSettled(deletePromises);

      // Check for failures
      const failures = results.filter(r => r.status === "rejected");
      if (failures.length > 0) {
        throw new Error(`批量删除失败：${failures.length} 个头像删除失败`);
      }

      return results;
    },
    onMutate: async (avatarIds) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["getRoleAvatars", roleId],
      });

      // Snapshot previous value for rollback
      const previousAvatars = queryClient.getQueryData(["getRoleAvatars", roleId]);

      // Optimistically update the cache (remove all avatars at once)
      queryClient.setQueryData(["getRoleAvatars", roleId], (old: any) => {
        if (!old) return old;

        // Handle both direct array and wrapped response
        if (Array.isArray(old)) {
          return old.filter((a: RoleAvatar) => !avatarIds.includes(a.avatarId || 0));
        }

        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.filter((a: RoleAvatar) => !avatarIds.includes(a.avatarId || 0)),
          };
        }

        return old;
      });

      return { previousAvatars };
    },
    onError: (err, avatarIds, context) => {
      console.error("批量删除头像失败:", err);

      // Rollback optimistic update on failure
      if (context?.previousAvatars) {
        queryClient.setQueryData(
          ["getRoleAvatars", roleId],
          context.previousAvatars,
        );
      }
    },
    onSuccess: (_, avatarIds) => {
      console.warn(`批量删除成功：共删除 ${avatarIds.length} 个头像`);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["getRoleAvatars", roleId],
      });

      queryClient.invalidateQueries({
        queryKey: ["getRole", roleId],
      });

      queryClient.invalidateQueries({
        queryKey: ["getDeletedRoleAvatars", roleId],
      });
    },
  });
}

// ==================== 头像名称更新 Mutation ====================
/**
 * 更新头像名称的 mutation（带乐观更新）
 * @param roleId 角色ID（用于缓存刷新）
 */
export function useUpdateAvatarNameMutation(roleId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateAvatarName", roleId],
    mutationFn: async ({ avatar, name }: { avatar: RoleAvatar; name: string }) => {
      const updatedAvatar: RoleAvatar = {
        ...avatar,
        avatarTitle: {
          ...avatar.avatarTitle,
          label: name,
        },
      };

      const res = await tuanchat.avatarController.updateRoleAvatar(updatedAvatar);
      if (!res.success) {
        throw new Error("更新头像名称失败");
      }
      return res;
    },
    onMutate: async ({ avatar, name }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["getRoleAvatars", roleId],
      });

      // Snapshot previous value for rollback
      const previousAvatars = queryClient.getQueryData(["getRoleAvatars", roleId]);

      // Optimistically update the cache
      queryClient.setQueryData(["getRoleAvatars", roleId], (old: any) => {
        if (!old) return old;

        const updateAvatar = (a: RoleAvatar) => {
          if (a.avatarId === avatar.avatarId) {
            return {
              ...a,
              avatarTitle: {
                ...a.avatarTitle,
                label: name,
              },
            };
          }
          return a;
        };

        // Handle both direct array and wrapped response
        if (Array.isArray(old)) {
          return old.map(updateAvatar);
        }

        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map(updateAvatar),
          };
        }

        return old;
      });

      return { previousAvatars };
    },
    onError: (err, variables, context) => {
      console.error("更新头像名称失败:", err);

      // Rollback optimistic update
      if (context?.previousAvatars) {
        queryClient.setQueryData(
          ["getRoleAvatars", roleId],
          context.previousAvatars,
        );
      }
    },
    onSuccess: () => {
      console.warn("更新头像名称成功");
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["getRoleAvatars", roleId],
      });
    },
  });
}

// ==================== 用户角色查询 ====================
async function fetchUserRolesByTypes(userId: number, types: number[]): Promise<UserRole[]> {
  const validTypes = types.filter(t => typeof t === "number" && !Number.isNaN(t));
  const uniqueTypes = Array.from(new Set(validTypes));

  const results = await Promise.all(
    uniqueTypes.map(async (type) => {
      const res = await tuanchat.roleController.getUserRolesByType(userId, type);
      if (!res.success) {
        throw new Error(res.errMsg || "获取用户角色失败");
      }
      return res.data ?? [];
    }),
  );

  const roleMap = new Map<number, UserRole>();
  for (const list of results) {
    for (const role of list) {
      if (typeof role.roleId === "number") {
        roleMap.set(role.roleId, role);
      }
    }
  }

  /**
   * 角色页侧边栏会把“骰娘/普通角色”分组展示。
   * 但 infinite-query 分页是按列表顺序切片，若仅按 roleId 倒序，
   * 老的骰娘可能会被切到后续页面，导致用户进入角色页时看不到骰娘，必须滚动触发下一页才出现。
   *
   * 这里统一按“骰娘(1) → 普通(0) → NPC(2) → 其它”排序，再按 roleId 倒序，
   * 让首屏分页也能拿到骰娘，避免“需要下拉才加载骰娘”的体验问题。
   */
  const getTypePriority = (role: UserRole) => {
    // type: 0=角色, 1=骰娘, 2=NPC
    if (role.type === 1) return 0;
    if (role.type === 0) return 1;
    if (role.type === 2) return 2;
    return 3;
  };

  return Array.from(roleMap.values()).sort((a, b) => {
    const pa = getTypePriority(a);
    const pb = getTypePriority(b);
    if (pa !== pb) return pa - pb;
    return (b.roleId ?? 0) - (a.roleId ?? 0);
  });
}

/**
 * 获取用户所有角色
 * @param userId 用户ID
 */
export function useGetUserRolesQuery(userId: number) {
  return useQuery({
    queryKey: ['getUserRoles', userId],
    queryFn: async () => {
      const data = await fetchUserRolesByTypes(userId, [0, 1]);
      return {
        success: true,
        data,
      };
    },
    staleTime: 600000, // 10分钟缓存
    enabled: typeof userId === 'number' && !isNaN(userId) && userId > 0
  });
}

async function fetchUserRolesByType(userId: number, type: number): Promise<UserRole[]> {
  const res = await tuanchat.roleController.getUserRolesByType(userId, type);
  if (!res.success) {
    throw new Error(res.errMsg || "获取用户角色失败");
  }
  return (res.data ?? []).sort((a, b) => (b.roleId ?? 0) - (a.roleId ?? 0));
}

/**
 * 获取用户按类型的角色
 * @param userId 用户ID
 * @param type  0=角色,1=骰娘,2=NPC
 */
export function useGetUserRolesByTypeQuery(userId: number, type: number) {
  return useQuery({
    queryKey: ["getUserRolesByType", userId, type],
    queryFn: () => fetchUserRolesByType(userId, type),
    staleTime: 600000,
    enabled: typeof userId === "number" && !Number.isNaN(userId) && userId > 0,
  });
}

type RoleInfinitePageParam = {
  pageNo?: number;
  pageSize?: number;
};

/**
 * 按类型进行 Infinite Query 加载
 *
 * 注意：后端并无 type+pageNo 真分页接口，所以这里对单类型的数据做前端切片分页，
 * 但至少不会出现“骰娘被普通角色挤到后面页”的混合分页问题。
 */
export function useGetInfiniteUserRolesByTypeQuery(userId: number, type: number) {
  const PAGE_SIZE = 15;
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    queryKey: ["roleInfiniteByType", userId, type],
    queryFn: async ({ pageParam }: { pageParam: RoleInfinitePageParam }) => {
      const pageNo = pageParam.pageNo ?? 1;
      const pageSize = pageParam.pageSize ?? PAGE_SIZE;

      const allRoles = await queryClient.fetchQuery({
        queryKey: ["getUserRolesByType", userId, type],
        queryFn: () => fetchUserRolesByType(userId, type),
        staleTime: 600000,
      });

      const start = (pageNo - 1) * pageSize;
      const list = allRoles.slice(start, start + pageSize);
      const totalRecords = allRoles.length;
      const isLast = start + pageSize >= totalRecords;

      return {
        success: true,
        data: {
          pageNo,
          pageSize,
          totalRecords,
          isLast,
          list,
        },
      };
    },
    initialPageParam: { pageNo: 1, pageSize: PAGE_SIZE },
    getNextPageParam: (lastPage) => {
      if (lastPage.data?.pageNo === undefined || lastPage.data?.isLast) {
        return undefined;
      }
      return {
        pageNo: lastPage.data.pageNo + 1,
        pageSize: PAGE_SIZE,
      };
    },
    staleTime: 1000 * 60 * 10,
    enabled: typeof userId === "number" && !Number.isNaN(userId) && userId > 0,
  });
}

export function useGetUserRolesPageQuery(params: RolePageQueryRequest) {
  return useQuery({
    queryKey: ['getUserRolesPage', params],
    queryFn: () => tuanchat.roleController.getRolesByPage(params),
    staleTime: 600000
  });
}

export function useGetInfiniteUserRolesQuery(userId: number) {
  const PAGE_SIZE = 15;
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    queryKey: ["roleInfinite", userId],
    queryFn: async ({ pageParam }: { pageParam: RolePageQueryRequest }) => {
      const pageNo = pageParam.pageNo ?? 1;
      const pageSize = pageParam.pageSize ?? PAGE_SIZE;

      const allRoles = await queryClient.fetchQuery({
        queryKey: ["getUserRolesByTypes", userId, 0, 1],
        queryFn: () => fetchUserRolesByTypes(userId, [0, 1]),
        staleTime: 600000, // 10分钟缓存
      });

      const start = (pageNo - 1) * pageSize;
      const list = allRoles.slice(start, start + pageSize);
      const totalRecords = allRoles.length;
      const isLast = start + pageSize >= totalRecords;

      return {
        success: true,
        data: {
          pageNo,
          pageSize,
          totalRecords,
          isLast,
          list,
        },
      };
    },
    initialPageParam: { pageNo: 1, pageSize: PAGE_SIZE, userId: userId ?? -1 },
    getNextPageParam: (lastPage) => {
      if (lastPage.data?.pageNo === undefined || lastPage.data?.isLast) {
        return undefined;
      }
      else {
        const param: RolePageQueryRequest = {
          pageNo: lastPage.data.pageNo + 1,
          pageSize: PAGE_SIZE,
          userId: userId ?? -1,
        };
        return param;
      }
    },
    staleTime: 1000 * 60 * 10,
    enabled: typeof userId === "number" && !Number.isNaN(userId) && userId > 0,
  });
}


// 获取能力
export function useRoleAbility(roleId: number) {
  const abilityQuery = useQuery({
    queryKey: ["ability", roleId],
    queryFn: async (): Promise<ApiResultRoleAbility | undefined> => {
      try {
        const res = await tuanchat.abilityController.getRoleAbility(roleId);
        if (
          res.success
          && res.data !== null
        ) {
          console.log(res.data);
          return res;
        }
        else {
          console.warn(`角色 ${roleId} 的能力数据无效或为空`);
          return undefined;
        }
      }
      catch (error) {
        console.error(`加载角色 ${roleId} 的能力时出错`, error);
        return undefined;
      }
    },
    enabled: !!roleId,
  },
  );
  return abilityQuery;
}
