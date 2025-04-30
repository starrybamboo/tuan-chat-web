import {useMutation, useQueries, useQuery, useQueryClient} from "@tanstack/react-query";
import {tuanchat} from "../instance";
import type {RoomAddRequest} from "../models/RoomAddRequest";
import type {SpaceMemberDeleteRequest} from "../models/SpaceMemberDeleteRequest";
import type {SpaceMemberAddRequest} from "../models/SpaceMemberAddRequest";
import type {SpaceAddRequest} from "../models/SpaceAddRequest";
import type {SpaceOwnerTransferRequest} from "../models/SpaceOwnerTransferRequest";
import type {PlayerRevokeRequest} from "../models/PlayerRevokeRequest";
import type {PlayerGrantRequest} from "../models/PlayerGrantRequest";
import type {MoveMessageRequest} from "../models/MoveMessageRequest";
import type {ChatMessagePageRequest} from "../models/ChatMessagePageRequest";
import type {ChatMessageRequest} from "../models/ChatMessageRequest";
import type {RoomRoleDeleteRequest} from "../models/RoomRoleDeleteRequest";
import type {RoomRoleAddRequest} from "../models/RoomRoleAddRequest";
import type {Space} from "../models/Space";
import type {RoomMemberAddRequest} from "../models/RoomMemberAddRequest";
import type {RoomMemberDeleteRequest} from "../models/RoomMemberDeleteRequest";
import type {RoomUpdateRequest} from "../models/RoomUpdateRequest";
import type {SpaceUpdateRequest} from "../models/SpaceUpdateRequest";
import type {Message} from "../models/Message";
import type {SpaceRoleAddRequest} from "../models/SpaceRoleAddRequest";

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
        queryKey: ['getSpaceMemberList', spaceId],
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
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList',variables.spaceId]})
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList']});
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
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList',variables.spaceId]})
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList']});
        },
    });
}

// ==================== 群组管理 ====================
/**
 * 获取群成员列表
 * @param roomId 群聊ID
 */
export function useGetMemberListQuery(roomId: number) {

    return useQuery({
        queryKey: ['getRoomMemberList', roomId],
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
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList']})
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList']});
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
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList']})
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList']});
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
 * 退出空间
 */
export function useExitSpaceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: number) => tuanchat.spaceMemberController.exitSpace(req),
        mutationKey: ['exitSpace'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList', variables] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
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

export function useUpdateMessageMutation(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn:  (req: Message) =>tuanchat.chatController.updateMessage(req),
        mutationKey: ["updateMessage"],
    })
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
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList', variables.spaceId] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
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
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList', variables.spaceId] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
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
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList', variables.spaceId] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
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

// ==================== space相关 ====================
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
 * space角色管理
 */
export function useAddSpaceRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceRoleAddRequest) => tuanchat.spaceRoleController.addRole(req),
        mutationKey: ['addRole'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ['getSpaceRoles', variables.spaceId]});
        }
    });
}

/**
 * 获取单条message
 */
export function useGetMessageByIdQuery(messageId: number){
    return useQuery({
        queryKey: ["getMessageById", messageId],
        queryFn: async () => {
            const res = await tuanchat.chatController.getMessageById(messageId);
            return res.data;
        },
        staleTime: 300 * 1000,
        enabled: messageId > 0
    })
}