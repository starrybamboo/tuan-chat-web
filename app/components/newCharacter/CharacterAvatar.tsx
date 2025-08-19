import type { RoleAvatar } from "api";
import type { Role } from "./types";
import { useUploadAvatarMutation } from "@/../api/queryHooks";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useEffect, useState } from "react";
import { PopWindow } from "../common/popWindow";
import { AvatarPreview } from "./sprite/AvatarPreview";
import { CharacterCopper } from "./sprite/CharacterCopper";

interface CharacterAvatarProps {
  role: Role;
  roleAvatars: RoleAvatar[];
  selectedAvatarId: number;
  selectedAvatarUrl: string;
  selectedSpriteUrl: string | null;
  isLoading?: boolean;
  onchange: (avatarUrl: string, avatarId: number, spriteUrl?: string | null) => void;
  onSpritePreviewChange?: (spriteUrl: string | null) => void;
  onAvatarSelect: (avatarUrl: string, avatarId: number, spriteUrl: string | null) => void;
  onAvatarDelete: (avatarId: number) => void;
  onAvatarUpload: (data: any) => void;
}

export default function CharacterAvatar({
  role,
  roleAvatars,
  selectedAvatarId,
  selectedAvatarUrl,
  selectedSpriteUrl,
  onchange,
  onSpritePreviewChange,
  onAvatarSelect,
  onAvatarDelete,
  onAvatarUpload,
}: CharacterAvatarProps) {
  const queryClient = useQueryClient();

  // 保留一些内部 UI 状态
  const [showSprite, setShowSprite] = useState(() => {
    // PC端默认显示立绘，移动端显示头像
    return window.matchMedia("(min-width: 768px)").matches;
  });

  // 使用传入的状态作为内部 UI 状态
  const copperedUrl = selectedAvatarUrl || "/favicon.ico";
  const previewSrc = selectedSpriteUrl || "";
  const avatarId = selectedAvatarId;

  // 弹窗的打开和关闭
  const [changeAvatarConfirmOpen, setChangeAvatarConfirmOpen] = useSearchParamsState<boolean>(`changeAvatarPop`, false);
  // 删除弹窗用
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useSearchParamsState<boolean>(`deleteAvatarPop`, false);
  const [avatarToDeleteIndex, setAvatarToDeleteIndex] = useState<number | null>(null);

  // 响应式切换显示模式
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)"); // md breakpoint

    const handleResize = (e: MediaQueryListEvent) => {
      setShowSprite(e.matches);
    };

    mediaQuery.addEventListener("change", handleResize);
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  // 使用新的 hook
  const { mutate } = useUploadAvatarMutation();

  // post删除头像请求
  const { mutate: deleteAvatar } = useMutation({
    mutationKey: ["deleteRoleAvatar"],
    mutationFn: async (avatarId: number) => {
      const res = await tuanchat.avatarController.deleteRoleAvatar(avatarId);
      if (res.success) {
        console.warn("删除头像成功");
        queryClient.invalidateQueries({
          queryKey: ["getRoleAvatars", role.id],
          exact: true, // 确保精确匹配查询键
        });
      }
      else {
        console.error("删除头像失败");
      }
    },
  });

  // 点击头像处理
  const handleAvatarClick = (avatarUrl: string, index: number) => {
    const targetAvatar = roleAvatars[index];
    const nextSprite = targetAvatar.spriteUrl || avatarUrl || null;

    // 直接通知父组件状态变化，不再维护本地状态
    onAvatarSelect(targetAvatar.avatarUrl || "", targetAvatar.avatarId || 0, nextSprite);
  };

  // 删除操作处理
  const handleDeleteAvatar = (index: number) => {
    setAvatarToDeleteIndex(index);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAvatar = () => {
    if (avatarToDeleteIndex !== null && avatarToDeleteIndex >= 0 && avatarToDeleteIndex < roleAvatars.length) {
      const avatarToDelete = roleAvatars[avatarToDeleteIndex];
      const isCurrentlySelected = avatarToDelete.avatarId === selectedAvatarId;

      // 通知父组件和服务器删除头像
      onAvatarDelete(avatarToDelete.avatarId || 0);
      deleteAvatar(avatarToDelete.avatarId || 0);

      // 如果删除的是当前选中的头像，且还有其他头像，则选择第一个头像
      if (isCurrentlySelected && roleAvatars.length > 1) {
        // 找到第一个不是被删除头像的头像
        const firstAvatar = roleAvatars.find((avatar, index) => index !== avatarToDeleteIndex);
        if (firstAvatar) {
          const nextSprite = firstAvatar.spriteUrl || firstAvatar.avatarUrl || null;
          onAvatarSelect(firstAvatar.avatarUrl || "", firstAvatar.avatarId || 0, nextSprite);
        }
      }

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
    <div className="w-2xs flex justify-center">
      <div className="avatar cursor-pointer group flex items-center justify-center w-[50%] min-w-[120px] md:w-48" onClick={() => { setChangeAvatarConfirmOpen(true); }}>
        <div className="rounded-xl ring-primary ring-offset-base-100 w-full ring ring-offset-2 relative">
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
          <img
            src={role.avatar || "./favicon.ico"}
            alt="Character Avatar"
            className="object-cover transform group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      <PopWindow isOpen={changeAvatarConfirmOpen} onClose={handleCancelChangeAvatar}>
        <div className="h-full w-full flex flex-col">
          <div className="flex flex-col md:flex-row gap-4 min-h-0 justify-center">
            {/* 大图预览 */}
            <div className="w-full md:w-1/2 bg-base-200 p-2 rounded-lg order-1 md:order-1">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  角色
                  {showSprite ? "立绘" : "头像"}
                </h2>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowSprite(!showSprite)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  切换
                  {showSprite ? "头像" : "立绘"}
                </button>
              </div>
              <AvatarPreview
                mode="image"
                currentAvatarUrl={showSprite ? (previewSrc || "/favicon.ico") : (copperedUrl || "/favicon.ico")}
                characterName={role.name}
                className=""
                imageClassName="md:max-h-[65vh] md:min-h-[35vh]"
              />
            </div>

            <div className="w-full md:w-1/2 p-2 order-2 md:order-2">
              {/* 头像列表区域 */}
              <h2 className="text-xl font-bold mb-4">选择头像：</h2>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center bg-base-200 p-2">
                {roleAvatars.map((item, index) => (
                  <li
                    key={`${role.id}-${item.avatarUrl}`}
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
                      {/* 删除按钮 - 只有多个头像时才显示 */}
                      {roleAvatars.length > 1 && (
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 w-5 h-5 md:w-7 md:h-7 bg-gray-700 md:bg-gray-500/50 cursor-pointer text-white rounded-full flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:bg-gray-800 z-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAvatar(index);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                            <path
                              fill="currentColor"
                              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                            />
                          </svg>
                        </button>
                      )}
                      {/* 添加悬浮遮罩 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 rounded-lg"></div>
                    </div>
                    {/* 标题截断优化 */}
                    <p className="text-center w-full truncate max-w-full px-1 text-sm mt-1">
                      {item.avatarTitle}
                    </p>
                  </li>
                ))}
                {/* 添加新头像 */}
                <li className="relative w-full max-w-[128px] aspect-square flex flex-col items-center rounded-lg transition-colors">
                  <CharacterCopper
                    setDownloadUrl={() => { }}
                    setCopperedDownloadUrl={() => { }}
                    fileName={uniqueFileName}
                    scene={3} // 角色差分
                    mutate={(data) => {
                      // 通知父组件处理上传
                      onAvatarUpload({ ...data, roleId: role.id });
                      // 同时执行本地的上传逻辑
                      mutate({ ...data, roleId: role.id });
                    }}
                  >
                    <button
                      type="button"
                      className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-base-200 transition-all cursor-pointer relative group"
                    >
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

            {/* 添加头像聊天预览区域 */}
            <div className="w-1/2 gap-4 flex flex-col p-2 order-3 md:order-3">

              <AvatarPreview
                mode="full"
                currentAvatarUrl={copperedUrl || "/favicon.ico"}
                characterName={role.name}
                chatMessages={["你好！这是我的新头像", "看起来怎么样？"]}
                className="space-y-2"
              />

            </div>

            {/* 删除确认弹窗 */}
            <PopWindow isOpen={isDeleteModalOpen} onClose={cancelDeleteAvatar}>
              <div className="card">
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
          <div className="absolute bottom-5 right-5 md:bottom-10 md:right-10 card-actions justify-end">
            <button
              type="submit"
              onClick={() => {
                onchange(copperedUrl, avatarId, previewSrc || null);
                onSpritePreviewChange?.(previewSrc || null);
                setChangeAvatarConfirmOpen(false);
              }}
              className="btn btn-primary btn-md md:btn-lg"
            >
              确认更改头像
            </button>
          </div>
        </div>
      </PopWindow>
    </div>
  );
}
