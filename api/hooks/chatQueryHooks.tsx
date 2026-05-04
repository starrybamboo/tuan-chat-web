import type { QueryClient } from "@tanstack/react-query";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type { ApiResultListSpaceMember } from "@tuanchat/openapi-client/models/ApiResultListSpaceMember";
import type { RoomAddRequest } from "@tuanchat/openapi-client/models/RoomAddRequest";
import type { SpaceMemberDeleteRequest } from "@tuanchat/openapi-client/models/SpaceMemberDeleteRequest";
import type { SpaceMemberAddRequest } from "@tuanchat/openapi-client/models/SpaceMemberAddRequest";
import type { SpaceAddRequest } from "@tuanchat/openapi-client/models/SpaceAddRequest";
import type { SpaceOwnerTransferRequest } from "@tuanchat/openapi-client/models/SpaceOwnerTransferRequest";
import type { PlayerGrantRequest } from "@tuanchat/openapi-client/models/PlayerGrantRequest";
import type { SpaceMemberTypeUpdateRequest } from "@tuanchat/openapi-client/models/SpaceMemberTypeUpdateRequest";
import type { ChatMessagePageRequest } from "@tuanchat/openapi-client/models/ChatMessagePageRequest";
import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { RoomRoleDeleteRequest } from "@tuanchat/openapi-client/models/RoomRoleDeleteRequest";
import type { RoomRoleAddRequest } from "@tuanchat/openapi-client/models/RoomRoleAddRequest";
import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { RoomMemberAddRequest } from "@tuanchat/openapi-client/models/RoomMemberAddRequest";
import type { RoomMemberDeleteRequest } from "@tuanchat/openapi-client/models/RoomMemberDeleteRequest";
import type { RoomUpdateRequest } from "@tuanchat/openapi-client/models/RoomUpdateRequest";
import type { SpaceUpdateRequest } from "@tuanchat/openapi-client/models/SpaceUpdateRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoomExtraRequest } from "@tuanchat/openapi-client/models/RoomExtraRequest";
import type { RoomExtraSetRequest } from "@tuanchat/openapi-client/models/RoomExtraSetRequest";
import type { SpaceExtraSetRequest } from "@tuanchat/openapi-client/models/SpaceExtraSetRequest";
import type { SpaceRole } from "@tuanchat/openapi-client/models/SpaceRole";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import type { SpaceArchiveRequest } from "@tuanchat/openapi-client/models/SpaceArchiveRequest";
import type { SpaceRecoverRequest } from "@tuanchat/openapi-client/models/SpaceRecoverRequest";
import type { LeaderTransferRequest } from "@tuanchat/openapi-client/models/LeaderTransferRequest";
import type {HistoryMessageRequest} from "@tuanchat/openapi-client/models/HistoryMessageRequest";
import type {MessageBySyncIdRequest} from "@tuanchat/openapi-client/models/MessageBySyncIdRequest";
import type { ApiResultString } from "@tuanchat/openapi-client/models/ApiResultString";
import {
    useBatchSendMessageMutation as useSharedBatchSendMessageMutation,
    useSendMessageMutation as useSharedSendMessageMutation,
} from "@tuanchat/query/chat";
import {
    useGetRoomMembersQuery as useSharedGetRoomMembersQuery,
    useGetSpaceMembersQuery as useSharedGetSpaceMembersQuery,
} from "@tuanchat/query/members";
import {
    fetchUserRoomsWithCache as fetchSharedUserRoomsWithCache,
    type ResourceQueryOptions,
    useGetUserActiveSpacesQuery as useSharedGetUserActiveSpacesQuery,
    useGetUserRoomsQuery as useSharedGetUserRoomsQuery,
    useGetUserSpacesQuery as useSharedGetUserSpacesQuery,
} from "@tuanchat/query/spaces";
import { seedUserRoleListQueryCache } from "../roleQueryCache";

export const ROOM_INFO_STALE_TIME_MS = 300_000;
export const SPACE_INFO_STALE_TIME_MS = 300_000;
export const USER_ROOMS_STALE_TIME_MS = 300_000;
export const ROOM_ROLE_STALE_TIME_MS = 10_000;
export const SPACE_ROLE_STALE_TIME_MS = 300_000;
export const EXTRA_STALE_TIME_MS = 300_000;

