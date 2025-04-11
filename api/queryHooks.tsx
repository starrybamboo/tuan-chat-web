/**
 * AI根据Service生成的hook, 使用的时候请好好检查.
 * 请不要在function外定义一个queryClient, React 上下文作用域外使用是不行的
 */
/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import {useQuery, useMutation, QueryClient, useQueryClient} from '@tanstack/react-query';
import { tuanchat } from './instance';
import type { AddRoleRequest } from './models/AddRoleRequest';
import type { AdminAddRequset } from './models/AdminAddRequset';
import type { AdminRevokeRequest } from './models/AdminRevokeRequest';
import type { ChatMessagePageRequest } from './models/ChatMessagePageRequest';
import type { ChatMessageRequest } from './models/ChatMessageRequest';
import type { DeleteRoleRequest } from './models/DeleteRoleRequest';
import type { GroupAddRequest } from './models/GroupAddRequest';
import type { MemberAddRequest } from './models/MemberAddRequest';
import type { MemberDeleteRequest } from './models/MemberDeleteRequest';
import type { MoveMessageRequest } from './models/MoveMessageRequest';
// import type { RoleAbilityTable } from './models/RoleAbilityTable';
import type { RoleAvatar } from './models/RoleAvatar';
import type { RoleAvatarCreateRequest } from './models/RoleAvatarCreateRequest';
import type { SubRoomRequest } from './models/SubRoomRequest';
import type { UserLoginRequest } from './models/UserLoginRequest';
import type { UserRegisterRequest } from './models/UserRegisterRequest';
import type { UserRole } from './models/UserRole';
import type {AbilitySetRequest} from "./models/AbilitySetRequest";
import type {AbilityUpdateRequest} from "./models/AbilityUpdateRequest";
import type { UseQueryResult } from "@tanstack/react-query";

import type {ApiResultListRoleResponse, ApiResultRoleAbility, ApiResultUserInfoResponse, Message, RoleResponse} from "api";


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
 * 创建新角色 需要更改
 */
export function useCreateRoleMutation() {
    const queryClient = useQueryClient();
    // return useMutation({
    //     mutationFn: () => tuanchat.roleController.createRole(),
    //     mutationKey: ['createRole'],
    //     onSuccess: () => {
    //         queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
    //     }
    // });
}

/**
 * 删除角色（单个角色）
 * @param roleId 要删除的角色ID
 */
export function useDeleteRoleMutation(roleId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => tuanchat.roleController.deleteRole([roleId]),
        mutationKey: ['deleteRole', roleId],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getRole', roleId] });
            queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
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
        staleTime: 600000 // 10分钟缓存
    });
}

// ==================== 群组管理 ====================
/**
 * 获取群成员列表
 * @param roomId 群聊ID
 */
export function useGetMemberListQuery(roomId: number) {

    return useQuery({
        queryKey: ['getMemberList', roomId],
        queryFn: () => tuanchat.groupMemberController.getMemberList(roomId),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 新增群成员
 */
// api/queryHooks.ts
export function useAddMemberMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: MemberAddRequest) => tuanchat.groupMemberController.addMember(req),
        mutationKey: ['addMember'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey:  ["getMemberList", variables.roomId],
                exact: true
            });
        },
    });
}
// queryClient.invalidateQueries({ queryKey: ["getMemberList", groupId] });

/**
 * 删除群成员（批量）
 */
export function useDeleteMemberMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: MemberDeleteRequest) => tuanchat.groupMemberController.deleteMember(req),
        mutationKey: ['deleteMember'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["getMemberList", variables.roomId],
            });
        }
    });
}

/**
 * 获取群组信息
 * @param groupId 群组ID
 */
export function useGetGroupInfoQuery(groupId: number) {
    return useQuery({
        queryKey: ['getGroupInfo', groupId],
        queryFn: () => tuanchat.groupController.getGroupInfo(groupId),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 创建群组
 */
export function useCreateGroupMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: GroupAddRequest) => tuanchat.groupController.createGroup(req),
        mutationKey: ['createGroup'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserGroups'] });
        }
    });
}

/**
 * 创建子群
 * @param parentRoomId 父群ID（用于缓存刷新）
 */
export function useCreateSubgroupMutation(parentRoomId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SubRoomRequest) => tuanchat.groupController.createSubgroup(req),
        mutationKey: ['createSubgroup'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getGroupInfo', parentRoomId] });
        }
    });
}

// ==================== 消息系统 ====================
/**
 * 获取群聊所有消息（实时性要求高）
 * @param roomId 群聊ID
 */
export function useGetAllMessageQuery(roomId: number) {
    return useQuery({
        queryKey: ['getAllMessage', roomId],
        queryFn: () => tuanchat.chatController.getAllMessage(roomId),
        staleTime: 0 // 实时数据不缓存
    });
}

