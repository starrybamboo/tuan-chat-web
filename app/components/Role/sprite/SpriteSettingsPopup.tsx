import type { RoleAvatar } from "api";
import type { Role } from "../types";

import { PopWindow } from "@/components/common/popWindow";
import { isMobileScreen } from "@/utils/getScreenSize";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useUploadAvatarMutation } from "api/queryHooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MoodSettingsTab } from "./Tabs/MoodSettingsTab";
import { PreviewTab } from "./Tabs/PreviewTab";
import { SpriteCropper } from "./Tabs/SpriteCropper";
import { SpriteListGrid } from "./Tabs/SpriteListGrid";

export type SettingsTab = "cropper" | "avatarCropper" | "preview" | "mood";

interface SpriteSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: SettingsTab;

  // 立绘相关
  spritesAvatars: RoleAvatar[];
  roleAvatars: RoleAvatar[];
  currentSpriteIndex: number;
  characterName: string;

  // 外部同步回调（仅在特定操作时调用）
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  // 同步外部立绘索引
  onSpriteIndexChange?: (index: number) => void;
  // 角色信息（用于删除功能）
  role?: Role;
}

/**
 * 立绘设置弹窗组件
 * 左侧固定显示头像列表，右侧 tab 切换不同功能：预览、立绘校正、头像校正、情感设定
 * 内部维护共享的立绘索引状态
 */
