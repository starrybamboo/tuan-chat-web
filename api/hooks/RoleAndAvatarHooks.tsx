/**
 * AI根据Service生成的hook, 使用的时候请好好检查.
 * 请不要在function外定义一个queryClient, React 上下文作用域外使用是不行的
 * 以后这里只放通用的hooks
 */
/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QueryClient } from '@tanstack/react-query';

import { useQuery, useMutation, useQueryClient, useQueries, useInfiniteQuery } from '@tanstack/react-query';
import { tuanchat } from '../instance';


// import type { RoleAbilityTable } from '@tuanchat/openapi-client/models/RoleAbilityTable';
import type { RoleAvatar } from '@tuanchat/openapi-client/models/RoleAvatar';
import type { RoleAvatarCreateRequest } from '@tuanchat/openapi-client/models/RoleAvatarCreateRequest';
import type { SpriteTransform } from '@tuanchat/openapi-client/models/SpriteTransform';
import type { UserRegisterRequest } from '@tuanchat/openapi-client/models/UserRegisterRequest';
import type { RolePageQueryRequest } from '@tuanchat/openapi-client/models/RolePageQueryRequest'
import type { Transform } from '../../app/components/Role/sprite/TransformControl';
import type { UserRole } from '@tuanchat/openapi-client/models/UserRole';

import { emitWebgalAvatarUpdated } from "../../app/webGAL/avatarSync";

import {
  type ApiResultRoleAbility,
  type ApiResultUserRole,
  type ApiResultRoleAvatar,
  type UserInfoResponse,
  type RoleCreateRequest
} from "api";
import type { Role } from '@/components/Role/types';
import { ROLE_DEFAULT_AVATAR_URL } from '@/constants/defaultAvatar';
import { uploadMediaFile } from "@/utils/mediaUpload";
import { avatarThumbUrl as buildAvatarThumbUrl, avatarUrl as buildAvatarUrl } from "@/utils/mediaUrl";
import { shouldRetryRoleQueryError } from "@/utils/roleApiError";
import {
  optimisticRemoveUserRolesFromListQueryCache,
  rollbackUserRoleListQueryCache,
  seedUserRoleListQueryCache,
  seedUserRoleQueryCache,
} from "../roleQueryCache";
import { invalidateRoleAbilityCaches } from "./abilityMutationInvalidation";
import { invalidateRoleCreateQueries, invalidateUserRoleListQueries } from "./roleMutationInvalidation";

export const ROLE_AVATARS_STALE_TIME_MS = 86_400_000;
export const ROLE_AVATAR_STALE_TIME_MS = 86_400_000;
export const ROLE_DETAIL_STALE_TIME_MS = 600_000;
export const USER_ROLES_STALE_TIME_MS = 600_000;

export function roleQueryKey(roleId: number): readonly ["getRole", number] {
  return ["getRole", roleId];
}

async function loadRole(queryClient: QueryClient, roleId: number) {
  const res = await tuanchat.roleController.getRole(roleId);
  seedUserRoleQueryCache(queryClient, res.data);
  return res;
}

export function fetchRoleWithCache(queryClient: QueryClient, roleId: number) {
  return queryClient.fetchQuery({
    queryKey: roleQueryKey(roleId),
    queryFn: () => loadRole(queryClient, roleId),
    staleTime: ROLE_DETAIL_STALE_TIME_MS,
    retry: shouldRetryRoleQueryError,
  });
}

export function roleAvatarQueryKey(avatarId: number): readonly ["getRoleAvatar", number] {
  return ["getRoleAvatar", avatarId];
}

async function loadRoleAvatar(avatarId: number) {
  return tuanchat.avatarController.getRoleAvatar(avatarId);
}

export function fetchRoleAvatarWithCache(queryClient: QueryClient, avatarId: number) {
  return queryClient.fetchQuery({
    queryKey: roleAvatarQueryKey(avatarId),
    queryFn: () => loadRoleAvatar(avatarId),
    staleTime: ROLE_AVATAR_STALE_TIME_MS,
  });
}

