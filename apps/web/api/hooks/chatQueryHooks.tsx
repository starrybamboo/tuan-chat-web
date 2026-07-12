import type { QueryClient } from "@tanstack/react-query";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type { RoomAddRequest } from "@tuanchat/openapi-client/models/RoomAddRequest";
import type { SpaceMemberDeleteRequest } from "@tuanchat/openapi-client/models/SpaceMemberDeleteRequest";
import type { SpaceMemberAddRequest } from "@tuanchat/openapi-client/models/SpaceMemberAddRequest";
import type { SpaceAddRequest } from "@tuanchat/openapi-client/models/SpaceAddRequest";
import type { SpaceOwnerTransferRequest } from "@tuanchat/openapi-client/models/SpaceOwnerTransferRequest";
import type { PlayerGrantRequest } from "@tuanchat/openapi-client/models/PlayerGrantRequest";
import type { SpaceMemberTypeUpdateRequest } from "@tuanchat/openapi-client/models/SpaceMemberTypeUpdateRequest";
import type { RoomRoleDeleteRequest } from "@tuanchat/openapi-client/models/RoomRoleDeleteRequest";
import type { RoomRoleAddRequest } from "@tuanchat/openapi-client/models/RoomRoleAddRequest";
import type { RoomMemberAddRequest } from "@tuanchat/openapi-client/models/RoomMemberAddRequest";
import type { RoomMemberDeleteRequest } from "@tuanchat/openapi-client/models/RoomMemberDeleteRequest";
import type { RoomUpdateRequest } from "@tuanchat/openapi-client/models/RoomUpdateRequest";
import type { SpaceUpdateRequest } from "@tuanchat/openapi-client/models/SpaceUpdateRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoomExtraRequest } from "@tuanchat/openapi-client/models/RoomExtraRequest";
import type { RoomExtraSetRequest } from "@tuanchat/openapi-client/models/RoomExtraSetRequest";
import type { SpaceExtraSetRequest } from "@tuanchat/openapi-client/models/SpaceExtraSetRequest";
import type { SpaceRole } from "@tuanchat/openapi-client/models/SpaceRole";
import type { SpaceArchiveRequest } from "@tuanchat/openapi-client/models/SpaceArchiveRequest";
import type { SpaceRecoverRequest } from "@tuanchat/openapi-client/models/SpaceRecoverRequest";
import type { LeaderTransferRequest } from "@tuanchat/openapi-client/models/LeaderTransferRequest";
import type { ApiResultString } from "@tuanchat/openapi-client/models/ApiResultString";
import type { ApiResultRoom } from "@tuanchat/openapi-client/models/ApiResultRoom";
import type { ApiResultRoomListResponse } from "@tuanchat/openapi-client/models/ApiResultRoomListResponse";
import {
    usePatchMessagesMutation as useSharedPatchMessagesMutation,
    useSendMessageMutation as useSharedSendMessageMutation,
} from "@tuanchat/query/chat";
import {
    useGetRoomMembersQuery as useSharedGetRoomMembersQuery,
    useGetSpaceMembersQuery as useSharedGetSpaceMembersQuery,
} from "@tuanchat/query/members";
import {
    fetchUserRoomsWithCache as fetchSharedUserRoomsWithCache,
    getMyArchivedSpacesQueryKey,
    getUserActiveSpacesQueryKey,
    getUserSpacesQueryKey,
    patchExistingUserRoomData,
    type ResourceQueryOptions,
    useGetMyArchivedSpacesQuery as useSharedGetMyArchivedSpacesQuery,
    useGetUserActiveSpacesQuery as useSharedGetUserActiveSpacesQuery,
    useGetUserRoomsQuery as useSharedGetUserRoomsQuery,
    useGetUserSpacesQuery as useSharedGetUserSpacesQuery,
} from "@tuanchat/query/spaces";
import {
    invalidateRoomMemberQueries,
    invalidateSpaceMemberQueries,
    optimisticAddRoomMembersQueryCache,
    optimisticAddSpaceMembersQueryCache,
    optimisticRemoveRoomMembersQueryCache,
    optimisticRemoveSpaceMembersQueryCache,
    optimisticSetSpaceMemberTypeQueryCache,
    reconcileSpaceMemberTypeQueryCache,
    rollbackMemberQueryTransaction,
    rollbackOptimisticRoomMembers,
    rollbackOptimisticSpaceMembers,
    rollbackSpaceMemberTypeQueryCache,
} from "../memberQueryCache";
import {
    invalidateRoomRoleQueries,
    optimisticAddRoomRoleQueryCache,
    reconcileAddRoomRoleQueryCache,
    rollbackAddRoomRoleQueryCache,
} from "../roomRoleQueryCache";

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

