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
 * 鍒涘缓绌洪棿
 */
export function useCreateSpaceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceAddRequest) => tuanchat.spaceController.createSpace(req),
        mutationKey: ['createSpace'],
        onSuccess: () => {
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
            queryClient.invalidateQueries({ queryKey: ['getUserRooms'] });
        }
    });
}

/**
 * 鑾峰彇space鎴愬憳
 */
export function useGetSpaceMembersQuery(spaceId: number) {
    return useQuery({
        queryKey: ['getSpaceMemberList', spaceId],
        queryFn: () => tuanchat.spaceMemberController.getMemberList(spaceId),
        staleTime: 300000, // 5鍒嗛挓缂撳瓨
        enabled: spaceId > 0
    });
}

/**
 * 鏂板绌洪棿鎴愬憳
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
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
        },
    });
}

/**
 * 鐢熸垚绌洪棿閭€璇风爜
 */
export function useSpaceInviteCodeQuery(spaceId: number, type: number = 0, duration?: number) {
    return useQuery({
        queryKey: ['inviteCode', spaceId, type, duration ?? null],
        queryFn: () => tuanchat.spaceMemberController.inviteCode(spaceId, type, duration),
        enabled: spaceId > 0
    });
}

/**
 * 閫氳繃閭€璇烽摼鎺ュ姞鍏ョ┖闂?
 */
export function useSpaceInvitedMutation(code: string) {
    return useMutation({
        mutationKey: ['spaceInvited', code],
        mutationFn:() => tuanchat.spaceMemberController.invited(code)
    })
}

/**
 * 鍒犻櫎绌洪棿鎴愬憳
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
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
        },
    });
}

// ==================== 缇ょ粍绠＄悊 ====================
/**
 * 鑾峰彇缇ゆ垚鍛樺垪琛?
 * @param roomId 缇よ亰ID
 */
export function useGetMemberListQuery(roomId: number) {

    return useQuery({
        queryKey: ['getRoomMemberList', roomId],
        queryFn: () => tuanchat.roomMemberController.getMemberList1(roomId),
        staleTime: 300000 // 5鍒嗛挓缂撳瓨
    });
}

/**
 * 鏂板缇ゆ垚鍛?
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
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
        },
    });
}

/**
 * 鍒犻櫎缇ゆ垚鍛橈紙鎵归噺锛?
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
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
        }
    });
}

/**
 * 鏇存柊缇や俊鎭?
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
 * 鏇存柊space淇℃伅
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
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
        }
    })
}

/**
 * 鑾峰彇缇ょ粍淇℃伅
 * @param roomId 缇ょ粍ID
 */
export function useGetRoomInfoQuery(roomId: number) {
    return useQuery({
        queryKey: ['getRoomInfo', roomId],
        queryFn: () => tuanchat.roomController.getRoomInfo(roomId),
        staleTime: 300000 // 5鍒嗛挓缂撳瓨
    });
}

/**
 * 鑾峰彇Space淇℃伅
 */
export function useGetSpaceInfoQuery(spaceId: number) {
    return useQuery({
        queryKey: ['getSpaceInfo', spaceId],
        queryFn: () => tuanchat.spaceController.getSpaceInfo(spaceId),
        staleTime: 300000, // 5鍒嗛挓缂撳瓨
        enabled: spaceId >= 0
    });
}

/**
 * 璁剧疆绌洪棿 extra 瀛楁
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
 * 閫€鍑虹┖闂?
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
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
        },
    });
}

/**
 * 鑾峰彇绌洪棿涓殑role
 */
export function useGetSpaceRolesQuery(spaceId: number) {
    return useQuery({
        queryKey: ['spaceRole', spaceId],
        queryFn: () => tuanchat.spaceModuleController.spaceRole(spaceId),
        staleTime: 300000 // 5鍒嗛挓缂撳瓨
    });
}


/**
 * 鍒涘缓鎴块棿
 * @param spaceId
 */
