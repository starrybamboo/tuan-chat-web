import type { RoomContextType } from "@/components/chat/roomContext";
import { RoomContext } from "@/components/chat/roomContext";
import RoleList from "@/components/chat/smallComponents/roleLists";
import RenderWindow from "@/components/chat/window/renderWindow";
import checkBack from "@/components/common/autoContrastText";
import ConfirmModal from "@/components/common/comfirmModel";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { useGlobalContext } from "@/components/globalContextProvider";
import { GirlIcon, Setting, WebgalIcon } from "@/icons";
import {
  useDissolveRoomMutation,
  useGetMemberListQuery,
  useGetRoomInfoQuery,
  useGetRoomModuleRoleQuery,
  useGetRoomRoleQuery,
  useUpdateRoomMutation,
} from "api/hooks/chatQueryHooks";
import { useGetUserRolesQuery } from "api/hooks/RoleAndAvatarHooks";
import { use, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { SpaceContext } from "../spaceContext";

function RoomSettingWindow({ onClose, roomId: propRoomId, defaultTab = "role" }: {
  onClose: () => void;
  roomId?: number;
  defaultTab?: "role" | "setting" | "render";
}) {
  const navigate = useNavigate();
  const globalContext = useGlobalContext();
  const userId = globalContext.userId;

  // 获取context，可能为null（当组件在SpaceContext.Provider外部使用时）
  const spaceContext = use(SpaceContext);
  const setActiveRoomId = spaceContext?.setActiveRoomId;
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
  const dissolveRoomMutation = useDissolveRoomMutation();
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

  // 控制删除群组的确认弹窗显示
  const [isDissolveConfirmOpen, setIsDissolveConfirmOpen] = useState(false);

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
      <div className="flex flex-row gap-4 h-full w-full max-w-3xl">
        {room && (
          <div className="tabs tabs-lift h-full">
            {/* 角色管理 */}
            <label className="tab">
              <input
                type="radio"
                name="room_setting_tabs"
                defaultChecked={defaultTab === "role"}
              />
              <GirlIcon className="size-4" />
              角色
            </label>
            <div className="tab-content space-y-2 p-4 overflow-y-auto">
              <div className="flex flex-row justify-center items-center gap-2 px-4">
                <p>
                  房间角色 -
                  {roomRoles.length}
                </p>
              </div>
              <RoleList roles={roomRoles} />
            </div>

            {/* 基本设置 */}
            <label className="tab">
              <input type="radio" name="room_setting_tabs" defaultChecked={defaultTab === "setting"} />
              <Setting className="size-4" />
              设置
            </label>
            <div className="tab-content p-4 overflow-y-auto">
              <div className="w-full max-w-md mx-auto">
                {/* 头像上传 */}
                <div className="flex justify-center mb-6">
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

                {/* 房间名称 */}
                <div className="mb-4">
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

                {/* 房间描述 */}
                <div className="mb-4">
                  <label className="label mb-2">
                    <span className="label-text">房间描述</span>
                  </label>
                  <textarea
                    value={formData.description}
                    className="textarea w-full min-h-[100px]"
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, description: e.target.value }));
                    }}
                    rows={4}
                    placeholder="请输入房间描述..."
                  />
                </div>
              </div>

              {/* 保存和删除按钮 */}
              <div className="flex justify-between mt-16">
                <button
                  type="button"
                  className="btn btn-error"
                  onClick={() => setIsDissolveConfirmOpen(true)}
                >
                  解散房间
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleClose}
                >
                  保存并关闭
                </button>
              </div>
            </div>

            {/* 渲染对话 */}
            <label className="tab">
              <input
                type="radio"
                name="room_setting_tabs"
                defaultChecked={defaultTab === "render"}
              />
              <WebgalIcon className="size-4 mr-1" />
              渲染
            </label>
            <div className="tab-content p-4 overflow-y-auto">
              <RenderWindow></RenderWindow>
            </div>
          </div>
        )}

        {/* 渲染删除群组的确认弹窗 */}
        <ConfirmModal
          isOpen={isDissolveConfirmOpen}
          onClose={() => setIsDissolveConfirmOpen(false)}
          title="确认解散房间"
          message="是否确定要解散该房间？此操作不可逆。"
          onConfirm={() => {
            dissolveRoomMutation.mutate(propRoomId ?? -1, {
              onSuccess: () => {
                onClose();
                if (spaceContext?.spaceId) {
                  navigate(`/chat/${spaceContext.spaceId}`, { replace: true });
                }
                setIsDissolveConfirmOpen(false);
                setActiveRoomId?.(null);
              },
            });
          }}
        />
      </div>
    </RoomContext>
  );
}

export default RoomSettingWindow;