export function roomInfoQueryKey(roomId: number): readonly ["getRoomInfo", number] {
    return ["getRoomInfo", roomId];
}

export function spaceInfoQueryKey(spaceId: number): readonly ["getSpaceInfo", number] {
    return ["getSpaceInfo", spaceId];
}

export function roomRoleQueryKey(roomId: number): readonly ["roomRole", number] {
    return ["roomRole", roomId];
}

export function roomNpcRoleQueryKey(roomId: number): readonly ["roomNpcRole", number] {
    return ["roomNpcRole", roomId];
}

export function spaceRoleQueryKey(spaceId: number): readonly ["spaceRole", number] {
    return ["spaceRole", spaceId];
}

export function spaceRepositoryRoleQueryKey(spaceId: number): readonly ["spaceRepositoryRole", number] {
    return ["spaceRepositoryRole", spaceId];
}

export function roomExtraQueryKey(roomId: number, key: string): readonly ["getRoomExtra", number, string] {
    return ["getRoomExtra", roomId, key];
}

export function spaceExtraQueryKey(spaceId: number, key: string): readonly ["getSpaceExtra", number, string] {
    return ["getSpaceExtra", spaceId, key];
}

function isSuccessfulApiResult(result: { success?: boolean } | null | undefined): boolean {
    return result?.success === true;
}

function getApiResultErrorMessage(result: { errMsg?: string } | null | undefined, fallback: string): string {
    const message = result?.errMsg?.trim();
    return message || fallback;
}

export async function updateSpaceMemberTypeWithSuccessGuard(requestBody: SpaceMemberTypeUpdateRequest) {
    const result = await tuanchat.spaceMemberController.updateMemberType(requestBody);
    if (!isSuccessfulApiResult(result)) {
        throw new Error(getApiResultErrorMessage(result, "更新空间成员身份失败"));
    }
    return result;
}

export async function addRoomRoleWithSuccessGuard(requestBody: RoomRoleAddRequest) {
    const result = await tuanchat.roomRoleController.addRole(requestBody);
    if (!isSuccessfulApiResult(result)) {
        throw new Error(getApiResultErrorMessage(result, "添加房间角色失败"));
    }
    return result;
}

export function fetchRoomInfoWithCache(queryClient: QueryClient, roomId: number) {
    return queryClient.fetchQuery({
        queryKey: roomInfoQueryKey(roomId),
        queryFn: () => tuanchat.roomController.getRoomInfo(roomId),
        staleTime: ROOM_INFO_STALE_TIME_MS,
    });
}

export function fetchSpaceInfoWithCache(queryClient: QueryClient, spaceId: number) {
    return queryClient.fetchQuery({
        queryKey: spaceInfoQueryKey(spaceId),
        queryFn: () => tuanchat.spaceController.getSpaceInfo(spaceId),
        staleTime: SPACE_INFO_STALE_TIME_MS,
    });
}

export function fetchUserRoomsWithCache(queryClient: QueryClient, spaceId: number) {
    return fetchSharedUserRoomsWithCache(queryClient, tuanchat, spaceId, {
        staleTime: USER_ROOMS_STALE_TIME_MS,
    });
}

export function fetchRoomRoleWithCache(queryClient: QueryClient, roomId: number) {
    return queryClient.fetchQuery({
        queryKey: roomRoleQueryKey(roomId),
        queryFn: async () => {
            const res = await tuanchat.roomRoleController.roomRole(roomId);
            seedUserRoleListQueryCache(queryClient, res.data);
            return res;
        },
        staleTime: ROOM_ROLE_STALE_TIME_MS,
    });
}

export function fetchRoomNpcRoleWithCache(queryClient: QueryClient, roomId: number) {
    return queryClient.fetchQuery({
        queryKey: roomNpcRoleQueryKey(roomId),
        queryFn: async () => {
            const res = await tuanchat.roomRoleController.roomNpcRole(roomId);
            seedUserRoleListQueryCache(queryClient, res.data);
            return res;
        },
        staleTime: ROOM_ROLE_STALE_TIME_MS,
    });
}