export function useCreateRoomMutation(spaceId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomAddRequest) => tuanchat.spaceController.createRoom(req),
        mutationKey: ['createRoom'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserRooms', spaceId] });
            // 鏂版埧闂撮粯璁ゅ紑鍚闃咃細鍒涘缓鍚庨渶瑕佺珛鍒诲埛鏂颁細璇濆垪琛紝鍚﹀垯 UI 浼氬湪缂撳瓨鏈熷唴璇垽涓衡€滄湭璁㈤槄鈥濄€?
            queryClient.invalidateQueries({ queryKey: ['getUserSessions'] });
        },
    });
}

/**
 * 瑙ｆ暎缇ょ粍
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
 * 瑙ｆ暎绌洪棿
 */
export function useDissolveSpaceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: number) => tuanchat.spaceController.dissolveSpace(req),
        mutationKey: ['dissolveSpace'],
        onSuccess: (data) => {
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
        }
    })
}

/**
 * 鏇存柊绌洪棿褰掓。鐘舵€?
 */
export function useUpdateSpaceArchiveStatusMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceArchiveRequest) => tuanchat.spaceController.updateSpaceArchiveStatus(req),
        mutationKey: ['updateSpaceArchiveStatus'],
        onSuccess: () => {
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
            queryClient.invalidateQueries({ queryKey: ['getSpaceMemberList'] });
            queryClient.invalidateQueries({ queryKey: ['getRoomMemberList'] });
        }
    });
}

// ==================== 娑堟伅绯荤粺 ====================
/**
 * 鑾峰彇缇よ亰鎵€鏈夋秷鎭紙瀹炴椂鎬ц姹傞珮锛?
 * @param roomId 缇よ亰ID
 */
export function useGetAllMessageQuery(roomId: number) {
    return useQuery({
        queryKey: ['getAllMessage', roomId],
        queryFn: () => tuanchat.chatController.getAllMessage(roomId),
        staleTime: 0 // 瀹炴椂鏁版嵁涓嶇紦瀛?
    });
}

/**
 * 鍙戦€佹秷鎭紙澶囩敤鎺ュ彛锛?
 * @param roomId 鍏宠仈鐨勭兢鑱奍D锛堢敤浜庣紦瀛樺埛鏂帮級
 */
export function useSendMessageMutation(roomId: number) {
    return useMutation({
        mutationFn: (req: ChatMessageRequest) => tuanchat.chatController.sendMessage1(req),
        mutationKey: ['sendMessage'],
    });
}

/**
 * 鍒嗛〉鑾峰彇娑堟伅
 * @param requestBody 鍒嗛〉璇锋眰鍙傛暟
 */
export function useGetMsgPageQuery(requestBody: ChatMessagePageRequest) {
    return useQuery({
        queryKey: ['getMsgPage', requestBody],
        queryFn: () => tuanchat.chatController.getMsgPage(requestBody),
        staleTime: 30000 // 30绉掔紦瀛?
    });
}

/**
 * 鍒犻櫎娑堟伅
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
 * 鏍规嵁syncId鑾峰彇鍗曟潯娑堟伅
 * 鐢ㄤ簬鍦ㄦ敹鍒皊yncId闂撮殧鐨勬秷鎭椂锛岄噸鏂拌幏鍙栫己澶辩殑娑堟伅
 * @param requestBody 璇锋眰鍙傛暟
 */
export function useGetMessageBySyncIdQuery(requestBody: MessageBySyncIdRequest) {
    return useQuery({
        queryKey: ['getMessageBySyncId', requestBody],
        queryFn: () => tuanchat.chatController.getMessageBySyncId(requestBody),
        staleTime: 0, // 瀹炴椂鏁版嵁涓嶇紦瀛?
        enabled: !!requestBody.syncId // 褰撴湁syncId鏃舵墠鍚敤鏌ヨ
    });
}
/**
 * 鑾峰彇鍘嗗彶娑堟伅
 * 杩斿洖鎴块棿涓媠yncId澶т簬绛変簬璇锋眰涓璼yncId鐨勬秷鎭紝鐢ㄤ簬閲嶆柊涓婄嚎鏃惰幏鍙栧巻鍙叉秷鎭?
 * @param requestBody 璇锋眰鍙傛暟
 */
