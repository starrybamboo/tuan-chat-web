import { RoomContext } from "@/components/chat/roomContext";
import checkBack from "@/components/common/autoContrastText";
import ConfirmModal from "@/components/common/comfirmModel";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { MemberIcon, WebgalIcon } from "@/icons";
import {
  useDissolveRoomMutation,
  useGetRoomInfoQuery,
  useUpdateRoomMutation,
} from "api/hooks/chatQueryHooks";
import { use, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { SpaceContext } from "../spaceContext";

function RoomSettingWindow({ onClose, onShowMembers, onRenderDialog, roomId: propRoomId }: {
  onClose: () => void;
  onShowMembers: () => void;
  onRenderDialog: () => void;
  roomId?: number;
}) {
  const navigate = useNavigate();
  // 尝试获取context，如果不存在则为null
  let roomContext = null;
  let spaceContext = null;
  try {
    roomContext = use(RoomContext);
    spaceContext = use(SpaceContext);
  }
  catch (e) {
    console.warn(e);
    // context不存在，使用默认值
  }
  const setActiveRoomId = spaceContext?.setActiveRoomId;
  // 获取群组数据 - 优先使用props传入的roomId，否则使用context
  const roomId = propRoomId ?? Number(roomContext?.roomId);
  const getRoomInfoQuery = useGetRoomInfoQuery(roomId ?? -1);
  const room = getRoomInfoQuery.data?.data;
  // 解散群组
  const dissolveRoomMutation = useDissolveRoomMutation();
  const updateRoomMutation = useUpdateRoomMutation();

  // 使用状态管理表单数据
  const [formData, setFormData] = useState({
    name: room?.name || "",
    description: room?.description || "",
    avatar: room?.avatar || "",
  });

  // 用于强制重置上传组件
  const [uploaderKey, setUploaderKey] = useState(0);

  const handleAvatarUpdate = (url: string) => {
    setFormData(prev => ({ ...prev, avatar: url }));
    // 上传完成后强制重置上传组件
    setUploaderKey(prev => prev + 1);
  };

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

  // 当room数据加载时初始化formData
  if (room && formData.name === "" && formData.description === "" && formData.avatar === "") {
    setFormData({
      name: room.name || "",
      description: room.description || "",
      avatar: room.avatar || "",
    });
  }

  // 保存数据函数
  const handleSave = () => {
    updateRoomMutation.mutate({
      roomId,
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
    <div className="w-full p-4 min-w-[40vw]">
      {room && (
        <div>
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

          {/* 新增显示成员和渲染对话按钮 */}
          <div className="mb-4 flex gap-4">
            <button
              type="button"
              className="btn btn-outline btn-info flex-1 gap-2"
              onClick={() => {
                onShowMembers();
                onClose();
              }}
            >
              <MemberIcon className="size-5" />
              展示成员
            </button>
            <button
              type="button"
              className="btn btn-outline btn-secondary flex-1 gap-2"
              onClick={() => {
                onRenderDialog();
                onClose();
              }}
            >
              <WebgalIcon className="size-5" />
              渲染对话
            </button>
          </div>

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
      )}
      {/* 渲染删除群组的确认弹窗 */}
      <ConfirmModal
        isOpen={isDissolveConfirmOpen}
        onClose={() => setIsDissolveConfirmOpen(false)}
        title="确认解散房间"
        message="是否确定要解散该房间？此操作不可逆。"
        onConfirm={() => {
          dissolveRoomMutation.mutate(roomId, {
            onSuccess: () => {
              onClose();
              if (roomContext?.spaceId) {
                navigate(`/chat/${roomContext.spaceId}`, { replace: true });
              }
              setIsDissolveConfirmOpen(false);
              setActiveRoomId?.(null);
            },
          });
        }}
      />
    </div>
  );
}

export default RoomSettingWindow;