export function fetchSpaceRepositoryRoleWithCache(queryClient: QueryClient, spaceId: number) {
    return queryClient.fetchQuery({
        queryKey: spaceRepositoryRoleQueryKey(spaceId),
        queryFn: async () => {
            const res = await tuanchat.spaceRepositoryController.spaceRole(spaceId);
            seedUserRoleListQueryCache(queryClient, res.data);
            return res;
        },
        staleTime: SPACE_ROLE_STALE_TIME_MS,
    });
}

export function fetchRoomExtraWithCache(queryClient: QueryClient, roomId: number, key: string) {
    return queryClient.fetchQuery({
        queryKey: roomExtraQueryKey(roomId, key),
        queryFn: () => tuanchat.roomController.getRoomExtra(roomId, key),
        staleTime: EXTRA_STALE_TIME_MS,
    });
}

export function fetchSpaceExtraWithCache(queryClient: QueryClient, spaceId: number, key: string) {
    return queryClient.fetchQuery({
        queryKey: spaceExtraQueryKey(spaceId, key),
        queryFn: () => tuanchat.spaceController.getSpaceExtra(spaceId, key),
        staleTime: EXTRA_STALE_TIME_MS,
    });
}

function setExtraStringCache(queryClient: QueryClient, queryKey: readonly unknown[], value: string) {
    queryClient.setQueryData<ApiResultString>(queryKey, () => ({
        success: true,
        data: value,
    }));
}

function patchApiResultData(queryClient: QueryClient, queryKey: readonly unknown[], patch: object) {
    queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.data) {
            return old;
        }
        return {
            ...old,
            data: {
                ...old.data,
                ...patch,
            },
        };
    });
}

export function patchSpaceExtraCache(queryClient: QueryClient, request: SpaceExtraSetRequest) {
    queryClient.setQueryData(spaceInfoQueryKey(request.spaceId), (old: any) => {
        if (!old?.data) {
            return old;
        }

        let extra: Record<string, unknown> = {};
        if (typeof old.data.extra === "string" && old.data.extra.trim()) {
            try {
                const parsed = JSON.parse(old.data.extra);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    extra = parsed;
                }
            }
            catch {
                extra = {};
            }
        }

        return {
            ...old,
            data: {
                ...old.data,
                extra: JSON.stringify({
                    ...extra,
                    [request.key]: request.value,
                }),
            },
        };
    });
}

export async function setSpaceExtraWithCache(queryClient: QueryClient, request: SpaceExtraSetRequest) {
    const result = await tuanchat.spaceController.setSpaceExtra(request);
    if (!isSuccessfulApiResult(result)) {
        return result;
    }
    setExtraStringCache(queryClient, spaceExtraQueryKey(request.spaceId, request.key), request.value);
    patchSpaceExtraCache(queryClient, request);
    void queryClient.invalidateQueries({ queryKey: spaceExtraQueryKey(request.spaceId, request.key) });
    void queryClient.invalidateQueries({ queryKey: spaceInfoQueryKey(request.spaceId) });
    return result;
}

export async function setRoomExtraWithCache(queryClient: QueryClient, request: RoomExtraSetRequest) {
    const result = await tuanchat.roomController.setRoomExtra(request);
    if (!isSuccessfulApiResult(result)) {
        return result;
    }
    setExtraStringCache(queryClient, roomExtraQueryKey(request.roomId, request.key), request.value);
    void queryClient.invalidateQueries({ queryKey: roomExtraQueryKey(request.roomId, request.key) });
    return result;
}

function patchSpaceMemberListCache(
    queryClient: QueryClient,
    spaceId: number,
    updater: (member: NonNullable<ApiResultListSpaceMember["data"]>[number]) => NonNullable<ApiResultListSpaceMember["data"]>[number],
) {
    if (!(spaceId > 0)) {
        return;
    }

    queryClient.setQueryData<ApiResultListSpaceMember>(['getSpaceMemberList', spaceId], (oldData) => {
        if (!oldData?.data) {
            return oldData;
        }

        let changed = false;
        const nextMembers = oldData.data.map((member) => {
            const nextMember = updater(member);
            if (nextMember !== member) {
                changed = true;
            }
            return nextMember;
        });

        if (!changed) {
            return oldData;
        }

        return {
            ...oldData,
            data: nextMembers,
        };
    });
}