export function useGetHistoryMessagesQuery(requestBody: HistoryMessageRequest) {
    return useQuery({
        queryKey: ['getHistoryMessages', requestBody],
        queryFn: () => tuanchat.chatController.getHistoryMessages(requestBody),
        staleTime: 30000, // 30绉掔紦瀛?
        enabled: !!requestBody.syncId // 褰撴湁syncId鏃舵墠鍚敤鏌ヨ
    });
}

// ==================== 鏉冮檺绠＄悊 ====================
/**
 * 璁剧疆鐢ㄦ埛涓虹帺瀹?
 * @param roomId 鍏宠仈鐨勭兢鑱奍D锛堢敤浜庣紦瀛樺埛鏂帮級
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
 * 鎾ら攢鐜╁韬唤
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
 * 杞缇や富
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
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
        }
    });
}

/**
 * 杞KP
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
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
        }
    })
}

// ==================== 缇ょ粍瑙掕壊绠＄悊 ====================
/**
 * 娣诲姞缇ょ粍瑙掕壊
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
            queryClient.getQueriesData({ queryKey: ["spaceModuleRole"] }),
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
                queryClient.cancelQueries({ queryKey: ["roomModuleRole", roomId] }),
            ]);

            const previousRoomRole = queryClient.getQueryData(["roomRole", roomId]);
            const previousRoomModuleRole = queryClient.getQueryData(["roomModuleRole", roomId]);

            const roomRoleToAdd: UserRole[] = [];
            const roomModuleRoleToAdd: UserRole[] = [];

            for (const roleId of roleIds) {
                const cached = findCachedRoleById(roleId);
                const optimisticRole: UserRole = cached ?? ({ roleId, roleName: `瑙掕壊${roleId}`, avatarId: -1 } as any);
                if (cached?.type === 2)
                    roomModuleRoleToAdd.push(optimisticRole);
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
            patchCache(["roomModuleRole", roomId], roomModuleRoleToAdd);

            return { previousRoomRole, previousRoomModuleRole, roomId };
        },
        onError: (_error, _variables, context) => {
            if (!context)
                return;
            queryClient.setQueryData(["roomRole", context.roomId], context.previousRoomRole);
            queryClient.setQueryData(["roomModuleRole", context.roomId], context.previousRoomModuleRole);
        },
        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({ queryKey: ["roomRole", variables.roomId] });
            queryClient.invalidateQueries({ queryKey: ["roomModuleRole", variables.roomId] });
        },
    });
}

/**
 * 鍒犻櫎缇ょ粍瑙掕壊
 */
export function useDeleteRole1Mutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomRoleDeleteRequest) => tuanchat.roomRoleController.deleteRole(req),
        mutationKey: ['deleteRole1'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['roomRole', variables.roomId] });
            queryClient.invalidateQueries({ queryKey: ['roomModuleRole', variables.roomId] });
        }
    });
}

// ==================== space鐩稿叧 ====================
/**
 * 鑾峰彇鐢ㄦ埛鍔犲叆鐨勬墍鏈塻pace
 */
export function useGetUserSpacesQuery() {
    return useQuery({
        queryKey: ['getUserSpaces'],
        queryFn: () => tuanchat.spaceController.getUserSpaces(),
        staleTime: 300000 // 5鍒嗛挓缂撳瓨
    });
}

/**
 * 鏍规嵁 spaceId 鍏嬮殕绌洪棿
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

/**
 * 获取用户加入的已归档 space
 */
