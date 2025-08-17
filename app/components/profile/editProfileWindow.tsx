import type { UserInfoResponse } from "../../../api";
import MarkdownEditor from "@/components/common/markdown/markdownEditor";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useState } from "react";
import { useGetUserInfoQuery, useUpdateUserInfoMutation } from "../../../api/queryHooks";

const DESCRIPTION_MAX = 253;
const NAME_MAX = 18;

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
    if (userDescription.length <= DESCRIPTION_MAX && username.length <= NAME_MAX) {
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
    <div className="card card-body">
      <div
        onClick={onClose}
        className="flex text-lg items-center gap-1 text-primary hover:text-primary-content cursor-pointer transition-colors mb-2 w-18"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 mr-1"
        >
          <path
            fillRule="evenodd"
            d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z"
            clipRule="evenodd"
          />
        </svg>
        返回
      </div>
      <h1 className="text-xl text-accent font-bold pb-4">更新个人资料</h1>
      <div className="flex flex-col gap-4">
        {/* 头像部分 */}
        <div className="flex flex-col md:flex-row gap-6 p-2 items-center">
          {/* 左侧 - 头像上传区域 */}
          <div className="flex flex-col items-center md:items-start gap-4 w-full md:w-auto">
            <ImgUploaderWithCopper
              setCopperedDownloadUrl={url => setNewAvtarUrl(url)}
              fileName={`userId-${user?.userId}`}
            >
              <div className="relative group overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-base-100">
                <img
                  src={newAvtarUrl || user?.avatar}
                  alt="Avatar"
                  className="w-40 h-40 mx-auto rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-0 transition-all duration-300 bg-black/20 backdrop-blur-xs rounded-full">
                  <span className="font-medium px-2 py-1 rounded-full">
                    更新头像
                  </span>
                </div>
              </div>
            </ImgUploaderWithCopper>
          </div>

          {/* 右侧 - 用户名和描述表单 */}
          <div className="flex-1 flex flex-col gap-6 p-2">
            {/* 用户名输入 */}
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
                    username.length > NAME_MAX
                      ? "border-error focus:border-primary"
                      : "focus:border-primary"
                  }`}
                />
              </label>
              <div
                key={errorShakeKey}
                style={{
                  animation: username.length > NAME_MAX ? "quick-shake 0.4s ease-in-out" : "none",
                }}
                className={`text-right text-sm overflow-hidden transition-all duration-300 ease-in-out pt-1 md:text-left md:ml-20 ${
                  username.length > NAME_MAX
                    ? "text-error max-h-8 opacity-100 translate-y-0"
                    : "max-h-0 opacity-0 translate-y-2"
                }`}
              >
                呜啊...名字最长只能30个字呢...
              </div>
            </div>

            {/* 个人描述 */}
            <div className="w-full flex flex-col gap-1 mt-2">
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
          </div>
        </div>

        <div className="border-t w-full"></div>

        <span className="text-lg font-semibold">ReadMe (支持 MarkDown 语法）</span>

        <MarkdownEditor defaultContent={user?.readMe} onChange={value => setContent(value)}></MarkdownEditor>
        <div className="flex items-center gap-4 mt-4">
          <button onClick={handleSave} className="btn btn-info px-16" type="button">
            保存
          </button>
          <button onClick={handleCancel} className="btn btn-ghost px-16" type="button">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