export function roleAvatarsQueryKey(roleId: number): readonly ["getRoleAvatars", number] {
  return ["getRoleAvatars", roleId];
}

function setRoleAvatarDetailCache(queryClient: QueryClient, avatar: RoleAvatar): void {
  const avatarId = avatar.avatarId;
  if (!avatarId) {
    return;
  }

  queryClient.setQueryData<ApiResultRoleAvatar>(roleAvatarQueryKey(avatarId), (old: any) => ({
    success: true,
    data: {
      ...(old?.data ?? {}),
      ...avatar,
    },
  }));
}

function getRoleAvatarUrl(avatar?: Pick<RoleAvatar, "avatarFileId"> | null): string {
  return buildAvatarUrl(avatar?.avatarFileId);
}

function getRoleAvatarThumbUrl(avatar?: Pick<RoleAvatar, "avatarFileId"> | null): string {
  return buildAvatarThumbUrl(avatar?.avatarFileId);
}

function sortRoleAvatarsById<T extends { avatarId?: number }>(avatars: T[]): T[] {
  return [...avatars].sort((a, b) => {
    const aId = a.avatarId ?? Number.MAX_SAFE_INTEGER;
    const bId = b.avatarId ?? Number.MAX_SAFE_INTEGER;
    return aId - bId;
  });
}

async function loadRoleAvatars(queryClient: QueryClient, roleId: number) {
  const res = await tuanchat.avatarController.getRoleAvatars(roleId);
  if (Array.isArray(res.data)) {
    res.data.forEach((avatar) => {
      if (avatar?.avatarId) {
        seedRoleAvatarQueryCaches(queryClient, avatar, roleId);
      }
    });
    return { ...res, data: sortRoleAvatarsById(res.data) };
  }
  return res;
}

export function fetchRoleAvatarsWithCache(queryClient: QueryClient, roleId: number) {
  return queryClient.fetchQuery({
    queryKey: roleAvatarsQueryKey(roleId),
    queryFn: () => loadRoleAvatars(queryClient, roleId),
    staleTime: ROLE_AVATARS_STALE_TIME_MS,
  });
}

export function seedRoleAvatarQueryCaches(queryClient: QueryClient, avatar: RoleAvatar, roleId?: number): void {
  const avatarId = avatar.avatarId;
  const resolvedRoleId = avatar.roleId ?? roleId;
  if (!avatarId) {
    return;
  }

  if (roleId) {
    queryClient.setQueryData(["getRoleAvatars", roleId], (old: any) => {
      if (!old) {
        return old;
      }

      const upsertAvatar = (list: RoleAvatar[]) => {
        const hasAvatar = list.some(item => item.avatarId === avatarId);
        const nextList = hasAvatar
          ? list.map((item) => (item.avatarId === avatarId ? { ...item, ...avatar } : item))
          : [...list, avatar];
        return sortRoleAvatarsById(nextList);
      };

      if (Array.isArray(old)) {
        return upsertAvatar(old);
      }

      if (Array.isArray(old.data)) {
        return {
          ...old,
          data: upsertAvatar(old.data),
        };
      }

      return old;
    });
  }

  if (resolvedRoleId) {
    const avatarUrl = getRoleAvatarUrl(avatar) || ROLE_DEFAULT_AVATAR_URL;
    const avatarThumbUrl = getRoleAvatarThumbUrl(avatar) || avatarUrl;
    queryClient.setQueryData(["roleAvatar", resolvedRoleId], {
      avatar: avatarUrl,
      avatarThumb: avatarThumbUrl,
      avatarId,
    });
  }

  setRoleAvatarDetailCache(queryClient, avatar);
}

function upsertRoleAvatarQueryCaches(queryClient: QueryClient, avatar: RoleAvatar, roleId?: number): void {
  const avatarId = avatar.avatarId;
  const resolvedRoleId = avatar.roleId ?? roleId;
  if (!avatarId) {
    return;
  }

  seedRoleAvatarQueryCaches(queryClient, avatar, roleId);

  if (resolvedRoleId) {
    queryClient.invalidateQueries({ queryKey: ["roleAvatar", resolvedRoleId] });
  }

  queryClient.invalidateQueries({ queryKey: ["getRoleAvatar", avatarId] });
  queryClient.invalidateQueries({ queryKey: ["avatar", avatarId] });
}

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isSuccessfulApiResult(result: { success?: boolean } | null | undefined): boolean {
  return result?.success === true;
}

