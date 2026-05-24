import type { RoomSettingTab } from "@/components/chat/chatPage.types";
import type { RoomContextType } from "@/components/chat/core/roomContext";
import {
  useGetMemberListQuery,
  useGetRoomInfoQuery,
  useGetRoomNpcRoleQuery,
  useGetRoomRoleQuery,
  useUpdateRoomMutation,
} from "api/hooks/chatQueryHooks";
import { useGetUserRolesQuery } from "api/hooks/RoleAndAvatarHooks";
import { use, useCallback, useMemo, useState } from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import MemberLists from "@/components/chat/shared/components/memberLists";
import RoleList from "@/components/chat/shared/components/roleLists";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { BaselineArrowBackIosNew, MemberIcon, RoleListIcon, Setting } from "@/icons";
import { SpaceContext } from "../core/spaceContext";

function RoomSettingWindow({ onClose, roomId: propRoomId, defaultTab = "role" }: {
  onClose: () => void;
  roomId?: number;
  defaultTab?: RoomSettingTab;
}) {
  const userId = useGlobalUserId();

  // 获取context，可能为null（当组件在SpaceContext.Provider外部使用时）
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext?.spaceId;

  // 获取群组数据
  const getRoomInfoQuery = useGetRoomInfoQuery(propRoomId ?? -1);
  const room = getRoomInfoQuery.data?.data;

  // 获取房间成员和角色
  const membersQuery = useGetMemberListQuery(propRoomId ?? -1);
  const roomMembers = useMemo(() => membersQuery.data?.data ?? [], [membersQuery.data?.data]);
  const roomRolesQuery = useGetRoomRoleQuery(propRoomId ?? -1);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);
  // 获取房间NPC角色
  const roomNpcRolesQuery = useGetRoomNpcRoleQuery(propRoomId ?? -1);
  const roomNpcRoles = useMemo(() => roomNpcRolesQuery.data?.data ?? [], [roomNpcRolesQuery.data?.data]);

  // 获取用户的所有角色
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);

  // 用户在当前房间拥有的角色 + NPC角色
  const roomRolesThatUserOwn = useMemo(() => {
    const playerRoles = spaceContext?.isSpaceOwner
      ? roomRoles
      : roomRoles.filter(role => userRoles.some(userRole => userRole.roleId === role.roleId));
    // 合并玩家角色和NPC角色
    return [...playerRoles, ...roomNpcRoles];
  }, [roomRoles, roomNpcRoles, spaceContext?.isSpaceOwner, userRoles]);

  // 解散群组
  const updateRoomMutation = useUpdateRoomMutation();

  // 获取当前用户对应的member
  const curMember = useMemo(() => {
    return roomMembers.find(member => member.userId === userId);
  }, [roomMembers, userId]);

  // 使用默认的聊天气泡样式设置
  const [useChatBubbleStyle] = useState(true);
  // roomContext
  const roomContext: RoomContextType = useMemo((): RoomContextType => {
    return {
      roomId: propRoomId,
      roomMembers,
      curMember,
      roomRolesThatUserOwn,
      useChatBubbleStyle,
      spaceId,
    };
  }, [propRoomId, roomMembers, curMember, roomRolesThatUserOwn, useChatBubbleStyle, spaceId]);

  const pageTitle = useMemo(() => {
    switch (defaultTab) {
      case "member":
        return "房间成员";
      case "setting":
        return "房间资料";
      case "role":
      default:
        return "房间角色";
    }
  }, [defaultTab]);

  const PageIcon = useMemo(() => {
    switch (defaultTab) {
      case "member":
        return MemberIcon;
      case "setting":
        return Setting;
      case "role":
      default:
        return RoleListIcon;
    }
  }, [defaultTab]);

  return (
    <RoomContext value={roomContext}>
      <div className="flex flex-col h-full w-full min-w-[40vw] bg-base-100 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-2 py-1 border-b border-base-300 bg-base-100">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="返回聊天"
            onClick={onClose}
          >
            <BaselineArrowBackIosNew className="size-5" />
          </button>
          <PageIcon className="size-4 opacity-70" />
          <div className="text-sm font-medium opacity-80 truncate">
            {pageTitle}
          </div>
        </div>

        {!room
          ? (
              <div className="flex-1 flex items-center justify-center opacity-70">加载中...</div>
            )
          : (
              <div className="flex-1 min-h-0 overflow-hidden">
                {defaultTab === "member" && (
                  <div className="h-full overflow-y-auto">
                    <div className="space-y-2 p-4">
                      <div className="flex flex-row justify-center items-center gap-2 px-4">
                        <p>
                          房间成员 -
                          {roomMembers.length}
                        </p>
                      </div>
                      <MemberLists members={roomMembers} isSpace={false} />
                    </div>
                  </div>
                )}

                {defaultTab === "role" && (
                  <div className="h-full overflow-y-auto">
                    <div className="space-y-2 p-4">
                      <div className="flex flex-row justify-center items-center gap-2 px-4">
                        <p>
                          房间角色 -
                          {roomRoles.length}
                        </p>
                      </div>
                      <RoleList roles={roomRoles} />
                    </div>
                  </div>
                )}

                {defaultTab === "setting" && (
                  <div className="h-full min-h-0 overflow-y-auto">
                    {(propRoomId && (room?.spaceId ?? spaceId))
                      ? (
                          <RoomSettingForm
                            key={room.roomId ?? propRoomId}
                            roomId={propRoomId}
                            initialName={room.name ?? ""}
                            initialDescription={room.description ?? ""}
                            avatarFileId={room.avatarFileId}
                            isPending={updateRoomMutation.isPending}
                            onClose={onClose}
                            onSave={(draft, opts) => {
                              updateRoomMutation.mutate({
                                roomId: propRoomId,
                                name: draft.name.trim(),
                                description: draft.description,
                                avatarFileId: room.avatarFileId,
                              }, {
                                onSuccess: () => {
                                  if (opts?.closeAfter) {
                                    onClose();
                                  }
                                },
                              });
                            }}
                          />
                        )
                      : (
                          <div className="text-sm opacity-70">未选择房间或无法获取spaceId</div>
                        )}
                  </div>
                )}

              </div>
            )}
      </div>
    </RoomContext>
  );
}

