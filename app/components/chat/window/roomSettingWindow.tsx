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
import RoleList from "@/components/chat/shared/components/roleLists";
import { useGlobalUserId } from "@/components/globalContextProvider";
import MessageEditor from "@/components/messageEditor/MessageEditor";
import { BaselineArrowBackIosNew, RoleListIcon, Setting } from "@/icons";
import { avatarThumbUrl } from "@/utils/mediaUrl";
import { SpaceContext } from "../core/spaceContext";

function RoomSettingWindow({ onClose, roomId: propRoomId, defaultTab = "role" }: {
  onClose: () => void;
  roomId?: number;
  defaultTab?: "role" | "setting";
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
      case "setting":
        return "房间资料";
      case "role":
      default:
        return "角色";
    }
  }, [defaultTab]);

  const PageIcon = useMemo(() => {
    switch (defaultTab) {
      case "setting":
        return Setting;
      case "role":
      default:
        return RoleListIcon;
    }
  }, [defaultTab]);

  const flushRoomRedundant = useCallback((opts?: { closeAfter?: boolean }) => {
    if (!propRoomId || !Number.isFinite(propRoomId) || propRoomId <= 0)
      return;

    updateRoomMutation.mutate({
      roomId: propRoomId,
      name: (room?.name ?? "").trim(),
      description: room?.description ?? "",
      avatarFileId: room?.avatarFileId,
    }, {
      onSuccess: () => {
        if (opts?.closeAfter) {
          onClose();
        }
      },
    });
  }, [onClose, propRoomId, room?.avatarFileId, room?.description, room?.name, updateRoomMutation]);

  // 退出时自动保存
  const handleClose = () => {
    flushRoomRedundant({ closeAfter: true });
  };

  return (
    <RoomContext value={roomContext}>
      <div className="flex flex-col h-full w-full min-w-[40vw] bg-base-100 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-2 py-1 border-b border-base-300 bg-base-100">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="返回聊天"
            onClick={handleClose}
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
                  <div className="p-4 h-full min-h-0">
                    {(propRoomId && (room?.spaceId ?? spaceId))
                      ? (
                          <MessageEditor
                            className="h-[50vh] min-h-0 max-h-full rounded-md"
                            coverUrl={avatarThumbUrl(room?.avatarFileId)}
                            docId={propRoomId ? `room:${propRoomId}:description` : undefined}
                            title={room?.name ?? ""}
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

export default RoomSettingWindow;
