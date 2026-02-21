import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type { RoomAddRequest } from "../models/RoomAddRequest";
import type { SpaceMemberDeleteRequest } from "../models/SpaceMemberDeleteRequest";
import type { SpaceMemberAddRequest } from "../models/SpaceMemberAddRequest";
import type { SpaceAddRequest } from "../models/SpaceAddRequest";
import type { SpaceOwnerTransferRequest } from "../models/SpaceOwnerTransferRequest";
import type { PlayerRevokeRequest } from "../models/PlayerRevokeRequest";
import type { PlayerGrantRequest } from "../models/PlayerGrantRequest";
import type { ChatMessagePageRequest } from "../models/ChatMessagePageRequest";
import type { ChatMessageRequest } from "../models/ChatMessageRequest";
import type { RoomRoleDeleteRequest } from "../models/RoomRoleDeleteRequest";
import type { RoomRoleAddRequest } from "../models/RoomRoleAddRequest";
import type { Space } from "../models/Space";
import type { RoomMemberAddRequest } from "../models/RoomMemberAddRequest";
import type { RoomMemberDeleteRequest } from "../models/RoomMemberDeleteRequest";
import type { RoomUpdateRequest } from "../models/RoomUpdateRequest";
import type { SpaceUpdateRequest } from "../models/SpaceUpdateRequest";
import type { Message } from "../models/Message";
import type { RoomExtraRequest } from "../models/RoomExtraRequest";
import type { RoomExtraSetRequest } from "../models/RoomExtraSetRequest";
import type { SpaceExtraSetRequest } from "../models/SpaceExtraSetRequest";
import type { SpaceRole } from "../models/SpaceRole";
import type { UserRole } from "../models/UserRole";
import type { SpaceArchiveRequest } from "api/models/SpaceArchiveRequest";
import type { LeaderTransferRequest } from "api/models/LeaderTransferRequest";
import type {HistoryMessageRequest} from "../models/HistoryMessageRequest";
import type {MessageBySyncIdRequest} from "../models/MessageBySyncIdRequest";

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
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
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
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList', variables.spaceId] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
        },
    });
}

/**
 * 生成空间邀请码
 */
export function useSpaceInviteCodeQuery(spaceId: number, type: number = 0, duration?: number) {
    return useQuery({
        queryKey: ['inviteCode', spaceId, type, duration ?? null],
        queryFn: () => tuanchat.spaceMemberController.inviteCode(spaceId, type, duration),
        enabled: spaceId > 0
    });
}

/**
 * 通过邀请链接加入空间
 */
export function useSpaceInvitedMutation(code: string) {
    return useMutation({
        mutationKey: ['spaceInvited', code],
        mutationFn:() => tuanchat.spaceMemberController.invited(code)
    })
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
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList',variables.spaceId] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
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
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList'] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList', variables.roomId]});
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
        },
    });
}

/**
 * 删除群成员（批量删除）
 */
export function useDeleteRoomMemberMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomMemberDeleteRequest) => tuanchat.roomMemberController.deleteMember1(req),
        mutationKey: ['deleteMember'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList'] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList', variables.roomId] });
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
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
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
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
        staleTime: 300000, // 5分钟缓存
        enabled: spaceId >= 0
    });
}

/**
 * 设置空间 extra 字段
 */
export function useSetSpaceExtraMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceExtraSetRequest) => tuanchat.spaceController.setSpaceExtra(req),
        mutationKey: ['setSpaceExtra'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getSpaceInfo', variables.spaceId] });
        }
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
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList'] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
            queryClient.invalidateQueries({ queryKey: ['getUserRooms'] });
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
        },
    });
}

/**
 * 获取空间中的role
 */
function useGetSpaceRolesQuery(spaceId: number) {
    return useQuery({
        queryKey: ['spaceRole', spaceId],
        queryFn: () => tuanchat.spaceRepositoryController.spaceRole(spaceId),
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
            queryClient.invalidateQueries({ queryKey: ['getUserRooms', spaceId] });
            // 新房间默认开启订阅：创建后需要立刻刷新会话列表，否则 UI 会在缓存期内误判为“未订阅”。
            queryClient.invalidateQueries({ queryKey: ['getUserSessions'] });
        },
    });
}