/**
 * 发送消息（备用接口）
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useSendMessageMutation(roomId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ChatMessageRequest) => tuanchat.chatController.sendMessage(req),
        mutationKey: ['sendMessage'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getAllMessage', roomId] });
        }
    });
}

/**
 * 分页获取消息
 * @param requestBody 分页请求参数
 */
export function useGetMsgPageQuery(requestBody: ChatMessagePageRequest) {
    return useQuery({
        queryKey: ['getMsgPage', requestBody],
        queryFn: () => tuanchat.chatController.getMsgPage(requestBody),
        staleTime: 30000 // 30秒缓存
    });
}

/**
 * 移动消息位置
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useMoveMessageMutation(roomId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: MoveMessageRequest) => tuanchat.chatController.moveMessage(req),
        mutationKey: ['moveMessage'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getAllMessage', roomId] });
            queryClient.invalidateQueries({ queryKey: ['getMsgPage'] });
        }
    });
}

// ==================== 权限管理 ====================
/**
 * 设置用户为玩家
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useSetPlayerMutation(roomId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: AdminAddRequset) => tuanchat.groupMemberController.setPlayer(req),
        mutationKey: ['setPlayer'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getMemberList', roomId] });
        }
    });
}

/**
 * 撤销玩家身份
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useRevokePlayerMutation(roomId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: AdminRevokeRequest) => tuanchat.groupMemberController.revokePlayer(req),
        mutationKey: ['revokePlayer'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getMemberList', roomId] });
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
        staleTime: 86400000 // 24小时缓存
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

// ==================== 群组角色管理 ====================
/**
 * 获取群聊角色列表
 * @param roomId 群聊ID
 */
export function useGroupRoleQuery(roomId: number) {
    return useQuery({
        queryKey: ['groupRole', roomId],
        queryFn: () => tuanchat.groupRoleController.groupRole(roomId),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 添加群组角色
 */
export function useAddRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: AddRoleRequest) => tuanchat.groupRoleController.addRole(req),
        mutationKey: ['addRole'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['groupRole', variables.roomId] });
        }
    });
}

/**
 * 删除群组角色
 */
export function useDeleteRole1Mutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: DeleteRoleRequest) => tuanchat.groupRoleController.deleteRole1(req),
        mutationKey: ['deleteRole1'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['groupRole', variables.roomId] });
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

// ==================== 其他接口 ====================
/**
 * 获取用户加入的所有群组
 */
export function useGetUserGroupsQuery() {
    return useQuery({
        queryKey: ['getUserGroups'],
        queryFn: () => tuanchat.groupController.getUserGroups(),
        staleTime: 300000 // 5分钟缓存
    });
}

// ==================== 缓存管理 ====================
/**
 * 强制刷新用户群组列表
 */
export function refreshUserGroups() {
    const queryClient = useQueryClient();
    queryClient.invalidateQueries({ queryKey: ['getUserGroups'] });
}

/**
 * 强制刷新群组信息
 * @param groupId 群组ID
 */
export function refreshGroupInfo(groupId: number) {
    const queryClient = useQueryClient();
    queryClient.invalidateQueries({ queryKey: ['getGroupInfo', groupId] });
}

/**
 * 获取群组角色列表
 * @param groupId 群组ID
 */
export function useGetGroupRoleQuery(groupId: number) {
    return useQuery({
        queryKey: ["groupRole", groupId],
        queryFn: () => tuanchat.groupRoleController.groupRole(groupId),
        staleTime: 10000,
    });
}

/**
 * 获取角色所有的ability
 */
export function useGetRoleAbilitiesQuery(roleId: number) {
    return useQuery({
        queryKey: ["listRoleAbility", roleId],
        queryFn: () => tuanchat.abilityController.listRoleAbility(roleId),
        staleTime: 10000,
    });
}

/**
 * 更新能力
 * 更新指定角色的能力信息，act和ability字段不能为null或者空json
 */
export function useGetRoleAbilityQuery(abilityId: number){
    return useQuery({
        queryKey: ["getRoleAbility", abilityId],
        queryFn: () => tuanchat.abilityController.getRoleAbility(abilityId),
        staleTime: 10000,
    });
}

/**
 * 创建能力
 * 创建指定角色在指定规则下的能力信息，返回创建的能力ID，act和ability字段不能为null或者空json
 */

export function useSetRoleAbilityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: AbilitySetRequest) => tuanchat.abilityController.setRoleAbility(req),
        mutationKey: ["setRoleAbility"],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["listRoleAbility", variables.roleId] });
        },
    });
}

export function useDeleteRoleAbilityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (abilityId: number) => tuanchat.abilityController.deleteRoleAbility(abilityId),
        mutationKey: ["deleteRoleAbility"],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["listRoleAbility"] });
        }
    })
}

