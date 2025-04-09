/* eslint-disable react-dom/no-missing-button-type */
import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useState } from "react";
import { ImgUploaderWithCopper } from "../common/uploader/imgUploaderWithCopper";
import GainUserAvatar from "./gainUserAvatar";

interface HeadProps {
  onAvatarChange?: (avatarUrl: string) => void;
  onAvatarIdChange: (index: number) => void;
  roleId: number;
  currentAvatar?: string;
  userQuery: any;
  roleQuery: any;
}

export default function Head({ onAvatarChange, onAvatarIdChange, roleId, currentAvatar, userQuery, roleQuery }: HeadProps) {
  const [recordNewAvatar, setRecordNewAvatar] = useState<number | null>(null);
  // 上传头像到服务器
  const { mutate } = useMutation({
    mutationKey: ["uploadAvatar"],
    mutationFn: async (avatarUrl: string) => {
      if (!avatarUrl || !roleId) {
        console.error("参数错误：avatarUrl 或 roleId 为空");
        return undefined;
      }

      try {
        const res = await tuanchat.avatarController.setRoleAvatar({
          roleId,
        });

        if (!res.success || !res.data) {
          console.error("头像创建失败", res);
          return undefined;
        }

        const avatarId = res.data;
        setRecordNewAvatar(avatarId || null);

        if (avatarId) {
          const uploadRes = await tuanchat.avatarController.updateRoleAvatar({
            roleId,
            avatarId,
            avatarUrl,
          });

          if (!uploadRes.success) {
            console.error("头像更新失败", uploadRes);
            return undefined;
          }

          console.warn("头像上传成功");
          return uploadRes;
        }
        else {
          console.error("头像ID无效");
          return undefined;
        }
      }
      catch (error) {
        console.error("头像上传请求失败", error);
        throw error; // 将错误抛给 onError 处理
      }
    },
    onError: (error) => {
      console.error("Mutation failed:", error.message || error);
    },
  });

  return (
    <div className="h-155 p-2 w-full">
      <div className="text-center">
        <div className="m-auto w-32 h-32 bg-primary rounded-full flex items-center justify-center text-white text-2xl overflow-hidden">
          <img src={currentAvatar} alt="" className="w-full" />
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
                onAvatarIdChange(recordNewAvatar || 0);
              }
            }}
            setCopperedDownloadUrl={(newUrl: string): void => {
              if (onAvatarChange) {
                onAvatarChange(newUrl); // 更新用户头像
                onAvatarIdChange(recordNewAvatar || 0);
                mutate(newUrl);
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
            roleId={roleId}
            onAvatarChange={onAvatarChange || (() => {})}
            onAvatarIdChange={onAvatarIdChange || (() => {})}
            userQuery={userQuery}
            roleQuery={roleQuery}
          />
        </div>
      </div>
    </div>
  );
}
