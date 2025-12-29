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

import {
  type ApiResultRoleAbility,
  type ApiResultRoleAvatar,
  type UserInfoResponse,
  type RoleCreateRequest
} from "api";
import type { Role } from '@/components/Role/types';

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
      const isSameType = sourceRole.type === (targetType === "dicer" ? 1 : 0);

      // 1. 创建新角色
      const createRes = await tuanchat.roleController.createRole({
        roleName: newName,
        description: newDescription,
        type: targetType === "dicer" ? 1 : 0,
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
        type: targetType === "dicer" ? 1 : 0,
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
        const { UploadUtils } = await import('../../app/utils/UploadUtils');
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
        const { UploadUtils } = await import('../../app/utils/UploadUtils');
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
  return useMutation<ApiResultRoleAvatar | undefined, Error, { avatarUrl: string; spriteUrl: string; roleId: number; transform?: Transform; autoApply?: boolean; autoNameFirst?: boolean; }>({
    mutationKey: ["uploadAvatar"],
    mutationFn: async ({ avatarUrl, spriteUrl, roleId, transform, autoApply = true, autoNameFirst = false }) => {
      if (!avatarUrl || !roleId || !spriteUrl) {
        console.error("参数错误：avatarUrl 或 roleId 为空");
        return undefined;
      }

      console.log("useUploadAvatarMutation: 开始上传", {
        hasTransform: !!transform,
        roleId,
        autoApply,
        autoNameFirst,
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
          
          // 根据 autoApply 参数决定是否自动应用头像
          if (autoApply) {
            try {
              await tuanchat.roleController.updateRole({
                roleId: roleId,
                avatarId: avatarId,
              });
              console.log("角色avatarId已自动更新:", { roleId, avatarId });
            } catch (error) {
              console.error("更新角色avatarId失败:", error);
            }
          } else {
            console.log("跳过自动应用头像 (autoApply=false)");
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
                  console.log("首次头像自动命名为'默认'");
                }
              }
            } catch (error) {
              console.error("首次头像自动命名失败", error);
            }
          }
          
          await queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", roleId] });
          await queryClient.invalidateQueries({ queryKey: ["roleInfinite"] });
          await queryClient.invalidateQueries({ queryKey: ["getUserRoles"] });
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
/**
 * 获取用户所有角色
 * @param userId 用户ID
 */
export function useGetUserRolesQuery(userId: number) {
  return useQuery({
    queryKey: ['getUserRoles', userId],
    queryFn: () => tuanchat.roleController.getUserRoles(userId),
    staleTime: 600000, // 10分钟缓存
    enabled: typeof userId === 'number' && !isNaN(userId) && userId > 0
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

