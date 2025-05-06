import { RoomContext } from "@/components/chat/roomContext";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import {
  useDissolveRoomMutation,
  useGetRoomInfoQuery,
  useUpdateRoomMutation,
} from "api/hooks/chatQueryHooks";
import { use, useState } from "react";
import { useNavigate } from "react-router";

function RoomSettingWindow({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const roomContext = use(RoomContext);
  // 获取群组数据
  const roomId = Number(roomContext.roomId);
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
              setCopperedDownloadUrl={(url) => {
                setFormData(prev => ({ ...prev, avatar: url }));
              }}
              fileName={`roomId-${room.roomId}`}
            >
              <div className="relative group overflow-hidden rounded-lg">
                <img
                  src={formData.avatar || room.avatar}
                  alt={formData.name}
                  className="w-24 h-24 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm">
                  <span className="text-white font-medium px-2 py-1 rounded">
                    更新房间头像
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
          <div className="flex justify-between mt-16">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClose}
            >
              保存并关闭
            </button>
            <button
              type="button"
              className="btn btn-error"
              onClick={() => dissolveRoomMutation.mutate(roomId, {
                onSuccess: () => {
                  onClose();
                  navigate("/chat");
                },
              })}
            >
              解散房间
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomSettingWindow;