function RoomSettingForm({
  roomId,
  initialName,
  initialDescription,
  avatarFileId,
  isPending,
  onClose,
  onSave,
}: {
  roomId?: number;
  initialName: string;
  initialDescription: string;
  avatarFileId?: number;
  isPending: boolean;
  onClose: () => void;
  onSave: (draft: { name: string; description: string; avatarFileId?: number }, opts?: { closeAfter?: boolean }) => void;
}) {
  const [roomDraft, setRoomDraft] = useState({
    name: initialName,
    description: initialDescription,
  });

  const flushRoomRedundant = useCallback((opts?: { closeAfter?: boolean }) => {
    if (!roomId || !Number.isFinite(roomId) || roomId <= 0) {
      return;
    }
    onSave({
      name: roomDraft.name,
      description: roomDraft.description,
      avatarFileId,
    }, opts);
  }, [avatarFileId, onSave, roomDraft.description, roomDraft.name, roomId]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <label className="form-control">
        <div className="label">
          <span className="label-text">房间名称</span>
        </div>
        <input
          className="input input-bordered w-full"
          value={roomDraft.name}
          onChange={(event) => {
            setRoomDraft(prev => ({ ...prev, name: event.target.value }));
          }}
        />
      </label>

      <label className="form-control">
        <div className="label">
          <span className="label-text">房间描述</span>
        </div>
        <textarea
          className="textarea textarea-bordered min-h-40 w-full resize-y"
          value={roomDraft.description}
          onChange={(event) => {
            setRoomDraft(prev => ({ ...prev, description: event.target.value }));
          }}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
        >
          取消
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={isPending}
          onClick={() => flushRoomRedundant()}
        >
          保存
        </button>
      </div>
    </div>
  );
}

export default RoomSettingWindow;