/**
 * 解散群组
 */
export function useDissolveRoomMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: number) => tuanchat.roomController.dissolveRoom(req),
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
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
        }
    })
}

/**
 * 更新空间归档状态
 */
export function useUpdateSpaceArchiveStatusMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceArchiveRequest) => tuanchat.spaceController.updateSpaceArchiveStatus(req),
        mutationKey: ['updateSpaceArchiveStatus'],
        onSuccess: () => {
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList'] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
        }
    });
}

// ==================== 消息系统 ====================
/**
 * 获取群聊所有消息（实时性要求高）
 * @param roomId 群聊ID
 */
function useGetAllMessageQuery(roomId: number) {
    return useQuery({
        queryKey: ['getAllMessage', roomId],
        queryFn: () => tuanchat.chatController.getAllMessage(roomId),
        staleTime: 0 // 实时数据不缓存
    });
}

/**
 * 发消息（备用接口）
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useSendMessageMutation(roomId: number) {
    return useMutation({
        mutationFn: (req: ChatMessageRequest) => tuanchat.chatController.sendMessage1(req),
        mutationKey: ['sendMessage'],
    });
}

/**
 * 分页获取消息
 * @param requestBody 分页请求参数
 */
function useGetMsgPageQuery(requestBody: ChatMessagePageRequest) {
    return useQuery({
        queryKey: ['getMsgPage', requestBody],
        queryFn: () => tuanchat.chatController.getMsgPage(requestBody),
        staleTime: 30000 // 30秒缓存
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

export function useUpdateMessageMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: Message) => tuanchat.chatController.updateMessage(req),
        mutationKey: ["updateMessage"],
    })
}

/**
 * 根据syncId获取单条消息
 * 用于在收到syncId间隔的消息时，重新获取缺失的消息
 * @param requestBody 请求参数
 */
function useGetMessageBySyncIdQuery(requestBody: MessageBySyncIdRequest) {
    return useQuery({
        queryKey: ['getMessageBySyncId', requestBody],
        queryFn: () => tuanchat.chatController.getMessageBySyncId(requestBody),
        staleTime: 0, // 实时数据不缓存
        enabled: !!requestBody.syncId // 当有syncId时才启用查询
    });
}
/**
 * 获取历史消息
 * 返回房间下syncId大于等于请求中syncId的消息，用于重新上线时获取历史消息
 * @param requestBody 请求参数
 */
function useGetHistoryMessagesQuery(requestBody: HistoryMessageRequest) {
    return useQuery({
        queryKey: ['getHistoryMessages', requestBody],
        queryFn: () => tuanchat.chatController.getHistoryMessages(requestBody),
        staleTime: 30000, // 30秒缓存
        enabled: !!requestBody.syncId // 当有syncId时才启用查询
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
        onSuccess: (_, variables) => {
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
function useTransferOwnerMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceOwnerTransferRequest) => tuanchat.spaceController.transferSpaceOwner(req),
        mutationKey: ['transferRoomOwner'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList', variables.spaceId] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
        }
    });
}

/**
 * 转让KP
 */
export function useTransferLeader() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn:(req: LeaderTransferRequest) => tuanchat.spaceMemberController.transferLeader(req),
        mutationKey: ['transferLeader'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList', variables.spaceId] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
        }
    })
}

// ==================== 群组角色管理 ====================
/**
 * 添加群组角色
 */
