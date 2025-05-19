/**
 * AI根据Service生成的hook, 使用的时候请好好检查.
 * 请不要在function外定义一个queryClient, React 上下文作用域外使用是不行的
 * 以后这里只放通用的hooks
 */
/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { useQuery, useMutation, QueryClient, useQueryClient, useQueries, useInfiniteQuery } from '@tanstack/react-query';
import { tuanchat } from './instance';

import type { ChatMessagePageRequest } from './models/ChatMessagePageRequest';
import type { ChatMessageRequest } from './models/ChatMessageRequest';
import type { RoomAddRequest } from './models/RoomAddRequest';

import type { MoveMessageRequest } from './models/MoveMessageRequest';
// import type { RoleAbilityTable } from './models/RoleAbilityTable';
import type { RoleAvatar } from './models/RoleAvatar';
import type { RoleAvatarCreateRequest } from './models/RoleAvatarCreateRequest';
import type { UserLoginRequest } from './models/UserLoginRequest';
import type { UserRegisterRequest } from './models/UserRegisterRequest';
import type { UserRole } from './models/UserRole';
import type { AbilitySetRequest } from "./models/AbilitySetRequest";
import type { AbilityUpdateRequest } from "./models/AbilityUpdateRequest";
import type { UseQueryResult } from "@tanstack/react-query";

import {
  type AbilityFieldUpdateRequest,
  type ApiResultListRoleResponse,
  type ApiResultRoleAbility,
  type ApiResultUserInfoResponse,
  type Message,
  type RoleResponse,
  type SpaceOwnerTransferRequest,
  type FeedRequest,
  type Space,
  type SpaceAddRequest,
  type SpaceMemberAddRequest,
  type SpaceMemberDeleteRequest,
  type UserInfoResponse,
  type RoomUpdateRequest,
  type PlayerGrantRequest,
  type PlayerRevokeRequest,
  type RoomRoleAddRequest,
  type RoomRoleDeleteRequest,
  type SpaceRoleAddRequest,
  type RoomMemberAddRequest,
  type RoomMemberDeleteRequest,
  type SpaceUpdateRequest,
  type LikeRecordRequest,
  LikeRecordControllerService, type CommentPageRequest, type CommentAddRequest
} from "api";

// ==================== 角色管理 ====================
/**
 * 根据id获取角色
 * @param roleId 角色ID
 */
export function useGetRoleQuery(roleId: number) {
  return useQuery({
    queryKey: ['getRole', roleId],
    queryFn: () => tuanchat.roleController.getRole(roleId),
    staleTime: 600000 // 10分钟缓存
  });
}

/**
 * 更新角色信息
 * @param onSuccess 可选的副作用回调
 */
export function useUpdateRoleMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestBody: UserRole) => tuanchat.roleController.updateRole(requestBody),
    mutationKey: ['updateRole'],
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['getRole', variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
      onSuccess?.();
    }
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
    mutationFn: async () => {
      const res = await tuanchat.roleController.createRole({});
      if (res.success) {
        console.warn("角色创建成功");
        return res.data;
      }
      else {
        console.error("创建角色失败");
      }
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
    },
  });
}

/**
 * 删除角色（单个角色）
 * @param roleId 要删除的角色ID
 */
export function useDeleteRoleMutation(roleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tuanchat.roleController.deleteRole2([roleId]),
    mutationKey: ['deleteRole', roleId],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getRole', roleId] });
      queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
    }
  });
}

/**
 * 删除角色的hook
 * @param onSuccess 删除成功的回调函数
 * @returns 删除角色的mutation对象
 */
export function useDeleteRolesMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ["deleteRoles"],
    mutationFn: async (roleIds: number[]) => {
      const res = await tuanchat.roleController.deleteRole2(roleIds);
      if (!res.success) {
        throw new Error("删除角色失败");
      }
      return res;
    },
    onError: (error) => {
      console.error("删除角色失败:", error);
    }
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

/**
 * 用户登录
 * @param onSuccess 登录成功回调
 */
export function useLoginMutation(onSuccess?: () => void) {
  return useMutation({
    mutationFn: (req: UserLoginRequest) => tuanchat.userController.login(req),
    mutationKey: ['login'],
    onSuccess: () => {
      onSuccess?.();
    }
  });
}

/**
 * 获取用户信息
 * @param userId 用户ID
 */
export function useGetUserInfoQuery(userId: number) {
  return useQuery({
    queryKey: ['getUserInfo', userId],
    queryFn: () => tuanchat.userController.getUserInfo(userId),
    staleTime: 600000, // 10分钟缓存
    enabled: userId > 0
  });
}

/**
 * 修改用户信息
 */
export function useUpdateUserInfoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: UserInfoResponse) => tuanchat.userController.updateUserInfo(req),
    mutationKey: ['updateUserInfo'],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getUserInfo'] });
    }
  });
}