export function SpriteSettingsPopup({
  isOpen,
  onClose,
  defaultTab = "preview",
  spritesAvatars,
  roleAvatars,
  currentSpriteIndex,
  characterName,
  onAvatarChange,
  onSpriteIndexChange,
  role,
}: SpriteSettingsPopupProps) {
  // 内部维护 tab 状态
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

  // ========== 内部共享的立绘索引 ==========
  // 使用外部传入的 currentSpriteIndex 作为初始值
  const [internalIndex, setInternalIndex] = useState(() => {
    // 确保初始索引在有效范围内
    if (spritesAvatars.length > 0) {
      return Math.max(0, Math.min(currentSpriteIndex, spritesAvatars.length - 1));
    }
    return 0;
  });

  // 记录上次的 isOpen 状态，用于检测弹窗打开
  const [wasOpen, setWasOpen] = useState(false);

  // 当前选中的头像数据
  const currentAvatar = useMemo(() => {
    if (spritesAvatars.length > 0 && internalIndex < spritesAvatars.length) {
      return spritesAvatars[internalIndex] || null;
    }
    return null;
  }, [spritesAvatars, internalIndex]);

  // 当前选中的立绘 URL
  const currentSpriteUrl = currentAvatar?.spriteUrl || null;

  // ========== 上传功能 ==========
  const queryClient = useQueryClient();
  const { mutate: uploadAvatar } = useUploadAvatarMutation();

  // Notification state for upload feedback
  const [uploadNotification, setUploadNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (uploadNotification) {
      const timer = setTimeout(() => {
        setUploadNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadNotification]);

  // Update avatar title mutation for first avatar auto-naming
  const { mutate: updateAvatarTitle } = useMutation({
    mutationKey: ["updateAvatarTitle"],
    mutationFn: async ({ avatarId, title }: { avatarId: number; title: string }) => {
      const avatarsForUpdate = roleAvatars || spritesAvatars;
      const targetAvatar = avatarsForUpdate.find((a: RoleAvatar) => a.avatarId === avatarId);
      if (!targetAvatar) {
        console.error("未找到要更新的头像");
        return;
      }

      const res = await tuanchat.avatarController.updateRoleAvatar({
        ...targetAvatar,
        avatarTitle: {
          ...targetAvatar.avatarTitle,
          label: title,
        },
      });

      if (res.success) {
        console.warn("更新头像名称成功");
        queryClient.invalidateQueries({
          queryKey: ["getRoleAvatars", role?.id],
          exact: true,
        });
      }
      else {
        console.error("更新头像名称失败");
      }
    },
  });

  // Handle avatar upload
  const handleAvatarUpload = useCallback(async (data: any) => {
    if (!role?.id) {
      setUploadNotification({
        type: "error",
        message: "角色信息缺失，无法上传头像",
      });
      return;
    }

    try {
      // Upload avatar with transform data (autoApply: false to prevent auto-switching)
      uploadAvatar(
        { ...data, roleId: role.id, autoApply: false },
        {
          onSuccess: async () => {
            try {
              // Refresh avatar list
              await queryClient.invalidateQueries({
                queryKey: ["getRoleAvatars", role.id],
                exact: true,
              });

              // Get updated avatar list
              const list = await tuanchat.avatarController.getRoleAvatars(role.id);
              const avatars = list?.data ?? [];

              // If this is the first avatar, auto-name it "默认"
              if (avatars.length === 1) {
                const firstAvatar = avatars[0];
                const currentLabel = firstAvatar?.avatarTitle?.label;

                // Only set default name if no label exists
                if (!currentLabel || currentLabel.trim() === "") {
                  updateAvatarTitle(
                    { avatarId: firstAvatar.avatarId!, title: "默认" },
                  );
                }
              }

              setUploadNotification({
                type: "success",
                message: "头像上传成功",
              });
            }
            catch (error) {
              console.error("首次头像自动命名失败", error);
              setUploadNotification({
                type: "success",
                message: "头像上传成功",
              });
            }
          },
          onError: (error) => {
            console.error("头像上传失败:", error);
            setUploadNotification({
              type: "error",
              message: "头像上传失败，请重试",
            });
          },
        },
      );
    }
    catch (error) {
      console.error("头像上传处理失败:", error);
      setUploadNotification({
        type: "error",
        message: "头像上传失败，请重试",
      });
    }
  }, [role, uploadAvatar, queryClient, updateAvatarTitle]);

  // 内部索引变更处理
  const handleInternalIndexChange = useCallback((index: number) => {
    setInternalIndex(index);
  }, []);

  // 应用头像到外部（同步外部状态）
  const handleAvatarChange = useCallback((avatarUrl: string, avatarId: number) => {
    onAvatarChange?.(avatarUrl, avatarId);
    // 同步外部立绘索引
    onSpriteIndexChange?.(internalIndex);
  }, [onAvatarChange, onSpriteIndexChange, internalIndex]);

  // 展示预览（仅同步外部索引，不关闭弹窗）
  const handlePreview = useCallback(() => {
    onSpriteIndexChange?.(internalIndex);
  }, [onSpriteIndexChange, internalIndex]);

  // 应用完成后关闭弹窗
  const handleApply = useCallback(() => {
    onClose();
  }, [onClose]);

  // 当弹窗从关闭变为打开时，重置为 defaultTab 并同步外部索引
  useEffect(() => {
    if (isOpen && !wasOpen) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setActiveTab(defaultTab);
      // 同步外部索引到内部
      const validIndex = Math.max(0, Math.min(currentSpriteIndex, spritesAvatars.length - 1));
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setInternalIndex(validIndex);
    }
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setWasOpen(isOpen);
  }, [isOpen, wasOpen, defaultTab, currentSpriteIndex, spritesAvatars.length]);

  if (!isOpen)
    return null;

  return (
    <PopWindow
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={isMobileScreen()}
    >
      {/* Upload notification toast */}
      {uploadNotification && (
        <div className="toast toast-top toast-center z-50">
          <div className={`alert ${uploadNotification.type === "success" ? "alert-success" : "alert-error"} shadow-lg flex flex-row items-center gap-2`}>
            {uploadNotification.type === "success"
              ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
            <span>{uploadNotification.message}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row w-full h-full md:w-[80vw] md:max-w-6xl md:h-[80vh]">
        {/* 左侧头像列表 - 固定显示 */}
        <div className="md:w-80 flex-shrink-0 border-b md:border-b-0 md:border-r border-base-300 bg-base-200/30 flex flex-col">
          <div className="flex-1 overflow-auto p-3">
            <SpriteListGrid
              avatars={spritesAvatars}
              selectedIndex={internalIndex}
              onSelect={handleInternalIndexChange}
              mode="manage"
              className="h-full"
              gridCols="grid-cols-3"
              role={role}
              onAvatarChange={handleAvatarChange}
              onAvatarSelect={(avatarId) => {
                const index = spritesAvatars.findIndex(a => a.avatarId === avatarId);
                if (index !== -1) {
                  handleInternalIndexChange(index);
                }
              }}
              onUpload={handleAvatarUpload}
              fileName={role?.id ? `avatar-${role.id}-${Date.now()}` : undefined}
            />
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tab 导航栏 */}
          <div className="flex-shrink-0 border-b border-base-300 bg-base-200/50">
            <nav className="flex p-2 gap-1 overflow-x-auto">
              {/* 预览 Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "preview"
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span>预览</span>
              </button>

              {/* 立绘校正 Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("cropper")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "cropper"
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                  <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span>立绘校正</span>
              </button>

              {/* 头像校正 Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("avatarCropper")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "avatarCropper"
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M6 21v-1a6 6 0 0112 0v1" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span>头像校正</span>
              </button>

              {/* 情感设定 Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("mood")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "mood"
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 19v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>情感设定</span>
              </button>
            </nav>
          </div>

          {/* Tab 内容区域 */}
          <div className="flex-1 overflow-auto p-4 min-h-0">
            {/* 预览内容 */}
            {activeTab === "preview" && (
              <PreviewTab
                currentAvatar={currentAvatar}
                characterName={characterName}
                onAvatarChange={handleAvatarChange}
                onPreview={handlePreview}
                onApply={handleApply}
              />
            )}

            {/* 立绘校正内容 */}
            {activeTab === "cropper" && (
              <div className="h-full">
                {currentSpriteUrl
                  ? (
                      <SpriteCropper
                        spriteUrl={currentSpriteUrl}
                        roleAvatars={roleAvatars}
                        initialSpriteIndex={internalIndex}
                        characterName={characterName}
                        onClose={onClose}
                        cropMode="sprite"
                        onSpriteIndexChange={handleInternalIndexChange}
                      />
                    )
                  : (
                      <div className="flex flex-col items-center justify-center h-full text-base-content/70">
                        <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none">
                          <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                          <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <p>当前没有可用的立绘进行校正</p>
                      </div>
                    )}
              </div>
            )}

            {/* 头像校正内容 */}
            {activeTab === "avatarCropper" && (
              <div className="h-full">
                {currentSpriteUrl
                  ? (
                      <SpriteCropper
                        spriteUrl={currentSpriteUrl}
                        roleAvatars={roleAvatars}
                        initialSpriteIndex={internalIndex}
                        characterName={characterName}
                        onClose={onClose}
                        cropMode="avatar"
                        onSpriteIndexChange={handleInternalIndexChange}
                      />
                    )
                  : (
                      <div className="flex flex-col items-center justify-center h-full text-base-content/70">
                        <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                          <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                          <path d="M6 21v-1a6 6 0 0112 0v1" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <p>当前没有可用的立绘进行头像裁剪</p>
                      </div>
                    )}
              </div>
            )}

            {/* 情感设定内容 */}
            {activeTab === "mood" && (
              <MoodSettingsTab
                spritesAvatars={spritesAvatars}
                roleAvatars={roleAvatars}
                selectedIndex={internalIndex}
                onApply={handleApply}
              />
            )}
          </div>
        </div>
      </div>
    </PopWindow>
  );
}
