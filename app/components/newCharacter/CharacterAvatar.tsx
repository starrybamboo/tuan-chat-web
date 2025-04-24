/* eslint-disable react-dom/no-missing-button-type */
import type { RoleAvatar } from "api";
import type { Role } from "./types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useState } from "react";
import { PopWindow } from "../common/popWindow";
import { ImgUploaderWithCopper } from "../common/uploader/imgUploaderWithCopper";

export default function CharacterAvatar({ role, onchange, isEditing }: {
  role: Role;
  onchange: (avatarUrl: string, avatarId: number) => void;
  isEditing: boolean;
}) {
  const queryClient = useQueryClient();
  // 传入onchange,方便同步到之前的组件中
  const [avatarId, setAvatarId] = useState<number>(role.avatarId);
  // const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [copperedUrl, setCopperedUrl] = useState<string>(""); // 修正变量名

  // head组件的迁移
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewText, setPreviewText] = useState(""); // 新增预览文字状态

  const [roleAvatars, setRoleAvatars] = useState<RoleAvatar[]>([]);
  const [currentAvatarIndex, setCurrentAvatarIndex] = useState<number>(0);

  // 弹窗的打开和关闭
  const [changeAvatarConfirmOpen, setChangeAvatarConfirmOpen] = useState<boolean>(false);
  // 删除弹窗用
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [avatarToDeleteIndex, setAvatarToDeleteIndex] = useState<number | null>(null);

  // async function createAvatar() {
  //   try {
  //     const res = await tuanchat.avatarController.setRoleAvatar({ roleId: role.id });
  //     if (res.success && res.data)
  //       await setAvatarId(res.data);
  //     return res.data;
  //   }
  //   catch (error: any) {
  //     const errorMessage
  //       = error.body?.errMsg
  //         || error.message
  //         || "创建头像失败";
  //     throw new Error(errorMessage);
  //   }
  // }

  // // 传入本文件中的avatarId,roleId,以便不修改imgUploaderWithCopper
  // async function updateAvatar({
  //   avatarUrl,
  //   spriteUrl,
  // }: {
  //   avatarUrl: string;
  //   spriteUrl: string;
  // }) {
  //   try {
  //     const res = await tuanchat.avatarController.updateRoleAvatar({
  //       roleId: role.id,
  //       avatarId: avatarId || 0,
  //       avatarUrl,
  //       spriteUrl,
  //     });

  //     return res.data;
  //   }
  //   catch (error: any) {
  //     const errorMessage
  //       = error.body?.errMsg
  //         || error.message
  //         || "头像更新失败";
  //     throw new Error(errorMessage);
  //   }
  // }

  // 创建新的头像
  // const { mutate: createAvatarMutate } = useMutation({
  //   mutationKey: ["uploadAvatar"],
  //   mutationFn: createAvatar,
  //   onError: (error) => {
  //     console.error("创建头像失败:", error);
  //   },
  // });

  // const { mutate: updateAvatarMutate } = useMutation({
  //   mutationKey: ["updateAvatar"],
  //   mutationFn: updateAvatar,
  //   onSuccess: () => {
  //     onchange(copperedUrl, avatarId);
  //     queryClient.invalidateQueries({
  //       queryKey: ["roleAvatar", role.id],
  //       exact: true, // 确保精确匹配查询键
  //     });
  //   },
  //   onError: (error) => {
  //     console.error("更新头像失败:", error);
  //   },
  // });

  // 获取角色所有老头像
  useQuery({
    queryKey: ["roleAvatar", role.id],
    queryFn: async () => {
      const res = await tuanchat.avatarController.getRoleAvatars(role.id);
      if (res.success && Array.isArray(res.data)) {
        setRoleAvatars(res.data);
        setCurrentAvatarIndex(res.data?.length > 0 ? 0 : -1);
      }
      return null;
    },
  });

  // 上传头像到服务器
  const { mutate } = useMutation({
    mutationKey: ["uploadAvatar"],
    mutationFn: async ({ avatarUrl, spriteUrl }: { avatarUrl: string; spriteUrl: string }) => {
      if (!avatarUrl || !role.id || !spriteUrl) {
        console.error("参数错误：avatarUrl 或 roleId 为空");
        return undefined;
      }

      try {
        const res = await tuanchat.avatarController.setRoleAvatar({
          roleId: role.id,
        });

        if (!res.success || !res.data) {
          console.error("头像创建失败", res);
          return undefined;
        }

        const avatarId = res.data;

        if (avatarId) {
          const uploadRes = await tuanchat.avatarController.updateRoleAvatar({
            roleId: role.id,
            avatarId,
            avatarUrl,
            spriteUrl,
          });

          if (!uploadRes.success) {
            console.error("头像更新失败", uploadRes);
            return undefined;
          }

          console.warn("头像上传成功");
          queryClient.invalidateQueries({ queryKey: ["roleAvatar", role.id] });
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
    onSuccess: () => {
      onchange(copperedUrl, avatarId);
    },
    onError: (error) => {
      console.error("Mutation failed:", error.message || error);
    },
  });

  // 迁移
  // post删除头像请求
  const { mutate: deleteAvatar } = useMutation({
    mutationKey: ["deleteRoleAvatar"],
    mutationFn: async (avatarId: number) => {
      const res = await tuanchat.avatarController.deleteRoleAvatar(avatarId);
      if (res.success) {
        console.warn("删除头像成功");
        queryClient.invalidateQueries({
          queryKey: ["roleAvatar", role.id],
          exact: true, // 确保精确匹配查询键
        });
      }
      else {
        console.error("删除头像失败");
      }
    },
  });

  // 删除操作处理
  const handleDeleteAvatar = (index: number) => {
    setAvatarToDeleteIndex(index);
    setIsDeleteModalOpen(true);
  };
  const confirmDeleteAvatar = () => {
    if (avatarToDeleteIndex !== null && avatarToDeleteIndex >= 0 && avatarToDeleteIndex < roleAvatars.length) {
      setRoleAvatars(prevRoleAvatars =>
        prevRoleAvatars.filter((_, i) => i !== avatarToDeleteIndex),
      );
      deleteAvatar(roleAvatars[avatarToDeleteIndex]?.avatarId || 0);
      setAvatarToDeleteIndex(null);
      setIsDeleteModalOpen(false);
    }
    else {
      console.error("无效的头像索引");
      setIsDeleteModalOpen(false);
    }
  };

  const cancelDeleteAvatar = () => {
    setAvatarToDeleteIndex(null);
    setIsDeleteModalOpen(false);
  };
  const handleCancelChangeAvatar = () => {
    setChangeAvatarConfirmOpen(false);
  };

  // 点击头像处理 (新增预览文字更新)
  const handleAvatarClick = (avatarUrl: string, index: number) => {
    const targetAvatar = roleAvatars[index];
    setPreviewSrc(targetAvatar.spriteUrl || avatarUrl);
    setPreviewText(targetAvatar.avatarTitle || ""); // 同步更新预览文字
    setCurrentAvatarIndex(index);
    setCopperedUrl(roleAvatars[index]?.avatarUrl || "");
    setAvatarId(roleAvatars[index]?.avatarId || 0);
  };

  // 辅助函数生成唯一文件名
  const generateUniqueFileName = (roleId: number): string => {
    const timestamp = Date.now();
    return `avatar-${roleId}-${timestamp}`;
  };

  // 生成唯一文件名
  const uniqueFileName = generateUniqueFileName(role.id);

  return (
    <div className="form-control w-full max-w-xs">
      <div className="flex flex-col items-center gap-4">
        {isEditing
          ? (
              <div className="avatar cursor-pointer group" onClick={() => { setChangeAvatarConfirmOpen(true); }}>
                <div className="ring-primary ring-offset-base-100 w-48 ring ring-offset-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center z-10">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      点击更换头像
                    </span>
                  </div>
                  <img
                    src={copperedUrl || role.avatar}
                    alt="Character Avatar"
                    className="object-cover transform group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
            )
          : (
              <div className="avatar">
                <div className="ring-primary ring-offset-base-100 rounded-xl w-48 ring ring-offset-2">
                  <img
                    src={role.avatar}
                    alt="Character Avatar"
                    className="object-cover"
                  />
                </div>
              </div>
            )}
      </div>
      <PopWindow isOpen={changeAvatarConfirmOpen} onClose={handleCancelChangeAvatar}>
        <div className="h-220 p-2 w-400 block">
          <div className="w-full relative mt-5">
            {/* 选择和上传图像 */}
            <div className="border-t-2 border-white float-left p-2 w-full">
              <div className="mb-2">选择一个头像 :</div>
              <ImgUploaderWithCopper
                setDownloadUrl={() => { }}
                setCopperedDownloadUrl={setCopperedUrl}
                fileName={uniqueFileName}
                mutate={(data) => {
                  mutate(data);
                }}
              >
                <button className="btn btn-dash m-auto block">
                  <b className="text-white ml-0">+</b>
                  上传新头像
                </button>
              </ImgUploaderWithCopper>
              <div className="w-full relative mt-5 flex gap-4">
                {" "}
                {/* 选择和更新图像 */}
                <div className="flex-1">
                  {" "}
                  {/* 原 w-6/10 */}
                  <div className="mt-5 ml-2 space-y-2">
                    <p>
                      角色
                      {" "}
                      ID
                      {" "}
                      :
                      {" "}
                      {role.id || "未设置"}
                    </p>
                    <p>
                      头像
                      {" "}
                      ID
                      {" "}
                      :
                      {" "}
                      {
                        roleAvatars[currentAvatarIndex]?.avatarId || "未设置"
                      }
                    </p>
                    <p>
                      表情差分数量
                      {" "}
                      :
                      {" "}
                      {roleAvatars.length}
                    </p>
                  </div>

                  {/* 头像列表区域 */}
                  <ul className="w-full mt-5">
                    <div className="grid grid-cols-3 gap-4 justify-items-center">
                      {roleAvatars.map((item, index) => (
                        <li
                          key={item.avatarUrl}
                          className="relative w-32 h-36 flex flex-col items-center rounded-lg transition-colors"
                          onClick={() => handleAvatarClick(item.avatarUrl as string, index)}
                        >
                          {/* 头像卡片容器 */}
                          <div className="relative w-full h-full group">
                            <img
                              src={item.avatarUrl}
                              alt="头像"
                              className="w-30 h-30 object-contain rounded-lg border"
                            />
                            {/* 删除按钮  */}
                            <button
                              className="absolute -top-2 -right-2 w-7 h-7 bg-gray-500/50 cursor-pointer text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gray-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAvatar(index);
                              }}
                            >
                              ×
                            </button>
                          </div>
                          {/* 标题截断优化 */}
                          <p className="text-center w-full truncate max-w-full px-1 text-sm mt-1">
                            {item.avatarTitle}
                          </p>
                        </li>
                      ))}
                    </div>
                  </ul>
                </div>

                {/* 大图预览 */}
                <div className="flex-1 bg-base-200 p-3 rounded-lg h-full flex flex-col">
                  <p className="text-center font-medium mb-3">大图预览</p>

                  {/* 图片预览容器 */}
                  <div className="flex-1 bg-gray-50 rounded border">
                    {/* 未来如果支持默认图片的话，别忘了在这也加一个喵 */}
                    <img
                      src={previewSrc}
                      alt="预览"
                      className="w-full h-full max-h-[400px] object-contain p-2"
                    />
                  </div>

                  {/* 描述区域 */}
                  <div className="pt-6 p-3">
                    {previewText
                      ? (
                          <pre className="whitespace-pre-wrap text-center break-words font-sans text-sm leading-relaxed">
                            {previewText}
                          </pre>
                        )
                      : (
                          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                            点击左侧头像查看描述
                          </div>
                        )}
                  </div>
                  <button
                    type="submit"
                    onClick={() => {
                      setChangeAvatarConfirmOpen(false);
                      onchange(copperedUrl, avatarId);
                      setCopperedUrl("");
                      setPreviewSrc("");
                      setPreviewText("");
                    }}
                    className="btn btn-primary"
                  >
                    确认
                  </button>
                </div>

                {/* 删除确认弹窗 */}
                <PopWindow isOpen={isDeleteModalOpen} onClose={cancelDeleteAvatar}>
                  <div className="flex flex-col items-center p-4">
                    <h3 className="text-lg font-bold mb-3">确认删除头像？</h3>
                    <p className="mb-4 text-gray-600">该操作不可撤销</p>
                    {/* 这个操作是独立于保存的，未来应该搞一个暂存，如果用户点保存，就不删除后台数据 */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={cancelDeleteAvatar}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={confirmDeleteAvatar}
                      >
                        确认删除
                      </button>
                    </div>
                  </div>
                </PopWindow>
              </div>
            </div>
          </div>
        </div>
      </PopWindow>
    </div>
  );
}
