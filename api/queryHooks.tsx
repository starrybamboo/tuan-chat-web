/**
 * AI根据Service生成的hook, 使用的时候请好好检查.
 * 请不要在function外定义一个queryClient, React 上下文作用域外使用是不行的
 */
/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import {useQuery, useMutation, QueryClient, useQueryClient, useQueries} from '@tanstack/react-query';
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
import type {AbilitySetRequest} from "./models/AbilitySetRequest";
import type {AbilityUpdateRequest} from "./models/AbilityUpdateRequest";
import type { UseQueryResult } from "@tanstack/react-query";

import type {
    AbilityFieldUpdateRequest,
    ApiResultListRoleResponse,
    ApiResultRoleAbility,
    ApiResultUserInfoResponse,
    Message,
    RoleResponse,
    SpaceOwnerTransferRequest,
    FeedRequest,
    Space,
    SpaceAddRequest,
    SpaceMemberAddRequest,
    SpaceMemberDeleteRequest,
    UserInfoResponse,
    RoomUpdateRequest,
    PlayerGrantRequest,
    PlayerRevokeRequest,
    RoomRoleAddRequest,
    RoomRoleDeleteRequest,
    SpaceRoleAddRequest,
    RoomMemberAddRequest, RoomMemberDeleteRequest, SpaceUpdateRequest
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
        mutationFn: () => tuanchat.roleController.deleteRole2([roleId]),
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

// ==================== 群组管理 ====================
/**
 * 获取群成员列表
 * @param roomId 群聊ID
 */
export function useGetMemberListQuery(roomId: number) {

    return useQuery({
        queryKey: ['getMemberList', roomId],
        queryFn: () => tuanchat.roomMemberController.getMemberList1(roomId),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 新增群成员
 */
// api/queryHooks.ts
export function useAddRoomMemberMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomMemberAddRequest) => tuanchat.roomMemberController.addMember1(req),
        mutationKey: ['addMember'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey:  ["getMemberList", variables.roomId],
                exact: true
            });
        },
    });
}

/**
 * 删除群成员（批量）
 */
export function useDeleteRoomMemberMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomMemberDeleteRequest) => tuanchat.roomMemberController.deleteMember1(req),
        mutationKey: ['deleteMember'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["getMemberList", variables.roomId],
            });
        }
    });
}

/**
 * 更新群信息
 */
export function useUpdateRoomMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomUpdateRequest) => tuanchat.roomController.updateRoom(req),
        mutationKey: ['updateRoom'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getRoomInfo', variables.roomId] });
            queryClient.invalidateQueries({ queryKey: ['getUserRooms'] });
        }
    })
}

/**
 * 更新space信息
 */
export function useUpdateSpaceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceUpdateRequest) => tuanchat.spaceController.updateSpace(req),
        mutationKey: ['updateSpace'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getSpaceInfo', variables.spaceId] });
            queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
        }
    })
}

/**
 * 获取群组信息
 * @param roomId 群组ID
 */
export function useGetRoomInfoQuery(roomId: number) {
    return useQuery({
        queryKey: ['getRoomInfo', roomId],
        queryFn: () => tuanchat.roomController.getRoomInfo(roomId),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 获取Space信息
 */
export function useGetSpaceInfoQuery(spaceId: number) {
    return useQuery({
        queryKey: ['getSpaceInfo', spaceId],
        queryFn: () => tuanchat.spaceController.getSpaceInfo(spaceId),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 创建空间
 */
export function useCreateSpaceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceAddRequest) => tuanchat.spaceController.createSpace(req),
        mutationKey: ['createSpace'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
            queryClient.invalidateQueries({ queryKey: ['getUserRooms'] });
        }
    });
}

/**
 * 获取space成员
 */
export function useGetSpaceMembersQuery(spaceId: number) {
    return useQuery({
        queryKey: ['getMemberList', spaceId],
        queryFn: () => tuanchat.spaceMemberController.getMemberList(spaceId),
        staleTime: 300000, // 5分钟缓存
        enabled: spaceId > 0
    });
}

/**
 * 新增空间成员
 */
export function useAddSpaceMemberMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceMemberAddRequest) => tuanchat.spaceMemberController.addMember(req),
        mutationKey: ['addMember'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey:  ["getMemberList", variables.spaceId],
                exact: true
            });
        },
    });
}

