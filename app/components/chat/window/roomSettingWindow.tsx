import type { RoomContextType } from "@/components/chat/core/roomContext";
import { RoomContext } from "@/components/chat/core/roomContext";
import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import RoleList from "@/components/chat/shared/components/roleLists";
import checkBack from "@/components/common/autoContrastText";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { useGlobalContext } from "@/components/globalContextProvider";
import { BaselineArrowBackIosNew, GirlIcon, Setting } from "@/icons";
import {
  useGetMemberListQuery,
  useGetRoomInfoQuery,
  useGetRoomModuleRoleQuery,
  useGetRoomRoleQuery,
  useUpdateRoomMutation,
} from "api/hooks/chatQueryHooks";
import { useGetUserRolesQuery } from "api/hooks/RoleAndAvatarHooks";
import { use, useEffect, useMemo, useState } from "react";
import { SpaceContext } from "../core/spaceContext";

function RoomSettingWindow({ onClose, roomId: propRoomId, defaultTab = "role" }: {
  onClose: () => void;
  roomId?: number;
  defaultTab?: "role" | "setting";
}) {
  const globalContext = useGlobalContext();
  const userId = globalContext.userId;

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
  const roomNpcRolesQuery = useGetRoomModuleRoleQuery(propRoomId ?? -1);
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

  // 使用状态管理表单数据
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatar: "",
  });

  // 当room数据加载时初始化formData
  useEffect(() => {
    if (room) {
      const shouldUpdate
        = formData.name === ""
          && formData.description === ""
          && formData.avatar === "";
      if (shouldUpdate) {
        setFormData({
          name: room.name || "",
          description: room.description || "",
          avatar: room.avatar || "",
        });
      }
    }
  }, [room, formData.name, formData.description, formData.avatar]);

  // 用于强制重置上传组件
  const [uploaderKey, setUploaderKey] = useState(0);

  const handleAvatarUpdate = (url: string) => {
    setFormData(prev => ({ ...prev, avatar: url }));
    // 上传完成后强制重置上传组件
    setUploaderKey(prev => prev + 1);
  };

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
        return GirlIcon;
    }
  }, [defaultTab]);

  // 头像文字颜色
  const [avatarTextColor, setAvatarTextColor] = useState("text-black");

  // 监听头像变化，自动调整文字颜色
  useEffect(() => {
    if (formData.avatar) {
      checkBack(formData.avatar).then(() => {
        const computedColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--text-color")
          .trim();
        setAvatarTextColor(computedColor === "white" ? "text-white" : "text-black");
      });
    }
  }, [formData.avatar]);

  // 保存数据函数
  const handleSave = () => {
    updateRoomMutation.mutate({
      roomId: propRoomId ?? -1,
      name: formData.name,
      description: formData.description,
      avatar: formData.avatar,
    }, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  // 退出时自动保存
  const handleClose = () => {
    handleSave();
  };

  return (
    <RoomContext value={roomContext}>
      <div className="flex flex-col h-full w-full min-w-[40vw] max-h-[80vh] bg-base-100 rounded-lg overflow-hidden">
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
              <div className="flex-1 min-h-0 overflow-y-auto">
                {defaultTab === "role" && (
                  <div className="space-y-2 p-4">
                    <div className="flex flex-row justify-center items-center gap-2 px-4">
                      <p>
                        房间角色 -
                        {roomRoles.length}
                      </p>
                    </div>
                    <RoleList roles={roomRoles} />
                  </div>
                )}

                {defaultTab === "setting" && (
                  <div className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* 左侧：房间信息 */}
                      <div className="md:w-96 shrink-0 space-y-4">
                        <div className="card bg-base-100 border border-base-300">
                          <div className="card-body p-4">
                            <div className="flex justify-center">
                              <ImgUploaderWithCopper
                                key={uploaderKey}
                                setCopperedDownloadUrl={handleAvatarUpdate}
                                fileName={`roomId-${room.roomId}`}
                              >
                                <div className="relative group overflow-hidden rounded-lg">
                                  <img
                                    src={formData.avatar || room.avatar}
                                    alt={formData.name}
                                    className="w-24 h-24 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm">
                                    <span className={`${avatarTextColor} font-bold px-2 py-1 rounded`}>
                                      更新头像
                                    </span>
                                  </div>
                                </div>
                              </ImgUploaderWithCopper>
                            </div>

                            <div className="mt-4">
                              <label className="label mb-2">
                                <span className="label-text">房间名称</span>
                              </label>
                              <input
                                type="text"
                                value={formData.name}
                                className="input input-bordered w-full"
                                onChange={(e) => {
                                  setFormData(prev => ({ ...prev, name: e.target.value }));
                                }}
                                placeholder="请输入房间名称..."
                              />
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* 右侧：房间描述文档 */}
                      <div className="flex-1 min-w-0">
                        {(propRoomId && (room?.spaceId ?? spaceId))
                          ? (
                              <BlocksuiteDescriptionEditor
                                spaceId={(room?.spaceId ?? spaceId)!}
                                docId={buildSpaceDocId({ kind: "room_description", roomId: propRoomId })}
                              />
                            )
                          : (
                              <div className="text-sm opacity-70">未选择房间或无法获取spaceId</div>
                            )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
      </div>
    </RoomContext>
  );
}

export default RoomSettingWindow;
