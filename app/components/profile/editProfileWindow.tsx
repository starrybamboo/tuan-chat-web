import type { UserInfoResponse } from "../../../api";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useState } from "react";
import { useGetUserInfoQuery, useUpdateUserInfoMutation } from "../../../api/queryHooks";

export default function EditProfileWindow({ onClose }: { onClose?: () => void }) {
  // 当前登录用户的userId
  const userId = useGlobalContext().userId ?? -1;

  const userQuery = useGetUserInfoQuery(userId);

  const user = userQuery.data?.data;

  const updateUserInfoMutation = useUpdateUserInfoMutation();

  const [username, setUsername] = useState(user?.username || "");
  const [newAvtarUrl, setNewAvtarUrl] = useState(user?.avatar || undefined);
  const handleSave = () => {
    if (onClose) {
      onClose();
    }
    const avatarUrl = (newAvtarUrl && newAvtarUrl !== "") ? newAvtarUrl : user?.avatar;
    updateUserInfoMutation.mutate({ ...user, username, avatar: avatarUrl } as UserInfoResponse);
  };
  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
    setUsername(user?.username || "");
  };

  return (
    <div>
      <div className="card bg-base-100 min-w-[20vw] max-w-[30vw] mx-auto">
        <div className="card-body">
          {/* 头像部分 */}
          <div className="flex flex-col items-center gap-4">
            <ImgUploaderWithCopper
              setCopperedDownloadUrl={(url) => {
                setNewAvtarUrl(url);
              }}
              fileName={`userId-${user?.userId}`}
            >
              <div className="relative group overflow-hidden rounded-full ring ring-offset-base-100 ring-offset-2">
                <img
                  src={newAvtarUrl || user?.avatar || undefined}
                  alt="Avatar"
                  className="w-24 h-24 mx-auto rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:brightness-75"
                />
                <div
                  className="rounded-full absolute inset-0 flex items-center justify-center opacity-0 opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-xs"
                >
                  <span className="font-medium px-2 py-1">
                    更新头像
                  </span>
                </div>
              </div>
            </ImgUploaderWithCopper>

            <div className="w-full max-w-xs flex items-center gap-2">
              <label className="label">
                <span className="label-text text-lg font-semibold">修改昵称</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入新昵称"
                className="input input-bordered input-lg w-full focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* 详细信息 */}
            <div className="divider w-full"></div>
            <div className="space-y-2 w-full max-w-xs">
              <div className="flex justify-between">
                <span className="text-base-content/70">用户ID</span>
                <span className="font-mono">{userId}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <button onClick={handleSave} className="btn btn-info px-8" type="button">
                保存
              </button>
              <button onClick={handleCancel} className="btn btn-ghost px-8" type="button">
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