/**
 * 删除空间成员
 */
export function useDeleteSpaceMemberMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceMemberDeleteRequest) => tuanchat.spaceMemberController.deleteMember(req),
        mutationKey: ['deleteMember'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey:  ["getMemberList", variables.spaceId],
                exact: true
            });
        },
    });
}

/**
 * 退出空间
 */
export function useExitSpaceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: number) => tuanchat.spaceMemberController.exitSpace(req),
        mutationKey: ['exitSpace'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey:  ["getMemberList", variables],
                exact: true
            });
        },
    });
}

/**
 * 获取空间中的role
 */
export function useGetSpaceRolesQuery(spaceId: number) {
    return useQuery({
        queryKey: ['spaceRole', spaceId],
        queryFn: () => tuanchat.spaceRoleController.spaceRole(spaceId),
        staleTime: 300000 // 5分钟缓存
    });
}


/**
 * 创建房间
 * @param spaceId
 */
export function useCreateRoomMutation(spaceId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomAddRequest) => tuanchat.spaceController.createRoom(req),
        mutationKey: ['createRoom'],
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['getUserRooms',spaceId] });
        },
        onError:(error) => {
          queryClient.invalidateQueries({ queryKey: ['getUserRooms',spaceId] });
        }
    });
}

/**
 * 解散群组
 */
export function useDissolveRoomMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn:(req: number) => tuanchat.roomController.dissolveRoom(req),
        mutationKey: ['dissolveRoom'],
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['getUserRooms'] });
        }
    })
}

/**
 * 解散空间
 */
export function useDissolveSpaceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: number) => tuanchat.spaceController.dissolveSpace(req),
        mutationKey: ['dissolveSpace'],
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
        }
    })
}

/**
 *
 */

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
 */
export function useMoveMessageMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: MoveMessageRequest) => tuanchat.chatController.moveMessage(req),
        mutationKey: ['moveMessage'],
        onSuccess: () => {
        }
    });
}

/**
 * 删除消息
 */
export function useDeleteMessageMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: number) => tuanchat.chatController.deleteMessage(req),
        mutationKey: ['deleteMessage'],
        onSuccess: () => {
        }
    });
}

// ==================== 权限管理 ====================
/**
 * 设置用户为玩家
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useSetPlayerMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: PlayerGrantRequest) => tuanchat.spaceMemberController.grantPlayer(req),
        mutationKey: ['setPlayer'],
        onSuccess: (_,variables) => {
            queryClient.invalidateQueries({ queryKey: ['getMemberList', variables.spaceId] });
        }
    });
}

/**
 * 撤销玩家身份
 */
export function useRevokePlayerMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: PlayerRevokeRequest) => tuanchat.spaceMemberController.revokePlayer(req),
        mutationKey: ['revokePlayer'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getMemberList', variables.spaceId] });
        }
    });
}

/**
 * 转让群主
 */
export function useTransferOwnerMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceOwnerTransferRequest) => tuanchat.spaceController.transferSpaceOwner(req),
        mutationKey: ['transferRoomOwner'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getMemberList', variables.spaceId] });
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
export function useRoomRoleQuery(roomId: number) {
    return useQuery({
        queryKey: ['roomRole', roomId],
        queryFn: () => tuanchat.roomRoleController.roomRole(roomId),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 添加群组角色
 */
export function useAddRoomRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomRoleAddRequest) => tuanchat.roomRoleController.addRole1(req),
        mutationKey: ['addRole1'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['roomRole', variables.roomId] });
        }
    });
}

/**
 * 删除群组角色
 */
export function useDeleteRole1Mutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomRoleDeleteRequest) => tuanchat.roomRoleController.deleteRole1(req),
        mutationKey: ['deleteRole1'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['roomRole', variables.roomId] });
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
// ==================== space角色管理 ====================
export function useAddSpaceRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceRoleAddRequest) => tuanchat.spaceRoleController.addRole(req),
        mutationKey: ['addRole'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getSpaceRoles', variables.spaceId] });
        }
    });
}

// ==================== 群组相关 ====================
/**
 * 获取用户加入的所有space
 */
export function useGetUserSpacesQuery() {
    return useQuery({
        queryKey: ['getUserSpaces'],
        queryFn: () => tuanchat.spaceController.getUserSpaces(),
        staleTime: 300000 // 5分钟缓存
    });
}
/**
 * 获取space下用户加入的所有群组
 */
