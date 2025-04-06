/* eslint-disable react-dom/no-missing-button-type */
import { useState } from "react";
import { ImgUploaderWithCopper } from "../avatarComponent/imgUploaderWithCopper";
import GainUserAvatar from "./gainUserAvatar";

interface HeadProps {
  onAvatarChange?: (avatarUrl: string) => void;
  currentAvatar?: string;
  userQuery: any;
  roleQuery: any;
}

export default function Head({ onAvatarChange, currentAvatar, userQuery, roleQuery }: HeadProps) {
  const [croppedAvatar, setCroppedAvatar] = useState<string | undefined>(undefined);

  return (
    <div className="h-155 p-2 w-full">
      <div className="text-center">
        <div className="m-auto w-32 h-32 bg-primary rounded-full flex items-center justify-center text-white text-2xl overflow-hidden">
          <img src={croppedAvatar || currentAvatar} alt="" className="w-full" />
        </div>
        <input
          type="text"
          className="m-auto w-80 h-9 bg-base-200 p-2 mt-3 input input-bordered"
          placeholder="输入标题"
        />
        <button className="ml-2 btn btn-dash inline-block h-9 rounded-none mt-3">
          更新标题
        </button>
      </div>
      <div className="w-full relative mt-5">
        {/* 选择和上传图像 */}
        <div className="border-t-2 border-white float-left p-2 w-full">
          <div className="mb-2">选择一个头像 :</div>
          <ImgUploaderWithCopper
            setDownloadUrl={(newUrl: string): void => {
              if (onAvatarChange) {
                onAvatarChange(newUrl);
              }
            }}
            setCopperedDownloadUrl={(newUrl: string): void => {
              setCroppedAvatar(newUrl); // 存储裁剪后的头像URL
              if (onAvatarChange) {
                onAvatarChange(newUrl); // 更新用户头像
              }
            }}
          >
            <button className="btn btn-dash m-auto block">
              <b className="text-white ml-0">+</b>
              上传新头像
            </button>
          </ImgUploaderWithCopper>
          <GainUserAvatar
            initialAvatar={currentAvatar}
            onAvatarChange={onAvatarChange || (() => {})}
            userQuery={userQuery}
            roleQuery={roleQuery}
          />
        </div>
      </div>
    </div>
  );
}
