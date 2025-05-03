import { SpaceContext } from "@/components/chat/spaceContext";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import {
  useDissolveSpaceMutation,
  useGetSpaceInfoQuery,
  useUpdateSpaceMutation,
} from "api/hooks/chatQueryHooks";
import { use, useState } from "react";
import { useNavigate } from "react-router";

function SpaceSettingWindow({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const spaceContext = use(SpaceContext);
  const spaceId = Number(spaceContext.spaceId);
  const getSpaceInfoQuery = useGetSpaceInfoQuery(spaceId ?? -1);
  const space = getSpaceInfoQuery.data?.data;

  // 使用状态管理表单数据
  const [formData, setFormData] = useState({
    name: space?.name || "",
    description: space?.description || "",
    avatar: space?.avatar || "",
  });

  // 当space数据加载时初始化formData
  if (space && formData.name === "" && formData.description === "" && formData.avatar === "") {
    setFormData({
      name: space.name || "",
      description: space.description || "",
      avatar: space.avatar || "",
    });
  }

  const dissolveSpaceMutation = useDissolveSpaceMutation();
  const updateSpaceMutation = useUpdateSpaceMutation();

  // 保存数据函数
  const handleSave = () => {
    updateSpaceMutation.mutate({
      spaceId,
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
      {space && (
        <div>
          <div className="flex justify-center">
            <ImgUploaderWithCopper
              setCopperedDownloadUrl={(url) => {
                setFormData(prev => ({ ...prev, avatar: url }));
              }}
              fileName={`spaceId-${space.spaceId}`}
            >
              <div className="relative group overflow-hidden rounded-lg">
                <img
                  src={formData.avatar || space.avatar}
                  alt={formData.name}
                  className="w-24 h-24 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm">
                  <span className="text-white font-medium px-2 py-1 rounded">
                    更新群头像
                  </span>
                </div>
              </div>
            </ImgUploaderWithCopper>
          </div>
          <div className="mb-4">
            <label className="label mb-2">
              <span className="label-text">空间名称</span>
            </label>
            <input
              type="text"
              value={formData.name}
              className="input input-bordered w-full"
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
              }}
            />
          </div>
          <div className="mb-4">
            <label className="label mb-2">
              <span className="label-text">空间描述</span>
            </label>
            <textarea
              value={formData.description}
              className="input w-full min-h-[100px] pt-2"
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
              }}
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
              onClick={() => dissolveSpaceMutation.mutate(spaceId, {
                onSuccess: () => {
                  onClose();
                  navigate("/chat");
                },
              })}
            >
              解散空间
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpaceSettingWindow;