function getApiResultErrorMessage(result: { errMsg?: string } | null | undefined, fallback: string): string {
  const message = result?.errMsg?.trim();
  return message || fallback;
}

function normalizeUserRoleTypes(types: number[]): number[] {
  const validTypes = types.filter(type => typeof type === "number" && Number.isFinite(type));
  return Array.from(new Set(validTypes)).sort((a, b) => a - b);
}

export function userRolesByTypesQueryKey(userId: number, types: number[]): readonly ["getUserRolesByTypes", number, ...number[]] {
  return ["getUserRolesByTypes", userId, ...normalizeUserRoleTypes(types)] as const;
}

export async function deleteRoleAvatarWithSuccessGuard(avatarId: number) {
  const res = await tuanchat.avatarController.deleteRoleAvatar(avatarId);
  if (!isSuccessfulApiResult(res)) {
    throw new Error(getApiResultErrorMessage(res, "删除头像失败"));
  }
  return res;
}

export async function deleteRoleAvatarsWithSuccessGuard(avatarIds: number[]) {
  const results = await Promise.allSettled(
    avatarIds.map(avatarId => deleteRoleAvatarWithSuccessGuard(avatarId)),
  );
  const failures = results.filter(result => result.status === "rejected");
  if (failures.length > 0) {
    throw new Error(`批量删除失败：${failures.length} 个头像删除失败`);
  }
  return results.map((result) => {
    if (result.status === "rejected") {
      throw result.reason;
    }
    return result.value;
  });
}

function invalidateRoleAppearanceCaches(queryClient: QueryClient, roleId?: number | null, avatarId?: number | null): void {
  if (isPositiveId(roleId)) {
    queryClient.invalidateQueries({ queryKey: roleAvatarsQueryKey(roleId) });
    queryClient.invalidateQueries({ queryKey: ["getDeletedRoleAvatars", roleId] });
    queryClient.invalidateQueries({ queryKey: roleQueryKey(roleId) });
    queryClient.invalidateQueries({ queryKey: ["roleAvatar", roleId] });
    invalidateUserRoleListQueries(queryClient);
    queryClient.invalidateQueries({ queryKey: ["roomRole"] });
    queryClient.invalidateQueries({ queryKey: ["roomNpcRole"] });
  }

  if (isPositiveId(avatarId)) {
    queryClient.invalidateQueries({ queryKey: roleAvatarQueryKey(avatarId) });
    queryClient.invalidateQueries({ queryKey: ["avatar", avatarId] });
  }
}

function removeRoleAvatarCaches(queryClient: QueryClient, roleId?: number | null, avatarId?: number | null): void {
  if (isPositiveId(avatarId)) {
    queryClient.removeQueries({ queryKey: roleAvatarQueryKey(avatarId) });
    queryClient.removeQueries({ queryKey: ["avatar", avatarId] });
  }
  invalidateRoleAppearanceCaches(queryClient, roleId, avatarId);
}

function patchUserRoleRecord(role: UserRole, next: any, resolvedRoleId: number): UserRole {
  if (role.roleId !== resolvedRoleId) {
    return role;
  }

  return {
    ...role,
    roleName: next?.name ?? role.roleName,
    description: next?.description ?? role.description,
    avatarId: typeof next?.avatarId === "number" ? next.avatarId : role.avatarId,
    voiceUrl: next?.voiceUrl ?? role.voiceUrl,
    extra: next?.extra ?? role.extra,
    type: typeof next?.type === "number" ? next.type : role.type,
    diceMaiden: typeof next?.type === "number" ? next.type === 1 : role.diceMaiden,
  };
}

