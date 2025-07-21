import type { UserInfoResponse } from "../../../api";
import MarkdownEditor from "@/components/common/markdown/markdownEditor";
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
  const [content, setContent] = useState(user?.readMe);
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
      updateUserInfoMutation.mutate({ ...user, username, avatar: avatarUrl, description: userDescription, readMe: content } as UserInfoResponse);
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
    <div className="card bg-base-100">
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
          <div className="w-full flex gap-2 flex-col">
            <label htmlFor="userName" className="label cursor-pointer">
              <span className="text-lg font-semibold">修改昵称</span>
              <input
                id="userName"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入新昵称"
                className={`input input-bordered input-lg w-full transition-all duration-200 ${
                  username.length > 30
                    ? "border-error focus:border-primary"
                    : "focus:border-primary"
                }`}
              />
            </label>
            <div
              key={errorShakeKey}
              style={{
                animation: username.length > 30 ? "quick-shake 0.4s ease-in-out" : "none",
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
          <div className="w-full flex flex-col gap-1">
            {/* 改为垂直布局 */}
            <label htmlFor="userDescription" className="label cursor-pointer">
              <span className="text-lg font-semibold">修改描述</span>
            </label>
            <textarea
              id="userDescription"
              name="userDescription"
              value={userDescription}
              onChange={e => setUserDescription(e.target.value)}
              placeholder={`请输入新描述（建议不超过 ${DESCRIPTION_MAX} 字）`}
              className={`textarea textarea-bordered w-full h-24 resize-none transition-all duration-200 text-[14px] lg:textarea-md ${
                userDescription.length > DESCRIPTION_MAX
                  ? "border-error focus:border-primary"
                  : "focus:border-primary"
              }`}
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
                animation: userDescription.length > DESCRIPTION_MAX ? "quick-shake 0.4s ease-in-out" : "none",
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
          <div className="border-t w-full"></div>
          <MarkdownEditor defaultContent={user?.readMe} onChange={value => setContent(value)}></MarkdownEditor>
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
  );
}
