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
  // const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [copperedUrl, setCopperedUrl] = useState<string>(role.avatar || "/favicon.ico"); // 修正变量名

  // head组件的迁移
  const [previewSrc, setPreviewSrc] = useState<string | null>("");
  const [roleAvatars, setRoleAvatars] = useState<RoleAvatar[]>([]);
  // 弹窗的打开和关闭
  const [changeAvatarConfirmOpen, setChangeAvatarConfirmOpen] = useState<boolean>(false);
  // 删除弹窗用
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [avatarToDeleteIndex, setAvatarToDeleteIndex] = useState<number | null>(null);

  // 获取角色所有老头像
  useQuery({
    queryKey: ["roleAvatar", role.id],
    queryFn: async () => {
      const res = await tuanchat.avatarController.getRoleAvatars(role.id);
      setRoleAvatars(res.data || []);
      if (res.success && Array.isArray(res.data)) {
        if (role.avatarId !== 0) {
          setCopperedUrl(res.data.find(ele => ele.avatarId === role.avatarId)?.avatarUrl || "/favicon.ico");
          setPreviewSrc(res.data.find(ele => ele.avatarId === role.avatarId)?.spriteUrl || null);
        }
        else {
          setCopperedUrl("/favicon.ico");
          setPreviewSrc("");
        }
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
          await queryClient.invalidateQueries({ queryKey: ["roleAvatar", role.id] });
          setCopperedUrl(avatarUrl);
          setPreviewSrc(spriteUrl);
          onchange(avatarUrl, avatarId);
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

  // 点击头像处理 (新增预览文字更新)
  const handleAvatarClick = (avatarUrl: string, index: number) => {
    const targetAvatar = roleAvatars[index];
    setPreviewSrc(targetAvatar.spriteUrl || avatarUrl);
    setCopperedUrl(roleAvatars[index]?.avatarUrl || "");
    onchange(avatarUrl, roleAvatars[index]?.avatarId || 0);
  };

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
                    src={role.avatar || "/favicon.ico"}
                    alt="Character Avatar"
                    className="object-cover"
                  />
                </div>
              </div>
            )}

      </div>

      <PopWindow isOpen={changeAvatarConfirmOpen} onClose={handleCancelChangeAvatar}>
        <div className="h-200 p-2 w-300 block relative">
          <div className="w-full relative mt-5">
            {/* 选择和上传图像 */}
            <div className="border-t-2 border-white float-left p-2 w-full">
              <div className="w-full relative mt-5 flex gap-4">
                {/* 大图预览 */}
                <div className="flex-1 bg-base-200 p-3 rounded-lg h-full flex flex-col">
                  <p className="text-center font-medium mb-3">大图预览</p>

                  {/* 图片预览容器 */}
                  <div className="max-h-[700px] min-h-[300px] bg-gray-50 rounded border flex items-center justify-center overflow-hidden">
                    <img
                      src={previewSrc || "/favicon.ico"}
                      alt="预览"
                      className="max-w-full max-h-[700px] object-contain p-2"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  {/* 头像列表区域 */}
                  <ul className="w-full mt-5">
                    <div className="grid grid-cols-4 gap-4 justify-items-center">
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
                      <li className="relative w-48 h-48 flex flex-col items-center rounded-lg transition-colors">
                        <ImgUploaderWithCopper
                          setDownloadUrl={() => { }}
                          setCopperedDownloadUrl={setCopperedUrl}
                          fileName={uniqueFileName}
                          mutate={(data) => {
                            mutate(data);
                          }}
                        >
                          <button className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-base-200 transition-all cursor-pointer">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-28 w-28 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          </button>
                        </ImgUploaderWithCopper>
                      </li>
                    </div>
                  </ul>
                </div>

                {/* 删除确认弹窗 */}
                <PopWindow isOpen={isDeleteModalOpen} onClose={cancelDeleteAvatar}>
                  <div className="card w-96">
                    <div className="card-body items-center text-center">
                      <h2 className="card-title text-2xl font-bold">确认删除角色</h2>
                      <div className="divider"></div>
                      <p className="text-lg opacity-75 mb-8">确定要删除这个角色吗？</p>
                    </div>
                  </div>
                  <div className="card-actions justify-center gap-6 mt-8">
                    <button type="button" className="btn btn-outline" onClick={cancelDeleteAvatar}>
                      取消
                    </button>
                    <button type="button" className="btn btn-error" onClick={confirmDeleteAvatar}>
                      删除
                    </button>
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