export function useUpdateRoleAbilityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: AbilityUpdateRequest) => tuanchat.abilityController.updateRoleAbility(req),
        mutationKey: ["updateRoleAbility"],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["listRoleAbility"] });
        }
    })
}

// upload-utils.ts

// 上传图片
export class UploadUtils {
  constructor(private readonly scene: number = 2) {}

  async upload(file: File): Promise<string> {
    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: file.name,
      scene: this.scene,
    });

    if (!ossData.data?.uploadUrl) {
      throw new Error("获取上传地址失败");
    }

    await this.executeUpload(ossData.data.uploadUrl, file);

    if (!ossData.data.downloadUrl) {
      throw new Error("获取下载地址失败");
    }
    return ossData.data.downloadUrl;
  }

  private async executeUpload(url: string, file: File): Promise<void> {
    const response = await fetch(url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
        "x-oss-acl": "public-read",
      },
    });

    if (!response.ok) {
      throw new Error(`文件传输失败: ${response.status}`);
    }
  }
}

export function useUpdateMessageMutation(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn:  (req: Message) =>tuanchat.chatController.updateMessage(req),
        mutationKey: ["updateMessage"],
    })
}




   

// 用户查询
export function useUserInfo() {
  const userQuery = useQuery({
    queryKey: ["userId"],
    queryFn: async (): Promise<ApiResultUserInfoResponse | undefined> => {
      const res = await tuanchat.userController.getUserInfo(10001);
      if (res.success === false || res.data === null) {
        console.error("用户信息获取失败或数据为空");
        return undefined; // 返回 undefined 表示获取失败
      }
      return res;
    },
  },
  );
  return userQuery;
}


// 角色查询
export function useUserRoles(userQuery: UseQueryResult<ApiResultUserInfoResponse | undefined>) {
  const roleQuery = useQuery({
    queryKey: ["userRole", userQuery.data?.data?.userId],
    queryFn: async (): Promise<ApiResultListRoleResponse | undefined> => {
      const userId = userQuery.data?.data?.userId;
      if (userId === undefined) {
        console.error("用户ID不存在，无法获取角色信息");
        return undefined;
      }
      const res = await tuanchat.roleController.getUserRoles(userId);
      if (res.success === false || res.data === null) {
        console.error("角色信息获取失败或数据为空");
        return undefined;
      }
      return res;
    },
    enabled: !!userQuery.data?.data?.userId, // 只有当 userId 存在时才启用查询
  });
  return roleQuery;
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
          && res.data!==null
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


//Warpper界面useEffect的逻辑,去掉了useEffect
import type { CharacterData } from '@/components/character/characterWrapper';
import { useCallback, useState } from 'react';
export const useCharacterInitialization = (roleQuery: any) => {
  const queryClient = useQueryClient();
  const [characters, setCharacters] = useState<CharacterData[]>([]);

  const initializeCharacters = useCallback(async () => {
    if (roleQuery.data && Array.isArray(roleQuery.data.data)) {
      const mappedCharacters = roleQuery.data.data.map((role: RoleResponse) => ({
        id: role.roleId || 0,
        name: role.roleName || "",
        age: 25,
        gender: "未知",
        profession: "",
        hometown: "",
        address: "",
        currentTime: new Date().toLocaleString(),
        health: {
          max: 100,
          current: 100,
        },
        magic: {
          max: 100,
          current: 100,
        },
        sanity: {
          max: 100,
          current: 100,
        },
        luck: 50,
        description: role.description || "无描述",
        avatar: undefined,
        currentIndex: role.avatarId || 0,
      }));

      setCharacters(mappedCharacters);

      // 异步加载每个角色的头像
      for (const character of mappedCharacters) {
        try {
          const res = await tuanchat.avatarController.getRoleAvatar(character.currentIndex);
          if (
            res.success &&
            res.data
          ) {
            const avatarUrl = res.data.avatarUrl;
            queryClient.setQueryData(["roleAvatar", character.id], avatarUrl);
            setCharacters((prevChars: any[]) =>
              prevChars.map(char =>
                char.id === character.id ? { ...char, avatar: avatarUrl } : char,
              ),
            );
          } else {
            console.warn(`角色 ${character.id} 的头像数据无效或为空`);
          }
        } catch (error) {
          console.error(`加载角色 ${character.id} 的头像时出错`, error);
        }
      }
    }
  }, [roleQuery.data, queryClient]);

  const updateCharacters = (newCharacters: CharacterData[]) => {
    setCharacters(newCharacters);
  };

  return { characters, initializeCharacters, updateCharacters };
};
   
// post部分
//删除角色
export function useDeleteRole() {
  return useMutation({
    mutationKey: ["deleteRole"],
    mutationFn: async (roleId: number[]) => {
      const res = await tuanchat.roleController.deleteRole(roleId);
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