export function useGetUserArchivedSpacesQuery() {
    return useQuery({
        queryKey: ['getUserArchivedSpaces'],
        queryFn: () => tuanchat.spaceController.getUserArchivedSpaces(),
        staleTime: 300000 // 5分钟缓存
    });
}
export function useCloneSpaceBySpaceIdMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ['cloneSpaceBySpaceId'],
        mutationFn: (spaceId: number) => tuanchat.spaceController.cloneBySpaceId({ spaceId }),
        onSuccess: () => {
queryClient.invalidateQueries({ queryKey: ['getUserSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserActiveSpaces'] });
queryClient.invalidateQueries({ queryKey: ['getUserArchivedSpaces'] });
        },
    });
}
/**
 * 鑾峰彇space涓嬬敤鎴峰姞鍏ョ殑鎵€鏈夌兢缁?
 */
export function useGetUserRoomsQuery(spaceId: number) {
    return useQuery({
        queryKey: ['getUserRooms', spaceId],
        queryFn: () => tuanchat.roomController.getUserRooms(spaceId),
        staleTime: 300000,// 5鍒嗛挓缂撳瓨
        enabled: spaceId != -1
    });
}

/**
 * 鑾峰彇缇ょ粍瑙掕壊鍒楄〃
 * @param roomId 缇ょ粍ID
 */
export function useGetRoomRoleQuery(roomId: number) {
    return useQuery({
        queryKey: ["roomRole", roomId],
        queryFn: () => tuanchat.roomRoleController.roomRole(roomId),
        staleTime: 10000,
    });
}
/**
 * 鎵归噺鑾峰彇缇ょ粍瑙掕壊鍒楄〃
 * @param roomIds 缇ょ粍ID鏁扮粍
 */
export function useGetRoomRolesQueries(roomIds: number[]) {
    return useQueries({
        queries: roomIds.map(roomId => ({
            queryKey: ['roomRole', roomId],
            queryFn: () => tuanchat.roomRoleController.roomRole(roomId),
            staleTime: 10000,
            enabled: roomId > 0 // 纭繚roomId鏈夋晥鏃舵墠鍚敤鏌ヨ
        }))
    });
}


/**
 * 鑾峰彇缇ょ粍妯＄粍瑙掕壊鍒楄〃
 * @param roomId 缇ょ粍ID
 */
export function useGetRoomModuleRoleQuery(roomId: number) {
    return useQuery({
        queryKey: ["roomModuleRole", roomId],
        queryFn: () => tuanchat.roomRoleController.roomModuleRole(roomId),
        staleTime: 10000,
    });
}

/**
 * space瑙掕壊绠＄悊
 */
export function useAddSpaceRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: SpaceRole) => tuanchat.spaceModuleController.addSpaceRole(req),
        mutationKey: ['addSpaceRole'],
        onSuccess: (_, variables) => {
            // 涓?useGetSpaceRolesQuery / useGetSpaceModuleRoleQuery 鐨?queryKey 淇濇寔涓€鑷?
            queryClient.invalidateQueries({ queryKey: ['spaceRole', variables.spaceId] });
            queryClient.invalidateQueries({ queryKey: ['spaceModuleRole', variables.spaceId] });
        }
    });
}

/**
 * 鑾峰彇鍗曟潯message
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
 * 鑾峰彇鎴块棿鍏朵粬淇℃伅
 * @param request 璇锋眰鍙傛暟
 */
export function useGetRoomExtraQuery(request: RoomExtraRequest) {
    return useQuery({
        queryKey: ['getRoomExtra', request.roomId, request.key],
        queryFn: () => tuanchat.roomController.getRoomExtra(request.roomId,request.key),
        staleTime: 300000,// 5鍒嗛挓缂撳瓨
        enabled: request.roomId > 0
    });
}
/**
 * 璁剧疆鎴块棿鍏朵粬淇℃伅
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
 * 鍒犻櫎鎴块棿鍏朵粬淇℃伅
 */
export function useDeleteRoomExtraMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RoomExtraRequest) => tuanchat.roomController.deleteRoomExtra(req),
        mutationKey: ['deleteRoomExtra'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ['getRoomExtra',variables.roomId,variables.key],});
        }
    });
}

