/**
 * AI根据Service生成的hook, 使用的时候请好好检查.
 */
/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { useQuery, useMutation, QueryClient } from '@tanstack/react-query';
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
import type { RoleAbilityTable } from './models/RoleAbilityTable';
import type { RoleAvatar } from './models/RoleAvatar';
import type { RoleAvatarCreateRequest } from './models/RoleAvatarCreateRequest';
import type { SubRoomRequest } from './models/SubRoomRequest';
import type { UserLoginRequest } from './models/UserLoginRequest';
import type { UserRegisterRequest } from './models/UserRegisterRequest';
import type { UserRole } from './models/UserRole';

const queryClient = new QueryClient();

// ==================== 角色管理 ====================
/**
 * 根据id获取角色
 * @param roleId 角色ID
 */
export function useGetRoleQuery(roleId: number) {
    return useQuery({
        queryKey: ['getRole', roleId],
        queryFn: () => tuanchat.service.getRole(roleId),
        staleTime: 600000 // 10分钟缓存
    });
}

/**
 * 更新角色信息
 * @param onSuccess 可选的副作用回调
 */
export function useUpdateRoleMutation(onSuccess?: () => void) {
    return useMutation({
        mutationFn: (requestBody: UserRole) => tuanchat.service.updateRole(requestBody),
        mutationKey: ['updateRole'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getRole', variables.roleId] });
            queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
            onSuccess?.();
        }
    });
}

/**
 * 创建新角色
 */
export function useCreateRoleMutation() {
    return useMutation({
        mutationFn: () => tuanchat.service.createRole(),
        mutationKey: ['createRole'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserRoles'] });
        }
    });
}

/**
 * 删除角色（单个角色）
 * @param roleId 要删除的角色ID
 */
export function useDeleteRoleMutation(roleId: number) {
    return useMutation({
        mutationFn: () => tuanchat.service.deleteRole(roleId),
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
        mutationFn: (req: UserRegisterRequest) => tuanchat.service.register(req),
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
        mutationFn: (req: UserLoginRequest) => tuanchat.service.login(req),
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
        queryFn: () => tuanchat.service.getUserInfo(userId),
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
        queryFn: () => tuanchat.service.getMemberList(roomId),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 新增群成员
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useAddMemberMutation(roomId: number) {
    return useMutation({
        mutationFn: (req: MemberAddRequest) => tuanchat.service.addMember(req),
        mutationKey: ['addMember'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getMemberList', roomId] });
            queryClient.invalidateQueries({ queryKey: ['getGroupInfo', roomId] });
        }
    });
}

/**
 * 删除群成员（批量）
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useDeleteMemberMutation(roomId: number) {
    return useMutation({
        mutationFn: (req: MemberDeleteRequest) => tuanchat.service.deleteMember(req),
        mutationKey: ['deleteMember'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getMemberList', roomId] });
            queryClient.invalidateQueries({ queryKey: ['getGroupInfo', roomId] });
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
        queryFn: () => tuanchat.service.getGroupInfo(groupId),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 创建群组
 */
export function useCreateGroupMutation() {
    return useMutation({
        mutationFn: (req: GroupAddRequest) => tuanchat.service.createGroup(req),
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
    return useMutation({
        mutationFn: (req: SubRoomRequest) => tuanchat.service.createSubgroup(req),
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
        queryFn: () => tuanchat.service.getAllMessage(roomId),
        staleTime: 0 // 实时数据不缓存
    });
}

/**
 * 发送消息（备用接口）
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useSendMessageMutation(roomId: number) {
    return useMutation({
        mutationFn: (req: ChatMessageRequest) => tuanchat.service.sendMessage(req),
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
        queryFn: () => tuanchat.service.getMsgPage(requestBody),
        staleTime: 30000 // 30秒缓存
    });
}

/**
 * 移动消息位置
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useMoveMessageMutation(roomId: number) {
    return useMutation({
        mutationFn: (req: MoveMessageRequest) => tuanchat.service.moveMessage(req),
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
    return useMutation({
        mutationFn: (req: AdminAddRequset) => tuanchat.service.setPlayer(req),
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
    return useMutation({
        mutationFn: (req: AdminRevokeRequest) => tuanchat.service.revokePlayer(req),
        mutationKey: ['revokePlayer'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getMemberList', roomId] });
        }
    });
}

/**
 * 获取角色权限配置
 * @param roleId 角色ID
 */
export function useGetRoleAbilityQuery(roleId: number) {
    return useQuery({
        queryKey: ['getRoleAbility', roleId],
        queryFn: () => tuanchat.service.getRoleAbility(roleId),
        staleTime: 86400000 // 24小时缓存
    });
}

/**
 * 更新角色权限
 * @param roleId 关联的角色ID（用于缓存刷新）
 */
export function useSetRoleAbilityMutation(roleId: number) {
    return useMutation({
        mutationFn: (req: RoleAbilityTable) => tuanchat.service.setRoleAbility(req),
        mutationKey: ['setRoleAbility'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getRoleAbility', roleId] });
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
        queryFn: () => tuanchat.service.getRoleAvatars(roleId),
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
        queryFn: () => tuanchat.service.getRoleAvatar(avatarId),
        staleTime: 86400000 // 24小时缓存
    });
}

/**
 * 更新角色头像
 * @param roleId 关联的角色ID（用于缓存刷新）
 */
export function useUpdateRoleAvatarMutation(roleId: number) {
    return useMutation({
        mutationFn: (req: RoleAvatar) => tuanchat.service.updateRoleAvatar(req),
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
    return useMutation({
        mutationFn: (req: RoleAvatarCreateRequest) => tuanchat.service.setRoleAvatar(req),
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
    return useMutation({
        mutationFn: (avatarId: number) => tuanchat.service.deleteRoleAvatar(avatarId),
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
        queryFn: () => tuanchat.service.groupRole(roomId),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 添加群组角色
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useAddRoleMutation(roomId: number) {
    return useMutation({
        mutationFn: (req: AddRoleRequest) => tuanchat.service.addRole(req),
        mutationKey: ['addRole'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groupRole', roomId] });
        }
    });
}

/**
 * 删除群组角色
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useDeleteRole1Mutation(roomId: number) {
    return useMutation({
        mutationFn: (req: DeleteRoleRequest) => tuanchat.service.deleteRole1(req),
        mutationKey: ['deleteRole1'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groupRole', roomId] });
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
        queryFn: () => tuanchat.service.getUserRoles(userId),
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
        queryFn: () => tuanchat.service.getUserGroups(),
        staleTime: 300000 // 5分钟缓存
    });
}

// ==================== 缓存管理 ====================
/**
 * 强制刷新用户群组列表
 */
export function refreshUserGroups() {
    queryClient.invalidateQueries({ queryKey: ['getUserGroups'] });
}

/**
 * 强制刷新群组信息
 * @param groupId 群组ID
 */
export function refreshGroupInfo(groupId: number) {
    queryClient.invalidateQueries({ queryKey: ['getGroupInfo', groupId] });
}

/**
 * 获取群组角色列表
 * @param groupId 群组ID
 */
export function useGetGroupRoleQuery(groupId: number) {
    return useQuery({
        queryKey: ["groupRole", groupId],
        queryFn: () => tuanchat.service.groupRole(groupId),
        staleTime: 10000,
    });
}