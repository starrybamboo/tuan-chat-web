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
import { tuanchat } from './instance';


// import type { RoleAbilityTable } from './models/RoleAbilityTable';
import type { RoleAvatar } from './models/RoleAvatar';
import type { RoleAvatarCreateRequest } from './models/RoleAvatarCreateRequest';
import type { UserLoginRequest } from './models/UserLoginRequest';
import type { UserRegisterRequest } from './models/UserRegisterRequest';
import type { RolePageQueryRequest } from './models/RolePageQueryRequest'
import type { Transform } from '../app/components/newCharacter/sprite/TransformControl';

import {
  type ApiResultRoleAbility,
  type ApiResultRoleAvatar,
  type UserInfoResponse,
  type RoleCreateRequest
} from "api";
import type { Role } from '@/components/newCharacter/types';

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
    enabled: roleId > 0
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
      enabled: roleId > 0
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
        });
        return updateRes;
      }
    },
    onSuccess: (_, variables) => {
      onSave(variables);
      queryClient.invalidateQueries({ queryKey: ["roleInfinite"] });
      queryClient.invalidateQueries({ queryKey: ['getRole', variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
      queryClient.invalidateQueries({ queryKey: ['getRoleAvatars', variables.roleId] });
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
      queryClient.invalidateQueries({ queryKey: ['getRole'] });
      queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
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
// export function useDeleteRoleMutation(roleId: number) {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: () => tuanchat.roleController.deleteRole2([roleId]),
//     mutationKey: ['deleteRole', roleId],
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["roleInfinite"] });
//       queryClient.invalidateQueries({ queryKey: ['getRole', roleId] });
//       queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
//     }
//   });
// }

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
      queryClient.invalidateQueries({ queryKey: ['getRole'] });
      queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
      queryClient.invalidateQueries({ queryKey: ["roomRole"] });
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
export function useDeleteRoleAvatarMutation(roleId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (avatarId: number) => tuanchat.avatarController.deleteRoleAvatar(avatarId),
    mutationKey: ['deleteRoleAvatar'],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getRoleAvatars', roleId] });
    }
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
        const { UploadUtils } = await import('../app/utils/UploadUtils');
        const uploadUtils = new UploadUtils();
        const newSpriteUrl = await uploadUtils.uploadImg(croppedFile, 3, 0.9, 2560);

        console.log("图片上传成功，新URL:", newSpriteUrl);

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

        console.log("裁剪应用成功，头像记录已更新");
        await queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", roleId] });
        console.log("缓存已刷新，roleId:", roleId);
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
        const { UploadUtils } = await import('../app/utils/UploadUtils');
        const uploadUtils = new UploadUtils();
        const newAvatarUrl = await uploadUtils.uploadImg(croppedFile, 2, 0.9, 2560);

        console.log("头像图片上传成功，新URL:", newAvatarUrl);
        
        // 使用新的avatarUrl更新头像记录，保持原有的spriteUrl和Transform参数
        const updateRes = await tuanchat.avatarController.updateRoleAvatar({
          roleId: roleId,
          avatarId,
          avatarUrl: newAvatarUrl, // 使用新的avatarUrl
        });

        if (!updateRes.success) {
          console.error("头像记录更新失败", updateRes);
          return undefined;
        }

        console.log("头像裁剪应用成功，头像记录已更新");
        await queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", roleId] });
        console.log("缓存已刷新，roleId:", roleId);
        return updateRes;
      }
      catch (error) {
        console.error("头像裁剪应用请求失败", error);
        throw error;
      }
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

        console.log("Transform更新成功");
        await queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", roleId] });
        console.log("缓存已刷新，roleId:", roleId);
        return updateRes;
      }
      catch (error) {
        console.error("Transform更新请求失败", error);
        throw error;
      }
    },
    onError: (error) => {
      console.error("Transform update mutation failed:", error.message || error);
    },
  });
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation<ApiResultRoleAvatar | undefined, Error, { avatarUrl: string; spriteUrl: string; roleId: number; transform?: Transform; }>({
    mutationKey: ["uploadAvatar"],
    mutationFn: async ({ avatarUrl, spriteUrl, roleId, transform }) => {
      if (!avatarUrl || !roleId || !spriteUrl) {
        console.error("参数错误：avatarUrl 或 roleId 为空");
        return undefined;
      }

      console.log("useUploadAvatarMutation: 开始上传", {
        hasTransform: !!transform,
        roleId,
        avatarUrl: avatarUrl.substring(0, 50) + "...",
        spriteUrl: spriteUrl.substring(0, 50) + "..."
      });

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
            spriteUrl,
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
          console.warn("头像上传成功，包含Transform参数");
          await queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", roleId] });
          console.log("缓存已刷新，roleId:", roleId);
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

export function useUpdateAvatarTitleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateAvatarTitle"],
    mutationFn: async ({ avatarId, avatarTitle, roleId }: { avatarId: number; avatarTitle: Record<string,string>; roleId: number }) => {
      if (!avatarId || !avatarTitle) {
        console.error("参数错误：avatarId 或 title 为空");
        return undefined;
      }
      try {
        const res = await tuanchat.avatarController.updateRoleAvatar({ avatarId, avatarTitle })
      }
      catch (error) {
        console.error("更新头像标题请求失败", error);
        throw error;
      }
    },
    // 乐观更新，避免整表刷新导致 UI 抖动/选中项重置
    onMutate: async (variables) => {
      const { roleId, avatarId, avatarTitle } = variables as { roleId: number; avatarId: number; avatarTitle: Record<string, string> };
      const key = ["getRoleAvatars", roleId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (oldData: any) => {
        if (!oldData) return oldData;
        // 兼容两种返回结构：直接数组 或 { data: [] }
        if (Array.isArray(oldData)) {
          return oldData.map((a: any) => (a?.avatarId === avatarId ? { ...a, avatarTitle } : a));
        }
        const arr = Array.isArray(oldData?.data) ? oldData.data : null;
        if (!arr) return oldData;
        const nextArr = arr.map((a: any) => (a?.avatarId === avatarId ? { ...a, avatarTitle } : a));
        return { ...oldData, data: nextArr };
      });
      return { previous, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.key) {
        queryClient.setQueryData(context.key as any, context.previous);
      }
    },
    // 保持当前缓存，不立刻触发 refetch，避免选中项重置
    onSuccess: () => {},
  })
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

export function useGetUserRolesPageQuery(params: RolePageQueryRequest) {
  return useQuery({
    queryKey: ['getUserRolesPage', params],
    queryFn: () => tuanchat.roleController.getRolesByPage(params),
    staleTime: 600000
  });
}

export function useGetInfiniteUserRolesQuery(userId: number) {
  const PAGE_SIZE = 15;
  return useInfiniteQuery({
    queryKey: ["roleInfinite", userId],
    queryFn: async ({ pageParam }: { pageParam: RolePageQueryRequest }) => {
      const res = await tuanchat.roleController.getRolesByPage(pageParam);
      console.log(res);
      return res;
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