export function roomAllRoleQueryKey(roomId: number): readonly ["roomRoles", number] {
    return ["roomRoles", roomId];
}

export function spaceRoleQueryKey(spaceId: number): readonly ["spaceRole", number] {
    return ["spaceRole", spaceId];
}

export function spaceRepositoryRoleQueryKey(spaceId: number): readonly ["spaceRole", number] {
    return spaceRoleQueryKey(spaceId);
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

export async function addSpaceMemberWithSuccessGuard(requestBody: SpaceMemberAddRequest) {
    const result = await tuanchat.spaceMemberController.addMember(requestBody);
    if (!isSuccessfulApiResult(result)) {
        throw new Error(getApiResultErrorMessage(result, "添加空间成员失败"));
    }
    return result;
}

export async function addRoomMemberWithSuccessGuard(requestBody: RoomMemberAddRequest) {
    const result = await tuanchat.roomMemberController.addMember1(requestBody);
    if (!isSuccessfulApiResult(result)) {
        throw new Error(getApiResultErrorMessage(result, "添加房间成员失败"));
    }
    return result;
}

export async function deleteSpaceMemberWithSuccessGuard(requestBody: SpaceMemberDeleteRequest) {
    const result = await tuanchat.spaceMemberController.deleteMember(requestBody);
    if (!isSuccessfulApiResult(result)) {
        throw new Error(getApiResultErrorMessage(result, "移除空间成员失败"));
    }
    return result;
}

export async function deleteRoomMemberWithSuccessGuard(requestBody: RoomMemberDeleteRequest) {
    const result = await tuanchat.roomMemberController.deleteMember1(requestBody);
    if (!isSuccessfulApiResult(result)) {
        throw new Error(getApiResultErrorMessage(result, "移除房间成员失败"));
    }
    return result;
}

export async function setPlayerWithSuccessGuard(requestBody: PlayerGrantRequest) {
    const result = await tuanchat.spaceMemberController.grantPlayer(requestBody);
    if (!isSuccessfulApiResult(result)) {
        throw new Error(getApiResultErrorMessage(result, "设置玩家失败"));
    }
    return result;
}

async function updateRoomWithSuccessGuard(requestBody: RoomUpdateRequest) {
    const result = await tuanchat.roomController.updateRoom(requestBody);
    if (!isSuccessfulApiResult(result)) {
        throw new Error(getApiResultErrorMessage(result, "更新房间信息失败"));
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

export function fetchUserActiveSpacesWithCache(queryClient: QueryClient, options?: ResourceQueryOptions) {
    return queryClient.fetchQuery({
        queryKey: getUserActiveSpacesQueryKey(),
        queryFn: () => tuanchat.spaceController.getUserActiveSpaces(),
        staleTime: options?.staleTime ?? SPACE_INFO_STALE_TIME_MS,
    });
}

export function fetchUserSpacesWithCache(queryClient: QueryClient, options?: ResourceQueryOptions) {
    return queryClient.fetchQuery({
        queryKey: getUserSpacesQueryKey(),
        queryFn: () => tuanchat.spaceController.getUserSpaces(),
        staleTime: options?.staleTime ?? SPACE_INFO_STALE_TIME_MS,
    });
}

export function fetchRoomAllRoleWithCache(queryClient: QueryClient, roomId: number) {
    return queryClient.fetchQuery({
        queryKey: roomAllRoleQueryKey(roomId),
        queryFn: () => tuanchat.roomRoleController.roomAllRole(roomId),
        staleTime: ROOM_ROLE_STALE_TIME_MS,
    });
}

export async function fetchRoomRoleWithCache(queryClient: QueryClient, roomId: number) {
    const result = await fetchRoomAllRoleWithCache(queryClient, roomId);
    return { ...result, data: result.data?.baseRoles ?? [] };
}

export function fetchRoomNpcRoleWithCache(queryClient: QueryClient, roomId: number) {
    return queryClient.fetchQuery({
        queryKey: roomNpcRoleQueryKey(roomId),
        queryFn: async () => {
            const result = await fetchRoomAllRoleWithCache(queryClient, roomId);
            return { ...result, data: result.data?.npcRoles ?? [] };
        },
        staleTime: ROOM_ROLE_STALE_TIME_MS,
    });
}

export function fetchSpaceRepositoryRoleWithCache(queryClient: QueryClient, spaceId: number) {
    return queryClient.fetchQuery({
        queryKey: spaceRepositoryRoleQueryKey(spaceId),
        queryFn: () => tuanchat.spaceRepositoryController.spaceRole(spaceId),
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

type RoomUpdateQuerySnapshot = {
    roomInfoQueryKey: readonly ["getRoomInfo", number];
    roomInfo?: ApiResultRoom;
    userRoomsEntries: Array<[readonly unknown[], ApiResultRoomListResponse | undefined]>;
};

function patchRoomUpdateQueryCache(queryClient: QueryClient, request: RoomUpdateRequest) {
    patchApiResultData(queryClient, roomInfoQueryKey(request.roomId), request);
    for (const [queryKey] of queryClient.getQueriesData<ApiResultRoomListResponse>({ queryKey: ["getUserRooms"] })) {
        queryClient.setQueryData<ApiResultRoomListResponse>(
            queryKey,
            current => patchExistingUserRoomData(current, request),
        );
    }
}

function rollbackRoomUpdateQueryCache(queryClient: QueryClient, snapshot?: RoomUpdateQuerySnapshot) {
    if (!snapshot) {
        return;
    }
    queryClient.setQueryData(snapshot.roomInfoQueryKey, snapshot.roomInfo);
    for (const [queryKey, data] of snapshot.userRoomsEntries) {
        queryClient.setQueryData(queryKey, data);
    }
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
        mutationFn: addSpaceMemberWithSuccessGuard,
        mutationKey: ['addMember'],
        onMutate: async (variables) => {
            const optimisticContext = await optimisticAddSpaceMembersQueryCache(queryClient, variables);
            return { optimisticContext };
        },
        onError: (_error, variables, context) => {
            rollbackOptimisticSpaceMembers(queryClient, variables.spaceId, context?.optimisticContext);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
            void queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
        },
        onSettled: (_data, _error, variables) => {
            void invalidateSpaceMemberQueries(queryClient, variables.spaceId);
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
        mutationFn: deleteSpaceMemberWithSuccessGuard,
        mutationKey: ['deleteMember'],
        onMutate: async (variables) => {
            const transaction = await optimisticRemoveSpaceMembersQueryCache(queryClient, variables);
            return { transaction };
        },
        onError: (_error, _variables, context) => {
            rollbackMemberQueryTransaction(queryClient, context?.transaction);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
            void queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
        },
        onSettled: (_data, _error, variables) => {
            void invalidateSpaceMemberQueries(queryClient, variables.spaceId);
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
        mutationFn: addRoomMemberWithSuccessGuard,
        mutationKey: ['addMember'],
        onMutate: async (variables) => {
            const optimisticContext = await optimisticAddRoomMembersQueryCache(queryClient, variables);
            return { optimisticContext };
        },
        onError: (_error, variables, context) => {
            rollbackOptimisticRoomMembers(queryClient, variables.roomId, context?.optimisticContext);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
            void queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
        },
        onSettled: (_data, _error, variables) => {
            void invalidateRoomMemberQueries(queryClient, variables.roomId);
        },
    });
}

/**
 * 删除群成员（批量删除）
 */
export function useDeleteRoomMemberMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteRoomMemberWithSuccessGuard,
        mutationKey: ['deleteMember'],
        onMutate: async (variables) => {
            const transaction = await optimisticRemoveRoomMembersQueryCache(queryClient, variables);
            return { transaction };
        },
        onError: (_error, _variables, context) => {
            rollbackMemberQueryTransaction(queryClient, context?.transaction);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
            void queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
        },
        onSettled: (_data, _error, variables) => {
            void invalidateRoomMemberQueries(queryClient, variables.roomId);
        },
    });
}

/**
 * 更新群信息
 */
export function useUpdateRoomMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateRoomWithSuccessGuard,
        mutationKey: ['updateRoom'],
        onMutate: async (variables) => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: roomInfoQueryKey(variables.roomId) }),
                queryClient.cancelQueries({ queryKey: ["getUserRooms"] }),
            ]);

            const snapshot: RoomUpdateQuerySnapshot = {
                roomInfoQueryKey: roomInfoQueryKey(variables.roomId),
                roomInfo: queryClient.getQueryData<ApiResultRoom>(roomInfoQueryKey(variables.roomId)),
                userRoomsEntries: queryClient.getQueriesData<ApiResultRoomListResponse>({ queryKey: ["getUserRooms"] }),
            };
            patchRoomUpdateQueryCache(queryClient, variables);
            return snapshot;
        },
        onError: (_error, _variables, context) => {
            rollbackRoomUpdateQueryCache(queryClient, context);
        },
        onSuccess: (_result, variables) => {
            patchRoomUpdateQueryCache(queryClient, variables);
        },
        onSettled: (_result, _error, variables) => {
            if (!variables) {
                return;
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
export function useGetSpaceInfoQuery(spaceId: number, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: spaceInfoQueryKey(spaceId),
        queryFn: () => tuanchat.spaceController.getSpaceInfo(spaceId),
        staleTime: SPACE_INFO_STALE_TIME_MS, // 5分钟缓存
        enabled: (options?.enabled ?? true) && spaceId > 0,
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
        onSuccess: () => {
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
export function useGetSpaceRolesQuery(spaceId: number) {
    return useQuery({
        queryKey: spaceRoleQueryKey(spaceId),
        queryFn: () => tuanchat.spaceRepositoryController.spaceRole(spaceId),
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
        onSuccess: () => {
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
        onSuccess: () => {
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
queryClient.invalidateQueries({ queryKey: getMyArchivedSpacesQueryKey() });
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
queryClient.invalidateQueries({ queryKey: getMyArchivedSpacesQueryKey() });
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
queryClient.invalidateQueries({ queryKey: getMyArchivedSpacesQueryKey() });
            queryClient.invalidateQueries({ queryKey: ['repositoryDetail'] });
            queryClient.invalidateQueries({ queryKey: ['repositoryCommitChain'] });
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList'] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
        }
    });
}

// ==================== 消息系统 ====================
/**
 * 发消息（备用接口）
 * @param roomId 关联的群聊ID（用于缓存刷新）
 */
export function useSendMessageMutation(roomId: number) {
    return useSharedSendMessageMutation(tuanchat, roomId);
}

export function usePatchMessagesMutation(roomId: number) {
    return useSharedPatchMessagesMutation(tuanchat, roomId);
}

/**
 * 删除消息
 */
export function useDeleteMessageMutation() {
    return useMutation({
        mutationFn: (req: number) => tuanchat.chatController.deleteMessage(req),
        mutationKey: ['deleteMessage'],
        onSuccess: () => {
        }
    });
}

export function useUpdateMessageMutation() {
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
export function useGetMessageBySyncIdQuery(requestBody: { roomId: number; syncId: number }) {
    return useQuery({
        queryKey: ['getMessageBySyncId', requestBody],
        queryFn: () => tuanchat.chatController.getMessageBySyncId(requestBody.roomId, requestBody.syncId),
        staleTime: 0, // 实时数据不缓存
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
        mutationFn: setPlayerWithSuccessGuard,
        mutationKey: ['setPlayer'],
        onMutate: async (variables) => {
            const previousSpaceMembers = await optimisticSetSpaceMemberTypeQueryCache(queryClient, {
                spaceId: variables.spaceId,
                uidList: variables.uidList,
                memberType: 2,
            });
            return { previousSpaceMembers };
        },
        onError: (_error, variables, context) => {
            rollbackSpaceMemberTypeQueryCache(queryClient, variables.spaceId, context?.previousSpaceMembers);
        },
        onSuccess: (_, variables) => {
            reconcileSpaceMemberTypeQueryCache(queryClient, {
                spaceId: variables.spaceId,
                uidList: variables.uidList,
                memberType: 2,
            });
        },
        onSettled: (_data, _error, variables) => {
            void invalidateSpaceMemberQueries(queryClient, variables.spaceId);
        },
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
            const previousSpaceMembers = await optimisticSetSpaceMemberTypeQueryCache(queryClient, variables);
            return { previousSpaceMembers };
        },
        onError: (_error, variables, context) => {
            rollbackSpaceMemberTypeQueryCache(queryClient, variables.spaceId, context?.previousSpaceMembers);
        },
        onSuccess: (_, variables) => {
            reconcileSpaceMemberTypeQueryCache(queryClient, variables);
        },
        onSettled: (_data, _error, variables) => {
            void invalidateSpaceMemberQueries(queryClient, variables.spaceId);
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

    return useMutation({
        mutationFn: addRoomRoleWithSuccessGuard,
        mutationKey: ['addRole1'],
        onMutate: variables => optimisticAddRoomRoleQueryCache(queryClient, variables),
        onError: (_error, _variables, context) => {
            rollbackAddRoomRoleQueryCache(queryClient, context);
        },
        onSuccess: (_data, variables) => {
            reconcileAddRoomRoleQueryCache(queryClient, variables);
        },
        onSettled: (_data, _error, variables) => {
            void invalidateRoomRoleQueries(queryClient, variables.roomId);
        },
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

/**
 * 获取当前用户归档过的 space
 */
export function useGetMyArchivedSpacesQuery(options?: ResourceQueryOptions) {
    return useSharedGetMyArchivedSpacesQuery(tuanchat, options);
}

type CloneSpaceByCommitPayload = {
    repositoryId: number;
    commitId: number;
};

export function useCloneSpaceByCommitIdMutation() {
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
        queryFn: () => fetchRoomRoleWithCache(queryClient, roomId),
        staleTime: 10000,
        enabled: roomId > 0,
    });
}

export function useGetRoomAllRoleQuery(roomId: number) {
    return useQuery({
        queryKey: roomAllRoleQueryKey(roomId),
        queryFn: () => tuanchat.roomRoleController.roomAllRole(roomId),
        staleTime: ROOM_ROLE_STALE_TIME_MS,
        enabled: roomId > 0,
    });
}
/**
 * 批量获取群组角色列表
 * @param roomIds 群组ID数组
 */

/**
 * 获取群组模组角色列表
 * @param roomId 群组ID
 */
export function useGetRoomNpcRoleQuery(roomId: number) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: roomNpcRoleQueryKey(roomId),
        queryFn: () => fetchRoomNpcRoleWithCache(queryClient, roomId),
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
            queryClient.invalidateQueries({ queryKey: ['spaceRole', variables.spaceId] });
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
export function useDeleteRoomExtraMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomExtraRequest) => tuanchat.roomController.deleteRoomExtra(req),
        mutationKey: ['deleteRoomExtra'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: roomExtraQueryKey(variables.roomId, variables.key),});
        }
    });
}
