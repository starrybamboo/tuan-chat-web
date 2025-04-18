import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useState } from "react";
import { ImgUploaderWithCopper } from "../common/uploader/imgUploaderWithCopper";

export default function CharacterAvatar({ roleId, onchange, avatarDeliverId, isEditing }: {
  roleId: number;
  onchange: (avatarUrl: string, avatarId: number) => void;
  avatarDeliverId: number;
  isEditing: boolean;
}) {
  // 传入onchange,方便同步到之前的组件中
  const [avatarId, setAvatarId] = useState<number>(avatarDeliverId);
  // const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [copperedUrl, setCopperedUrl] = useState<string>(""); // 修正变量名

  async function createAvatar() {
    try {
      const res = await tuanchat.avatarController.setRoleAvatar({ roleId });
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
        roleId,
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
    },
    onError: (error) => {
      console.error("更新头像失败:", error);
    },
  });

  return (
    <div className="form-control w-full max-w-xs">
      <div className="flex flex-col items-start gap-4">
        <div className="avatar">
          <div className="w-36 h-36">
            <img
              src={copperedUrl || "/default-avatar.png"}
              alt="Character Avatar"
              className="object-cover"
            />
          </div>
        </div>

        {isEditing && (
          <ImgUploaderWithCopper
            setDownloadUrl={() => {}}
            setCopperedDownloadUrl={setCopperedUrl}
            fileName={avatarId ? avatarId.toString() : ""}
            mutate={(data) => {
              updateAvatarMutate(data);
            }}
          >
            <div className="flex gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                onClick={() => { createAvatarMutate(); }}
              >
                {avatarId ? "更新头像" : "上传头像"}
              </button>
            </div>
          </ImgUploaderWithCopper>
        )}
      </div>
    </div>
  );
}
