import type { Role } from "./types";
import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useState } from "react";
import { ImgUploaderWithCopper } from "../common/uploader/imgUploaderWithCopper";

export default function CharacterAvatar({ role, onchange, isEditing }: {
  role: Role;
  onchange: (avatarUrl: string, avatarId: number) => void;
  isEditing: boolean;
}) {
  // 传入onchange,方便同步到之前的组件中
  const [avatarId, setAvatarId] = useState<number>(role.avatarId);
  // const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [copperedUrl, setCopperedUrl] = useState<string>(""); // 修正变量名

  async function createAvatar() {
    try {
      const res = await tuanchat.avatarController.setRoleAvatar({ roleId: role.id });
      if (res.success && res.data)
        await setAvatarId(res.data);
      return res.data;
    }
    catch (error: any) {
      const errorMessage
        = error.body?.errMsg
          || error.message
          || "创建头像失败";
      throw new Error(errorMessage);
    }
  }

  // 传入本文件中的avatarId,roleId,以便不修改imgUploaderWithCopper
  async function updateAvatar({
    avatarUrl,
    spriteUrl,
  }: {
    avatarUrl: string;
    spriteUrl: string;
  }) {
    try {
      const res = await tuanchat.avatarController.updateRoleAvatar({
        roleId: role.id,
        avatarId: avatarId || 0,
        avatarUrl,
        spriteUrl,
      });

      return res.data;
    }
    catch (error: any) {
      const errorMessage
        = error.body?.errMsg
          || error.message
          || "头像更新失败";
      throw new Error(errorMessage);
    }
  }

  const { mutate: createAvatarMutate } = useMutation({
    mutationKey: ["uploadAvatar"],
    mutationFn: createAvatar,
    onError: (error) => {
      console.error("创建头像失败:", error);
    },
  });

  const { mutate: updateAvatarMutate } = useMutation({
    mutationKey: ["updateAvatar"],
    mutationFn: updateAvatar,
    onSuccess: () => {
      onchange(copperedUrl, avatarId);
      setCopperedUrl("");
    },
    onError: (error) => {
      console.error("更新头像失败:", error);
    },
  });

  return (
    <div className="form-control w-full max-w-xs">
      <div className="flex flex-col items-center gap-4">
        {isEditing
          ? (
              <ImgUploaderWithCopper
                setDownloadUrl={() => {}}
                setCopperedDownloadUrl={setCopperedUrl}
                fileName={avatarId ? avatarId.toString() : ""}
                mutate={(data) => {
                  updateAvatarMutate(data);
                }}
              >
                <div className="avatar cursor-pointer group" onClick={() => { createAvatarMutate(); }}>
                  <div className="ring-primary ring-offset-base-100 w-48 ring ring-offset-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center z-10">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        点击更换头像
                      </span>
                    </div>
                    <img
                      src={copperedUrl || role.avatar || "/favicon.ico"}
                      alt="Character Avatar"
                      className="object-cover transform group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                </div>
              </ImgUploaderWithCopper>
            )
          : (
              <div className="avatar">
                <div className="ring-primary ring-offset-base-100 rounded-xl w-48 ring ring-offset-2">
                  <img
                    src={role.avatar || copperedUrl || "/favicon.ico"}
                    alt="Character Avatar"
                    className="object-cover"
                  />
                </div>
              </div>
            )}
      </div>
    </div>
  );
}
