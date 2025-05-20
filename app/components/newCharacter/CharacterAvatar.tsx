/* eslint-disable react-dom/no-missing-button-type */
import type { RoleAvatar } from "api";
import type { Role } from "./types";
import { useUploadAvatarMutation } from "@/../api/queryHooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useState } from "react";
import { PopWindow } from "../common/popWindow";
import { CharacterCopper } from "./CharacterCopper";

export default function CharacterAvatar({ role, onchange }: {
  role: Role;
  onchange: (avatarUrl: string, avatarId: number) => void;
}) {
  const queryClient = useQueryClient();
  // const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [avatarId, setAvatarId] = useState<number>(role.avatarId);
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

  // 使用新的 hook
  const { mutate } = useUploadAvatarMutation();

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
    setAvatarId(roleAvatars[index]?.avatarId || 0);
    // onchange(avatarUrl, roleAvatars[index]?.avatarId || 0, false);
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
      <div className="flex flex-col items-center">
        <div className="avatar cursor-pointer group flex items-center justify-center w-full sm:w-40 md:w-48" onClick={() => { setChangeAvatarConfirmOpen(true); }}>
          <div className="rounded-xl ring-primary ring-offset-base-100 w-36 sm:w-40 md:w-48 ring ring-offset-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
            <img
              src={role.avatar || "./favicon.ico"}
              alt="Character Avatar"
              className="object-cover transform group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>

      </div>

      <PopWindow isOpen={changeAvatarConfirmOpen} onClose={handleCancelChangeAvatar}>
        <div className="h-full w-full p-4 flex flex-col">
          <div className="flex flex-col md:flex-row gap-4 min-h-0 justify-center">
            {/* 大图预览 */}
            <div className="w-full md:w-1/2 bg-base-200 p-3 rounded-lg order-2 md:order-1">
              <h2 className="text-xl font-bold mb-4">角色立绘</h2>
              <div className="h-[90%] bg-gray-50 rounded border flex items-center justify-center overflow-hidden">
                <img
                  src={previewSrc || "/favicon.ico"}
                  alt="预览"
                  className="w-full object-contain"
                />
              </div>
            </div>

            <div className="w-full md:w-1/2 p-3 order-1 md:order-2">
              {/* 头像列表区域 */}
              <h2 className="text-xl font-bold mb-4">选择头像：</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
                {roleAvatars.map((item, index) => (
                  <li
                    key={item.avatarUrl}
                    className="relative w-full max-w-[128px] flex flex-col items-center rounded-lg transition-colors"
                    onClick={() => handleAvatarClick(item.avatarUrl as string, index)}
                  >
                    {/* 头像卡片容器 */}
                    <div className="relative w-full aspect-square group cursor-pointer">
                      <img
                        src={item.avatarUrl}
                        alt="头像"
                        className={`w-full h-full object-contain rounded-lg transition-all duration-300 group-hover:scale-105 ${item.avatarUrl === copperedUrl ? "border-2 border-primary" : "border"}`}
                      />
                      {/* 删除按钮  */}
                      <button
                        className="absolute -top-2 -right-2 w-7 h-7 bg-gray-500/50 cursor-pointer text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gray-800 z-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAvatar(index);
                        }}
                      >
                        ×
                      </button>
                      {/* 添加悬浮遮罩 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 rounded-lg"></div>
                    </div>
                    {/* 标题截断优化 */}
                    <p className="text-center w-full truncate max-w-full px-1 text-sm mt-1">
                      {item.avatarTitle}
                    </p>
                  </li>
                ))}
                <li className="relative w-full max-w-[128px] aspect-square flex flex-col items-center rounded-lg transition-colors">
                  <CharacterCopper
                    setDownloadUrl={() => { }}
                    setCopperedDownloadUrl={setCopperedUrl}
                    fileName={uniqueFileName}
                    mutate={(data) => {
                      mutate({ ...data, roleId: role.id });
                    }}
                  >
                    <button className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-base-200 transition-all cursor-pointer relative group">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full text-gray-400 transition-transform duration-300 group-hover:scale-105"
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
                  </CharacterCopper>
                </li>
              </div>
            </div>

            {/* 删除确认弹窗 */}
            <PopWindow isOpen={isDeleteModalOpen} onClose={cancelDeleteAvatar}>
              <div className="card w-96">
                <div className="card-body items-center text-center">
                  <h2 className="card-title text-2xl font-bold">确认删除头像</h2>
                  <div className="divider"></div>
                  <p className="text-lg opacity-75 mb-8">确定要删除这个头像吗？</p>
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
          <div className="card-actions justify-end">
            <button
              type="submit"
              onClick={() => {
                setChangeAvatarConfirmOpen(false);
                onchange(copperedUrl, avatarId);
              }}
              className="btn btn-primary mt-2"
            >
              确认更改头像
            </button>
          </div>
        </div>

      </PopWindow>
    </div>
  );
}