function setCachedSpaceMemberType(
    queryClient: QueryClient,
    spaceId: number,
    uidList: number[],
    memberType: number,
) {
    const targetUserIds = new Set(uidList.filter(uid => Number.isFinite(uid) && uid > 0));
    if (targetUserIds.size === 0) {
        return;
    }

    patchSpaceMemberListCache(queryClient, spaceId, (member) => {
        const userId = member.userId ?? -1;
        if (!targetUserIds.has(userId) || member.memberType === memberType) {
            return member;
        }

        return {
            ...member,
            memberType,
        };
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
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
            queryClient.invalidateQueries({ queryKey: ['getUserRooms'] });
        }
    });
}

/**
 * 获取space成员
 */
export function useGetSpaceMembersQuery(spaceId: number) {
    return useSharedGetSpaceMembersQuery(tuanchat, spaceId, {
        staleTime: 300000,
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
    return useSharedGetRoomMembersQuery(tuanchat, roomId, {
        staleTime: 300000,
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
        onSuccess: (result, variables) => {
            if (isSuccessfulApiResult(result)) {
                patchApiResultData(queryClient, roomInfoQueryKey(variables.roomId), variables);
            }
            queryClient.invalidateQueries({ queryKey: roomInfoQueryKey(variables.roomId) });
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
        onSuccess: (result, variables) => {
            if (isSuccessfulApiResult(result)) {
                patchApiResultData(queryClient, spaceInfoQueryKey(variables.spaceId), variables);
            }
            queryClient.invalidateQueries({ queryKey: spaceInfoQueryKey(variables.spaceId) });
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
        queryKey: roomInfoQueryKey(roomId),
        queryFn: () => tuanchat.roomController.getRoomInfo(roomId),
        staleTime: ROOM_INFO_STALE_TIME_MS, // 5分钟缓存
        enabled: roomId > 0,
    });
}

/**
 * 获取Space信息
 */
export function useGetSpaceInfoQuery(spaceId: number) {
    return useQuery({
        queryKey: spaceInfoQueryKey(spaceId),
        queryFn: () => tuanchat.spaceController.getSpaceInfo(spaceId),
        staleTime: SPACE_INFO_STALE_TIME_MS, // 5分钟缓存
        enabled: spaceId >= 0
    });
}

/**
 * 设置空间 extra 字段
 */
export function useSetSpaceExtraMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceExtraSetRequest) => setSpaceExtraWithCache(queryClient, req),
        mutationKey: ['setSpaceExtra'],
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
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: spaceRoleQueryKey(spaceId),
        queryFn: async () => {
            const res = await tuanchat.spaceRepositoryController.spaceRole(spaceId);
            seedUserRoleListQueryCache(queryClient, res.data);
            return res;
        },
        staleTime: SPACE_ROLE_STALE_TIME_MS
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
            queryClient.invalidateQueries({ queryKey: ['repositoryDetail'] });
            queryClient.invalidateQueries({ queryKey: ['repositoryCommitChain'] });
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList'] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
        }
    });
}

/**
 * 恢复归档空间继续编辑
 */
export function useRecoverSpaceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceRecoverRequest) => tuanchat.spaceController.recoverArchivedSpace(req),
        mutationKey: ['recoverArchivedSpace'],
        onSuccess: () => {
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
            queryClient.invalidateQueries({ queryKey: ['repositoryDetail'] });
            queryClient.invalidateQueries({ queryKey: ['repositoryCommitChain'] });
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
    return useSharedSendMessageMutation(tuanchat, roomId);
}

/**
 * 批量发送消息（批量插入）
 * @param roomId 关联的群聊ID（用于 mutation key 隔离）
 */