// ==================== 头像系统 ====================
/**
 * 获取角色所有头像
 * @param roleId 角色ID
 */
export function useGetRoleAvatarsQuery(roleId: number) {
  return useQuery({
    queryKey: ['getRoleAvatars', roleId],
    queryFn: () => tuanchat.avatarController.getRoleAvatars(roleId),
    staleTime: 86400000 // 24小时缓存
  });
}

/**
 * 获取单个头像详情
 * @param avatarId 头像ID
 */
export function useGetRoleAvatarQuery(avatarId: number) {
  return useQuery({
    queryKey: ['getRoleAvatar', avatarId],
    queryFn: () => tuanchat.avatarController.getRoleAvatar(avatarId),
    staleTime: 86400000, // 24小时缓存
    enabled: Boolean(avatarId) // 仅在avatarId存在时启用查询
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getRoleAvatars', roleId] });
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
 * 删除角色头像
 * @param roleId 关联的角色ID（用于缓存刷新）
 */
export function useDeleteRoleAvatarMutation(roleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (avatarId: number) => tuanchat.avatarController.deleteRoleAvatar(avatarId),
    mutationKey: ['deleteRoleAvatar'],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getRoleAvatars', roleId] });
    }
  });
}

// ==================== 用户角色查询 ====================
/**
 * 获取用户所有角色
 * @param userId 用户ID
 */
export function useGetUserRolesQuery(userId: number) {
  return useQuery({
    queryKey: ['getUserRoles', userId],
    queryFn: () => tuanchat.roleController.getUserRoles(userId),
    staleTime: 600000 // 10分钟缓存
  });
}


// 头像查询
export function useRoleAvaters(roleId: number) {
  const roleAvatarQuery = useQuery({
    queryKey: ["roleAvatar", roleId],
    queryFn: async (): Promise<string | undefined> => {
      try {
        const res = await tuanchat.avatarController.getRoleAvatars(roleId);
        if (
          res.success
          && Array.isArray(res.data)
          && res.data.length > 0
          && res.data[0]?.avatarUrl !== undefined
        ) {
          return res.data[0].avatarUrl as string;
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


//Warpper界面useEffect的逻辑,去掉了useEffect
import type { Role } from '@/components/newCharacter/types';
import { useCallback, useState } from 'react';
export const useRolesInitialization = (roleQuery: any) => {
  const queryClient = useQueryClient();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const initializeRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      if (roleQuery?.data && Array.isArray(roleQuery.data.data)) {
        const mappedRoles = roleQuery.data.data.map((role: RoleResponse) => ({
          id: role.roleId || 0,
          name: role.roleName || "",
          description: role.description || "无描述",
          avatar: "",
          avatarId: role.avatarId || 0,
          modelName: role.modelName || "",
          speakerName: role.speakerName || "",
        }));

        setRoles(mappedRoles);

        // 异步加载每个角色的头像
        for (const Roles of mappedRoles) {
          try {
            const res = await tuanchat.avatarController.getRoleAvatar(Roles.avatarId);
            if (
              res.success &&
              res.data
            ) {
              const avatarUrl = res.data.avatarUrl;
              queryClient.setQueryData(["roleAvatar", Roles.id], avatarUrl);
              setRoles((prevChars: any[]) =>
                prevChars.map(char =>
                  char.id === Roles.id ? { ...char, avatar: avatarUrl } : char,
                ),
              );
            } else {
              console.warn(`角色 ${Roles.id} 的头像数据无效或为空`);
            }
          } catch (error) {
            console.error(`加载角色 ${Roles.id} 的头像时出错`, error);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [roleQuery?.data, queryClient]);

  return { roles, initializeRoles, setRoles, isLoading };
};



//删除角色
export function useDeleteRole() {
  return useMutation({
    mutationKey: ["deleteRole"],
    mutationFn: async (roleId: number[]) => {
      const res = await tuanchat.roleController.deleteRole2(roleId);
      if (res.success) {
        console.warn("角色删除成功");
        return res;
      }
      else {
        console.error("删除角色失败");
        return undefined;
      }
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
    },
  });
}


/**
 * 上传头像
 * @param roleId 角色ID
 */
export function useUploadAvatarMutation(roleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["uploadAvatar"],
    mutationFn: async ({ avatarUrl, spriteUrl }: { avatarUrl: string; spriteUrl: string }) => {
      if (!avatarUrl || !roleId || !spriteUrl) {
        console.error("参数错误：avatarUrl 或 roleId 为空");
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
          const uploadRes = await tuanchat.avatarController.updateRoleAvatar({
            roleId: roleId,
            avatarId,
            avatarUrl,
            spriteUrl,
          });

          if (!uploadRes.success) {
            console.error("头像更新失败", uploadRes);
            return undefined;
          }

          console.warn("头像上传成功");
          await queryClient.invalidateQueries({ queryKey: ["roleAvatar", roleId] });
          return uploadRes;
        }
        else {
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