export function useGetUserRoomsQuery(spaceId: number) {
    return useQuery({
        queryKey: ['getUserRooms',spaceId],
        queryFn: () => tuanchat.roomController.getUserRooms(spaceId),
        staleTime: 300000 ,// 5分钟缓存
        enabled: spaceId!=-1
    });
}
export function useGetUserRoomsQueries(spaces: Space[]){
    return useQueries({
        queries: spaces.map(space => ({
            queryKey: ['getUserRooms', space.spaceId],  // 保持与useGetUserRoomsQuery一致的queryKey格式
            queryFn: () => tuanchat.roomController.getUserRooms(space.spaceId ?? -1),
            staleTime: 300000, // 保持一致的5分钟缓存
            enabled: space.spaceId!=-1
        })),
    });
}

// ==================== 缓存管理 ====================
/**
 * 强制刷新用户群组列表
 */
export function refreshUserRooms() {
    const queryClient = useQueryClient();
    queryClient.invalidateQueries({ queryKey: ['getUserRooms'] });
}

/**
 * 强制刷新群组信息
 * @param roomId 群组ID
 */
export function refreshRoomInfo(roomId: number) {
    const queryClient = useQueryClient();
    queryClient.invalidateQueries({ queryKey: ['getRoomInfo', roomId] });
}

/**
 * 获取群组角色列表
 * @param roomId 群组ID
 */
export function useGetRoomRoleQuery(roomId: number) {
    return useQuery({
        queryKey: ["roomRole", roomId],
        queryFn: () => tuanchat.roomRoleController.roomRole(roomId),
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

export function useUpdateKeyFieldMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn:  (req: AbilityFieldUpdateRequest) => tuanchat.abilityController.updateRoleAbilityField(req),
        mutationKey: ["updateRoleAbilityField"],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["listRoleAbility"] });
        }
    })
}



export function useUpdateMessageMutation(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn:  (req: Message) =>tuanchat.chatController.updateMessage(req),
        mutationKey: ["updateMessage"],
    })
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

// 根据头像id获取头像
export function useRoleAvatarQuery(avatarId: number) {
  const avatarQuery = useQuery({
    queryKey: ["avatar", avatarId],
    queryFn: async (): Promise<string | undefined> => {
      try {
        const res = await tuanchat.avatarController.getRoleAvatar(avatarId);
        if (
          res.success
          && res.data!==null
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

  const initializeRoles = useCallback(async () => {
    if (roleQuery.data && Array.isArray(roleQuery.data.data)) {
      const mappedRoles = roleQuery.data.data.map((role: RoleResponse) => ({
        id: role.roleId || 0,
        name: role.roleName || "",
        description: role.description || "无描述",
        avatar: "",
        inventory: [],
        abilities: [],
        avatarId: role.avatarId || 0,
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
  }, [roleQuery.data, queryClient]);

  return { roles, initializeRoles, setRoles };
};



import type { GameRule } from '@/components/newCharacter/types';

//获取规则
export function useRuleListQuery() {
  return useQuery({
    queryKey: ["ruleList"],
    queryFn: async (): Promise<GameRule[]> => {
      const res = await tuanchat.ruleController.getRuleList();
      if (res.success && res.data) {
        // 将后端数据结构转换为前端需要的 `GameRule` 类型
        return res.data.map(rule => ({
          id: rule.ruleId || 0,
          name: rule.ruleName || "",
          description: rule.ruleDescription || "",
          performance: rule.actTemplate || {}, // 表演字段
          numerical: rule.abilityDefault || {}, // 数值约束
        }));
      }
      throw new Error('获取规则列表失败');
    }
  });
}
   
// post部分
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
 * feed
 */
export function usePublishFeedMutation(){
    return useMutation({
        mutationKey: ["publishFeed"],
        mutationFn: async (feed: FeedRequest) => {
            const res = await tuanchat.feedController.publishFeed(feed);
        }
    })
}
export function useGetFeedByIdQuery(feedId: number){
    return useQuery({
        queryKey: ["getFeedById", feedId],
        queryFn: async () => {
            const res = await tuanchat.feedController.getFeedById(feedId);
            return res.data;
        },
        staleTime: 300 * 1000
    })
}