function patchUserRoleQueryCache(old: any, next: any, resolvedRoleId: number) {
  if (!old) {
    return old;
  }

  if (Array.isArray(old)) {
    return old.map((role: UserRole) => patchUserRoleRecord(role, next, resolvedRoleId));
  }

  if (Array.isArray(old.data)) {
    return {
      ...old,
      data: old.data.map((role: UserRole) => patchUserRoleRecord(role, next, resolvedRoleId)),
    };
  }

  return old;
}

function patchGetRoleQueryCache(old: any, next: any, resolvedRoleId: number) {
  if (!old?.data) {
    return old;
  }

  return {
    ...old,
    data: {
      ...old.data,
      roleId: resolvedRoleId,
      roleName: next?.name ?? old.data.roleName,
      description: next?.description ?? old.data.description,
      avatarId: typeof next?.avatarId === "number" ? next.avatarId : old.data.avatarId,
      voiceUrl: next?.voiceUrl ?? old.data.voiceUrl,
      extra: next?.extra ?? old.data.extra,
      type: typeof next?.type === "number" ? next.type : old.data.type,
      diceMaiden: typeof next?.type === "number" ? next.type === 1 : old.data.diceMaiden,
    },
  };
}

function patchRoleAvatarIdCaches(queryClient: QueryClient, roleId: number, avatarId: number): void {
  queryClient.setQueryData(
    roleQueryKey(roleId),
    (old: any) => patchGetRoleQueryCache(old, { avatarId }, roleId),
  );
  queryClient.setQueriesData(
    { queryKey: ["getUserRolesByType"] },
    (old: any) => patchUserRoleQueryCache(old, { avatarId }, roleId),
  );
  queryClient.setQueriesData(
    { queryKey: ["getUserRolesByTypes"] },
    (old: any) => patchUserRoleQueryCache(old, { avatarId }, roleId),
  );
  queryClient.setQueriesData(
    { queryKey: ["getUserRoles"] },
    (old: any) => patchUserRoleQueryCache(old, { avatarId }, roleId),
  );
}

function toSpriteTransformPayload(transform: Transform | undefined): SpriteTransform | undefined {
  if (!transform) {
    return undefined;
  }

  return {
    positionX: transform.positionX,
    positionY: transform.positionY,
    scale: transform.scale,
    alpha: transform.alpha,
    rotation: transform.rotation,
  };
}

// ==================== 角色管理 ====================
/**
 * 根据id获取角色
 * @param roleId 角色ID
 */
export function useGetRoleQuery(roleId: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: roleQueryKey(roleId),
    queryFn: () => loadRole(queryClient, roleId),
    staleTime: ROLE_DETAIL_STALE_TIME_MS, // 10分钟缓存
    retry: shouldRetryRoleQueryError,
    retryOnMount: false,
    refetchOnMount: false,
    enabled: typeof roleId === 'number' && !isNaN(roleId) && roleId > 0
  });
}

/**
 * 根据id批量获取角色
 */
