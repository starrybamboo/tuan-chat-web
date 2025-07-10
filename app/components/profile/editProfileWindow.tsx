import type { UserInfoResponse } from "../../../api";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useState } from "react";
import { useGetUserInfoQuery, useUpdateUserInfoMutation } from "../../../api/queryHooks";

const DESCRIPTION_MAX = 253;

export default function EditProfileWindow({ onClose }: { onClose?: () => void }) {
  // 当前登录用户的userId
  const userId = useGlobalContext().userId ?? -1;

  const userQuery = useGetUserInfoQuery(userId);

  const user = userQuery.data?.data;

  const updateUserInfoMutation = useUpdateUserInfoMutation();
  // Shake it!!!
  const [errorShakeKey, setErrorShakeKey] = useState(0);
  const [username, setUsername] = useState(user?.username || "");
  const [userDescription, setUserDescription] = useState(user?.description || "");
  const [newAvtarUrl, setNewAvtarUrl] = useState(user?.avatar || undefined);
  const handleSave = () => {
    if (userDescription.length <= DESCRIPTION_MAX && username.length <= 30) {
      if (onClose) {
        onClose();
      }
      const avatarUrl = (newAvtarUrl && newAvtarUrl !== "") ? newAvtarUrl : user?.avatar;
      updateUserInfoMutation.mutate({ ...user, username, avatar: avatarUrl, description: userDescription } as UserInfoResponse);
    }
    else {
      setErrorShakeKey(prev => prev + 1);
    }
  };
  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
    setUsername(user?.username || "");
    setUserDescription(user?.username || "");
  };

  return (
    <div>
      <div className="card bg-base-100 min-w-[20vw] max-w-[90vw] mx-auto">
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
            {/* 用户名称 */}
            <div className="w-full max-w-xs flex gap-2 flex-col">
              <div className="label">
                <span className="label-text text-lg font-semibold">修改昵称</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="请输入新昵称"
                  className="input input-bordered input-lg w-full focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div
                key={errorShakeKey}
                style={{
                  animation: username.length > 30 ? "quick-shake 0.3s ease-in-out" : "none",
                }}
                className={`text-right text-sm overflow-hidden transition-all duration-300 ease-in-out ${
                  username.length > 30
                    ? "text-error max-h-8 opacity-100 translate-y-0"
                    : "max-h-0 opacity-0 translate-y-2"
                }`}
              >
                呜啊...名字最长只能30个字呢...
              </div>
            </div>
            {/* 个人描述 */}
            <div className="w-full max-w-xs flex flex-col gap-1">
              {/* 改为垂直布局 */}
              <label htmlFor="userDescription" className="label cursor-pointer">
                <span className="label-text text-lg font-medium">修改描述</span>
              </label>
              <textarea
                id="userDescription"
                name="userDescription"
                value={userDescription}
                onChange={e => setUserDescription(e.target.value)}
                placeholder={`请输入新描述（建议不超过 ${DESCRIPTION_MAX} 字）`}
                className="textarea textarea-bordered w-full min-h-24 max-h-48 resize-none focus:ring-2 focus:ring-primary focus:border-transparent" // 优化样式类
                rows={4}
                aria-label="用户描述输入框"
              />
              {/* 添加字数统计（可选） */}
              <div className={`text-right text-sm ${
                userDescription.length > DESCRIPTION_MAX ? "text-error" : "text-neutral-500"
              }`}
              >
                {userDescription.length}
                {" "}
                /
                {" "}
                {DESCRIPTION_MAX}
              </div>
              <div
                key={errorShakeKey}
                style={{
                  animation: userDescription.length > DESCRIPTION_MAX ? "quick-shake 0.3s ease-in-out" : "none",
                }}
                className={`text-right text-sm overflow-hidden transition-all duration-300 ease-in-out ${
                  userDescription.length > DESCRIPTION_MAX
                    ? "text-error max-h-8 opacity-100 translate-y-0"
                    : "max-h-0 opacity-0 translate-y-2"
                }`}
              >
                呜呜…太多的话我装不下啦///
              </div>
            </div>

            {/* 详细信息, 暂时没有 */}
            {/* <div className="divider w-full"></div> */}
            {/* 用户ID没有必要在这里显示，注释掉了 */}
            {/* <div className="space-y-2 w-full max-w-xs"> */}
            {/*  <div className="flex justify-between"> */}
            {/*    <span className="text-base-content/70">用户ID</span> */}
            {/*    <span className="font-mono">{userId}</span> */}
            {/*  </div> */}
            {/* </div> */}
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