export function useAddRoomRoleMutation() {
    const queryClient = useQueryClient();

    const mergeRoleList = (existing: UserRole[], toAdd: UserRole[]) => {
        if (toAdd.length === 0)
            return existing;
        const existingIds = new Set<number>(existing.map(r => r.roleId));
        const deduped = toAdd.filter(r => !existingIds.has(r.roleId));
        if (deduped.length === 0)
            return existing;
        return [...existing, ...deduped];
    };

    const getRoleListFromQueryData = (data: any): UserRole[] | null => {
        if (!data)
            return null;
        if (Array.isArray(data))
            return data as UserRole[];
        if (Array.isArray(data.data))
            return data.data as UserRole[];
        return null;
    };

    const findCachedRoleById = (roleId: number): UserRole | null => {
        const directRole = queryClient.getQueryData<any>(["getRole", roleId]);
        const roleFromDirect = directRole?.data as UserRole | undefined;
        if (roleFromDirect && roleFromDirect.roleId === roleId)
            return roleFromDirect;

        const candidateQueryGroups = [
            queryClient.getQueriesData({ queryKey: ["getUserRoles"] }),
            queryClient.getQueriesData({ queryKey: ["getUserRolesByTypes"] }),
            queryClient.getQueriesData({ queryKey: ["spaceRole"] }),
            queryClient.getQueriesData({ queryKey: ["spaceRepositoryRole"] }),
        ];

        for (const group of candidateQueryGroups) {
            for (const [, data] of group) {
                const list = getRoleListFromQueryData(data);
                const found = list?.find(r => r.roleId === roleId);
                if (found)
                    return found;
            }
        }

        return null;
    };

    return useMutation({
        mutationFn: (req: RoomRoleAddRequest) => tuanchat.roomRoleController.addRole(req),
        mutationKey: ['addRole1'],
        onMutate: async (variables) => {
            const roomId = variables.roomId ?? -1;
            const roleIds = Array.from(new Set((variables.roleIdList ?? []).filter(roleId => typeof roleId === "number" && roleId > 0)));
            if (roomId <= 0 || roleIds.length === 0)
                return;

            await Promise.all([
                queryClient.cancelQueries({ queryKey: ["roomRole", roomId] }),
                queryClient.cancelQueries({ queryKey: ["roomNpcRole", roomId] }),
            ]);

            const previousRoomRole = queryClient.getQueryData(["roomRole", roomId]);
            const previousRoomNpcRole = queryClient.getQueryData(["roomNpcRole", roomId]);

            const roomRoleToAdd: UserRole[] = [];
            const roomNpcRoleToAdd: UserRole[] = [];

            for (const roleId of roleIds) {
                const cached = findCachedRoleById(roleId);
                const optimisticRole: UserRole = cached ?? ({ roleId, roleName: `角色${roleId}`, avatarId: -1 } as any);
                if (cached?.type === 2)
                    roomNpcRoleToAdd.push(optimisticRole);
                else
                    roomRoleToAdd.push(optimisticRole);
            }

            const patchCache = (queryKey: readonly unknown[], addList: UserRole[]) => {
                if (addList.length === 0)
                    return;
                queryClient.setQueryData(queryKey, (old: any) => {
                    if (!old)
                        return { success: true, data: addList };

                    if (Array.isArray(old))
                        return mergeRoleList(old as UserRole[], addList);

                    if (Array.isArray(old.data)) {
                        return {
                            ...old,
                            data: mergeRoleList(old.data as UserRole[], addList),
                        };
                    }

                    return old;
                });
            };

            patchCache(["roomRole", roomId], roomRoleToAdd);
            patchCache(["roomNpcRole", roomId], roomNpcRoleToAdd);

            return { previousRoomRole, previousRoomNpcRole, roomId };
        },
        onError: (_error, _variables, context) => {
            if (!context)
                return;
            queryClient.setQueryData(["roomRole", context.roomId], context.previousRoomRole);
            queryClient.setQueryData(["roomNpcRole", context.roomId], context.previousRoomNpcRole);
        },
        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({ queryKey: ["roomRole", variables.roomId] });
            queryClient.invalidateQueries({ queryKey: ["roomNpcRole", variables.roomId] });
        },
    });
}

/**
 * 删除群组角色
 */