export function useGetRolesQueries(roleIds: number[]) {
  const queryClient = useQueryClient();
  return useQueries({
    queries: roleIds.map((roleId) => ({
      queryKey: roleQueryKey(roleId),
      queryFn: () => loadRole(queryClient, roleId),
      staleTime: ROLE_DETAIL_STALE_TIME_MS, // 10分钟缓存
      retry: shouldRetryRoleQueryError,
      retryOnMount: false,
      refetchOnMount: false,
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
          voiceUrl: data.voiceUrl,
          extra: data.extra,
        });
        return updateRes;
      }
    },
    onSuccess: (result, variables) => {
      if (!isSuccessfulApiResult(result)) {
        return;
      }
      const resolvedRoleId = variables?.roleId ?? variables?.id;
      onSave(variables);
      if (resolvedRoleId) {
        queryClient.setQueryData(
          ["getRole", resolvedRoleId],
          (old: any) => patchGetRoleQueryCache(old, variables, resolvedRoleId),
        );
        queryClient.setQueriesData(
          { queryKey: ["getUserRolesByType"] },
          (old: any) => patchUserRoleQueryCache(old, variables, resolvedRoleId),
        );
        queryClient.setQueriesData(
          { queryKey: ["getUserRolesByTypes"] },
          (old: any) => patchUserRoleQueryCache(old, variables, resolvedRoleId),
        );
        queryClient.setQueriesData(
          { queryKey: ["getUserRoles"] },
          (old: any) => patchUserRoleQueryCache(old, variables, resolvedRoleId),
        );
      }
      if (resolvedRoleId && variables?.avatar) {
        queryClient.setQueryData(["roleAvatar", resolvedRoleId], {
          avatar: variables.avatar,
          avatarThumb: variables.avatarThumb || variables.avatar,
          avatarId: variables.avatarId,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["roleInfinite"] });
      if (resolvedRoleId) {
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
    onSuccess: (_, variables) => {
      invalidateRoleCreateQueries(queryClient, variables.spaceId);
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
    onMutate: async (roleIds) => {
      const snapshots = await optimisticRemoveUserRolesFromListQueryCache(queryClient, roleIds);
      return { snapshots };
    },
    onSuccess: (_, roleIds) => {
      invalidateUserRoleListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["roomRole"] });
      queryClient.invalidateQueries({ queryKey: ["roomNpcRole"] });
      roleIds.forEach((roleId) => {
        if (!isPositiveId(roleId)) {
          return;
        }
        queryClient.removeQueries({ queryKey: roleQueryKey(roleId) });
        queryClient.removeQueries({ queryKey: roleAvatarsQueryKey(roleId) });
        queryClient.removeQueries({ queryKey: ["roleAvatar", roleId] });
        void invalidateRoleAbilityCaches(queryClient, { roleId });
      });
      onSuccess?.();
    },
    onError: (error, _roleIds, context) => {
      rollbackUserRoleListQueryCache(queryClient, context?.snapshots);
      console.error("删除角色失败:", error);
    },
    onSettled: () => {
      invalidateUserRoleListQueries(queryClient);
    },
  });
}

// 复制角色：统一走后端 /role/copy（当前后端仅支持复制为骰娘）
export type TargetType = "dicer";

interface CopyRoleArgs {
  sourceRole: Role;
  targetType?: TargetType;
  newName?: string;
  newDescription?: string;
}

export function useCopyRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["copyRole"],
    mutationFn: async ({ sourceRole, targetType = "dicer", newName, newDescription }: CopyRoleArgs): Promise<Role> => {
      if (targetType !== "dicer") {
        throw new Error("后端当前仅支持复制为骰娘");
      }

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

      let avatarUrl = sourceRole.avatar || ROLE_DEFAULT_AVATAR_URL;
      let avatarThumb = sourceRole.avatarThumb || avatarUrl;
      const copiedAvatarId = copiedRole.avatarId ?? 0;
      if (copiedAvatarId > 0) {
        try {
          const avatarRes = await fetchRoleAvatarWithCache(queryClient, copiedAvatarId);
          if (avatarRes?.success && avatarRes.data) {
            seedRoleAvatarQueryCaches(queryClient, avatarRes.data, copiedRole.roleId);
            avatarUrl = getRoleAvatarUrl(avatarRes.data) || avatarUrl;
            avatarThumb = getRoleAvatarThumbUrl(avatarRes.data) || avatarUrl;
          }
        }
        catch (error) {
          console.warn("复制角色后获取头像失败", error);
        }
      }

      return {
        id: copiedRole.roleId,
        name: copiedRole.roleName || newName || sourceRole.name,
        description: copiedRole.description || newDescription || sourceRole.description || "",
        avatar: avatarUrl,
        avatarThumb,
        avatarId: copiedAvatarId,
        type: copiedRole.type,
        voiceUrl: copiedRole.voiceUrl || sourceRole.voiceUrl,
        extra: copiedRole.extra ?? sourceRole.extra,
      };
    },
    onSuccess: (newRole) => {
      // 统一失效相关查询
      invalidateUserRoleListQueries(queryClient);
      invalidateRoleAppearanceCaches(queryClient, newRole.id, newRole.avatarId);
      void invalidateRoleAbilityCaches(queryClient, { roleId: newRole.id });
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
  const queryClient = useQueryClient();
  const enabled = (options?.enabled ?? true) && typeof roleId === "number" && roleId > 0;
  return useQuery({
    queryKey: roleAvatarsQueryKey(roleId),
    queryFn: () => loadRoleAvatars(queryClient, roleId),
    staleTime: ROLE_AVATARS_STALE_TIME_MS, // 24小时缓存
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
    queryKey: roleAvatarQueryKey(avatarId),
    queryFn: () => loadRoleAvatar(avatarId),
    staleTime: ROLE_AVATAR_STALE_TIME_MS, // 24小时缓存
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
      if (!isSuccessfulApiResult(res)) {
        return;
      }
      const nextAvatar = {
        ...variables,
        ...(res?.data ?? {}),
      };
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
        upsertRoleAvatarQueryCaches(queryClient, nextAvatar, resolvedRoleId);
        setRoleAvatarDetailCache(queryClient, nextAvatar);
        emitWebgalAvatarUpdated({ avatarId: nextAvatar.avatarId, avatar: nextAvatar });
        invalidateRoleAppearanceCaches(queryClient, resolvedRoleId, nextAvatar.avatarId);
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
      invalidateRoleAppearanceCaches(queryClient, roleId);
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
    mutationFn: deleteRoleAvatarWithSuccessGuard,
    mutationKey: ['deleteRoleAvatar'],
    onSuccess: (_, avatarId) => {
      removeRoleAvatarCaches(queryClient, roleId, avatarId);
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
    mutationFn: deleteRoleAvatarsWithSuccessGuard,
    mutationKey: ['batchDeleteRoleAvatars'],
    onSuccess: (_, avatarIds) => {
      avatarIds.forEach(avatarId => removeRoleAvatarCaches(queryClient, roleId, avatarId));
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
    onSuccess: (_, avatarId) => {
      invalidateRoleAppearanceCaches(queryClient, roleId, avatarId);
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

        const newSprite = await uploadMediaFile(croppedFile);

        // 直接使用传入的transform参数或默认值
        const finalTransform: Transform = transform || {
          scale: 1,
          positionX: 0,
          positionY: 0,
          alpha: 1,
          rotation: 0
        };

        // 使用新的 spriteFileId 和 transform 参数更新头像记录
        const updateRes = await tuanchat.avatarController.updateRoleAvatar({
          ...currentAvatar,
          roleId: roleId,
          avatarId,
          spriteFileId: newSprite.fileId,
          spriteTransform: toSpriteTransformPayload(finalTransform),
        });

        if (!updateRes.success) {
          console.error("头像记录更新失败", updateRes);
          return undefined;
        }

        const nextAvatar: RoleAvatar = updateRes.data ?? {
          ...currentAvatar,
          roleId,
          avatarId,
          spriteFileId: newSprite.fileId,
          spriteTransform: toSpriteTransformPayload(finalTransform),
        };
        upsertRoleAvatarQueryCaches(queryClient, nextAvatar, roleId);
        emitWebgalAvatarUpdated({ avatarId, avatar: nextAvatar });
        invalidateRoleAppearanceCaches(queryClient, roleId, avatarId);
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

        const newAvatar = await uploadMediaFile(croppedFile);

        // 使用新的 avatarFileId 更新头像记录，保留原有立绘与 Transform。
        const updateRes = await tuanchat.avatarController.updateRoleAvatar({
          ...currentAvatar,
          roleId: roleId,
          avatarId,
          avatarFileId: newAvatar.fileId,
        });

        if (!updateRes.success) {
          console.error("头像记录更新失败", updateRes);
          return undefined;
        }

        return updateRes;
      }
      catch (error) {
        console.error("头像裁剪应用请求失败", error);
        throw error;
      }
    },
    onSuccess: (res, variables) => {
      if (!isSuccessfulApiResult(res)) {
        return;
      }
      const nextAvatar: RoleAvatar = res?.data ?? {
        ...variables.currentAvatar,
        roleId: variables.roleId,
        avatarId: variables.avatarId,
      };
      upsertRoleAvatarQueryCaches(queryClient, nextAvatar, variables.roleId);
      emitWebgalAvatarUpdated({ avatarId: variables.avatarId, avatar: nextAvatar });
      invalidateRoleAppearanceCaches(queryClient, variables.roleId, variables.avatarId);
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
          ...currentAvatar,
          roleId: roleId,
          avatarId,
          spriteTransform: toSpriteTransformPayload(t),
        });

        if (!updateRes.success) {
          console.error("Transform更新失败", updateRes);
          return undefined;
        }

        return updateRes;
      }
      catch (error) {
        console.error("Transform更新请求失败", error);
        throw error;
      }
    },
    onSuccess: (res, variables) => {
      if (!isSuccessfulApiResult(res)) {
        return;
      }
      const nextAvatar: RoleAvatar = res?.data ?? {
        ...variables.currentAvatar,
        roleId: variables.roleId,
        avatarId: variables.avatarId,
        spriteTransform: toSpriteTransformPayload(variables.transform),
      };
      upsertRoleAvatarQueryCaches(queryClient, nextAvatar, variables.roleId);
      emitWebgalAvatarUpdated({ avatarId: variables.avatarId, avatar: nextAvatar });
      invalidateRoleAppearanceCaches(queryClient, variables.roleId, variables.avatarId);
    },
    onError: (error) => {
      console.error("Transform update mutation failed:", error.message || error);
    },
  });
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation<ApiResultRoleAvatar | undefined, Error, {
    avatarFileId?: number;
    spriteFileId?: number;
    roleId: number;
    originFileId?: number;
    transform?: Transform;
    autoApply?: boolean;
    autoNameFirst?: boolean;
  }>({
    mutationKey: ["uploadAvatar"],
    mutationFn: async ({
      avatarFileId,
      spriteFileId,
      roleId,
      originFileId,
      transform,
      autoApply = true,
      autoNameFirst = false,
    }) => {
      if (!roleId) {
        console.error("参数错误：roleId 为空");
        return undefined;
      }

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
            avatarFileId,
            spriteFileId,
            originFileId,
            spriteTransform: toSpriteTransformPayload(t),
          });
          if (!uploadRes.success) {
            console.error("头像更新失败", uploadRes);
            return undefined;
          }

          // 根据 autoApply 参数决定是否自动应用头像
          if (autoApply) {
            try {
              const updateRoleRes = await tuanchat.roleController.updateRole({
                roleId: roleId,
                avatarId: avatarId,
              });
              if (isSuccessfulApiResult(updateRoleRes)) {
                patchRoleAvatarIdCaches(queryClient, roleId, avatarId);
              }
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

          const nextAvatar: RoleAvatar = uploadRes.data ?? {
            roleId,
            avatarId,
            avatarFileId,
            spriteFileId,
            originFileId,
            spriteTransform: toSpriteTransformPayload(t),
          };
          upsertRoleAvatarQueryCaches(queryClient, nextAvatar, roleId);
          emitWebgalAvatarUpdated({ avatarId, avatar: nextAvatar });
          invalidateRoleAppearanceCaches(queryClient, roleId, avatarId);
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
    onSuccess: (res, variables) => {
      if (!isSuccessfulApiResult(res)) {
        return;
      }
      const currentAvatar = variables.avatarsForUpdate.find(avatar => avatar.avatarId === variables.avatarId);
      const nextAvatar = res?.data ?? (currentAvatar
        ? {
            ...currentAvatar,
            avatarTitle: {
              ...currentAvatar.avatarTitle,
              label: variables.title,
            },
          }
        : undefined);
      if (nextAvatar) {
        upsertRoleAvatarQueryCaches(queryClient, nextAvatar, roleId);
        emitWebgalAvatarUpdated({ avatarId: variables.avatarId, avatar: nextAvatar });
      }
      queryClient.invalidateQueries({
        queryKey: ["getRoleAvatars", roleId],
        exact: true,
      });
      invalidateRoleAppearanceCaches(queryClient, roleId, variables.avatarId);
    },
  });
}