export function useBatchSendMessageMutation(roomId: number) {
    return useSharedBatchSendMessageMutation(tuanchat, roomId);
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
 * 更新空间成员身份
 */
export function useUpdateSpaceMemberTypeMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSpaceMemberTypeWithSuccessGuard,
        mutationKey: ['updateSpaceMemberType'],
        onMutate: async (variables) => {
            // 先打断旧的成员列表请求，避免过期结果回填，把刚点下去的权限变更又盖回去。
            await queryClient.cancelQueries({ queryKey: ['getSpaceMemberList', variables.spaceId] });

            const previousSpaceMembers = queryClient.getQueryData<ApiResultListSpaceMember>(['getSpaceMemberList', variables.spaceId]);
            setCachedSpaceMemberType(queryClient, variables.spaceId, variables.uidList ?? [], variables.memberType);

            return { previousSpaceMembers };
        },
        onError: (_error, variables, context) => {
            if (context?.previousSpaceMembers) {
                queryClient.setQueryData(['getSpaceMemberList', variables.spaceId], context.previousSpaceMembers);
                return;
            }

            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList', variables.spaceId] });
        },
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
        mutationFn: (req: LeaderTransferRequest) => tuanchat.spaceMemberController.transferLeader(req),
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
        mutationFn: addRoomRoleWithSuccessGuard,
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
export function useGetUserSpacesQuery(options?: ResourceQueryOptions) {
    return useSharedGetUserSpacesQuery(tuanchat, options);
}

/**
 * 根据 repositoryId + commitId 克隆空间
 */

/**
 * 获取用户加入的未归档 space
 */
export function useGetUserActiveSpacesQuery() {
    return useSharedGetUserActiveSpacesQuery(tuanchat);
}

type CloneSpaceByCommitPayload = {
    repositoryId: number;
    commitId: number;
};

function useCloneSpaceByCommitIdMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ['cloneSpaceByCommitId'],
        mutationFn: (payload: CloneSpaceByCommitPayload) => tuanchat.spaceController.cloneByCommitId(payload),
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
    return useSharedGetUserRoomsQuery(tuanchat, spaceId);
}

/**
 * 获取群组角色列表
 * @param roomId 群组ID
 */
export function useGetRoomRoleQuery(roomId: number) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: roomRoleQueryKey(roomId),
        queryFn: async () => {
            const res = await tuanchat.roomRoleController.roomRole(roomId);
            seedUserRoleListQueryCache(queryClient, res.data);
            return res;
        },
        staleTime: 10000,
        enabled: roomId > 0,
    });
}
/**
 * 批量获取群组角色列表
 * @param roomIds 群组ID数组
 */
function useGetRoomRolesQueries(roomIds: number[]) {
    return useQueries({
        queries: roomIds.map(roomId => ({
            queryKey: roomRoleQueryKey(roomId),
            queryFn: () => tuanchat.roomRoleController.roomRole(roomId),
            staleTime: ROOM_ROLE_STALE_TIME_MS,
            enabled: roomId > 0 // 确保roomId有效时才启用查询
        }))
    });
}


/**
 * 获取群组模组角色列表
 * @param roomId 群组ID
 */
export function useGetRoomNpcRoleQuery(roomId: number) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: roomNpcRoleQueryKey(roomId),
        queryFn: async () => {
            const res = await tuanchat.roomRoleController.roomNpcRole(roomId);
            seedUserRoleListQueryCache(queryClient, res.data);
            return res;
        },
        staleTime: 10000,
        enabled: roomId > 0,
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
        queryKey: roomExtraQueryKey(request.roomId, request.key),
        queryFn: () => tuanchat.roomController.getRoomExtra(request.roomId,request.key),
        staleTime: EXTRA_STALE_TIME_MS,
        enabled: request.roomId > 0
    });
}
/**
 * 设置房间其他信息
 */
export function useSetRoomExtraMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomExtraSetRequest) => setRoomExtraWithCache(queryClient, req),
        mutationKey: ['setRoomExtra'],
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
            queryClient.invalidateQueries({queryKey: roomExtraQueryKey(variables.roomId, variables.key),});
        }
    });
}