export function useDeleteRole1Mutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomRoleDeleteRequest) => tuanchat.roomRoleController.deleteRole(req),
        mutationKey: ['deleteRole1'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['roomRole', variables.roomId] });
            queryClient.invalidateQueries({ queryKey: ['roomNpcRole', variables.roomId] });
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
 * 根据 spaceId 克隆空间
 */

/**
 * 获取用户加入的未归档 space
 */
export function useGetUserActiveSpacesQuery() {
    return useQuery({
        queryKey: ['getUserActiveSpaces'],
        queryFn: () => tuanchat.spaceController.getUserActiveSpaces(),
        staleTime: 300000 // 5分钟缓存
    });
}

type CloneSpaceByCommitPayload = {
    repositoryId: number;
    commitId: number;
};

function useCloneSpaceByCommitIdMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ['cloneSpaceByCommitId'],
        mutationFn: (payload: CloneSpaceByCommitPayload) => tuanchat.request.request({
            method: 'POST',
            url: '/space/clone',
            body: payload,
            mediaType: 'application/json',
        }),
        onSuccess: () => {
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
        },
    });
}
/**
 * 获取 space 下用户加入的所有群聊
 */
export function useGetUserRoomsQuery(spaceId: number) {
    return useQuery({
        queryKey: ['getUserRooms', spaceId],
        queryFn: () => tuanchat.roomController.getUserRooms(spaceId),
        staleTime: 300000,// 5分钟缓存
        enabled: spaceId != -1
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
 * 批量获取群组角色列表
 * @param roomIds 群组ID数组
 */
function useGetRoomRolesQueries(roomIds: number[]) {
    return useQueries({
        queries: roomIds.map(roomId => ({
            queryKey: ['roomRole', roomId],
            queryFn: () => tuanchat.roomRoleController.roomRole(roomId),
            staleTime: 10000,
            enabled: roomId > 0 // 确保roomId有效时才启用查询
        }))
    });
}


/**
 * 获取群组模组角色列表
 * @param roomId 群组ID
 */
export function useGetRoomNpcRoleQuery(roomId: number) {
    return useQuery({
        queryKey: ["roomNpcRole", roomId],
        queryFn: () => tuanchat.roomRoleController.roomNpcRole(roomId),
        staleTime: 10000,
    });
}

/**
 * space角色管理
 */
export function useAddSpaceRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceRole) => tuanchat.spaceRepositoryController.addSpaceRole(req),
        mutationKey: ['addSpaceRole'],
        onSuccess: (_, variables) => {
            // 注意：useGetSpaceRolesQuery / useGetSpaceRepositoryRoleQuery 的 queryKey 要保持一致
            queryClient.invalidateQueries({ queryKey: ['spaceRole', variables.spaceId] });
            queryClient.invalidateQueries({ queryKey: ['spaceRepositoryRole', variables.spaceId] });
        }
    });
}

/**
 * 获取单条message
 */
export function useGetMessageByIdQuery(messageId: number) {
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

/**
 * 获取房间其他信息
 * @param request 请求参数
 */
export function useGetRoomExtraQuery(request: RoomExtraRequest) {
    return useQuery({
        queryKey: ['getRoomExtra', request.roomId, request.key],
        queryFn: () => tuanchat.roomController.getRoomExtra(request.roomId,request.key),
        staleTime: 300000,// 5分钟缓存
        enabled: request.roomId > 0
    });
}
/**
 * 设置房间其他信息
 */
export function useSetRoomExtraMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomExtraSetRequest) => tuanchat.roomController.setRoomExtra(req),
        mutationKey: ['setRoomExtra'],
        // onSuccess: (_, variables) => {
        //     queryClient.invalidateQueries({queryKey: ['getRoomExtra',variables.roomId,variables.key],});
        // }
    });
}

/**
 * 删除房间其他信息
 */
function useDeleteRoomExtraMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomExtraRequest) => tuanchat.roomController.deleteRoomExtra(req),
        mutationKey: ['deleteRoomExtra'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ['getRoomExtra',variables.roomId,variables.key],});
        }
    });
}