// 根据头像id获取头像
export function useRoleAvatarQuery(avatarId: number) {
  const queryClient = useQueryClient();
  const avatarQuery = useQuery({
    queryKey: ["avatar", avatarId],
    queryFn: async (): Promise<string | undefined> => {
      try {
        const res = await fetchRoleAvatarWithCache(queryClient, avatarId);
        if (
          res.success
          && res.data !== null
        )
          return getRoleAvatarUrl(res.data) || undefined;
      }
      catch (error) {
        console.error(`${avatarId} 的头像时出错`, error);
      }
    },
    staleTime: ROLE_AVATAR_STALE_TIME_MS,
    enabled: !!avatarId,
  })
  return avatarQuery.data;
}

// 头像查询
export function useRoleAvatars(roleId: number) {
  const queryClient = useQueryClient();
  const roleAvatarQuery = useQuery({
    queryKey: ["roleAvatar", roleId],
    queryFn: async () => {
      try {
        const res = await fetchRoleAvatarsWithCache(queryClient, roleId);
        if (
          res.success
          && Array.isArray(res.data)
          && res.data.length > 0
          && res.data[0]?.avatarFileId !== undefined
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
    staleTime: ROLE_AVATARS_STALE_TIME_MS,
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
    mutationFn: deleteRoleAvatarWithSuccessGuard,
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
    onSuccess: (_, avatarId) => {
      console.warn("删除头像成功");
      removeRoleAvatarCaches(queryClient, roleId, avatarId);
    },
    onSettled: (_data, _error, avatarId) => {
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
      if (avatarId) {
        queryClient.invalidateQueries({
          queryKey: roleAvatarQueryKey(avatarId),
        });
      }
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
    mutationFn: deleteRoleAvatarsWithSuccessGuard,
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
      avatarIds.forEach(avatarId => removeRoleAvatarCaches(queryClient, roleId, avatarId));
    },
    onSettled: (_data, _error, avatarIds) => {
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
      avatarIds?.forEach((avatarId) => {
        queryClient.invalidateQueries({
          queryKey: roleAvatarQueryKey(avatarId),
        });
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
    onSuccess: (_, variables) => {
      const nextAvatar: RoleAvatar = {
        ...variables.avatar,
        avatarTitle: {
          ...variables.avatar.avatarTitle,
          label: variables.name,
        },
      };
      upsertRoleAvatarQueryCaches(queryClient, nextAvatar, roleId);
      if (variables.avatar.avatarId) {
        emitWebgalAvatarUpdated({ avatarId: variables.avatar.avatarId, avatar: nextAvatar });
      }
      console.warn("更新头像名称成功");
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["getRoleAvatars", roleId],
      });
      invalidateRoleAppearanceCaches(queryClient, roleId);
    },
  });
}

// ==================== 用户角色查询 ====================
async function fetchUserRolesByTypes(userId: number, types: number[]): Promise<UserRole[]> {
  const uniqueTypes = normalizeUserRoleTypes(types);

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

async function loadUserRolesByTypes(queryClient: QueryClient, userId: number, types: number[]): Promise<UserRole[]> {
  const data = await fetchUserRolesByTypes(userId, types);
  seedUserRoleListQueryCache(queryClient, data);
  return data;
}

/**
 * 获取用户所有角色
 * @param userId 用户ID
 */
export function useGetUserRolesQuery(userId: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: userRolesByTypesQueryKey(userId, [0, 1]),
    queryFn: () => loadUserRolesByTypes(queryClient, userId, [0, 1]),
    select: data => ({
      success: true,
      data,
    }),
    staleTime: USER_ROLES_STALE_TIME_MS, // 10分钟缓存
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
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["getUserRolesByType", userId, type],
    queryFn: async () => {
      const data = await fetchUserRolesByType(userId, type);
      seedUserRoleListQueryCache(queryClient, data);
      return data;
    },
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
        queryKey: userRolesByTypesQueryKey(userId, [0, 1]),
        queryFn: () => loadUserRolesByTypes(queryClient, userId, [0, 1]),
        staleTime: USER_ROLES_STALE_TIME_MS, // 10分钟缓存
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
