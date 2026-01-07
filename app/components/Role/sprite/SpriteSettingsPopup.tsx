import type { RoleAvatar } from "api";
import type { Role } from "../types";
import { PopWindow } from "@/components/common/popWindow";
import { isMobileScreen } from "@/utils/getScreenSize";
import { useBatchDeleteRoleAvatarsMutation, useUploadAvatarMutation } from "api/hooks/RoleAndAvatarHooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AvatarSettingsTab } from "./Tabs/AvatarSettingsTab";
import { PreviewTab } from "./Tabs/PreviewTab";
import { SpriteCropper } from "./Tabs/SpriteCropper";
import { SpriteListGrid } from "./Tabs/SpriteListGrid";

export type SettingsTab = "cropper" | "avatarCropper" | "preview" | "setting";

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
 * 左侧固定显示头像列表，右侧 tab 切换不同功能：预览、立绘校正、头像校正、头像设置
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

  // ========== 多选状态管理 ==========
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // 当前选中的头像数据
  const currentAvatar = useMemo(() => {
    if (spritesAvatars.length > 0 && internalIndex < spritesAvatars.length) {
      return spritesAvatars[internalIndex] || null;
    }
    return null;
  }, [spritesAvatars, internalIndex]);

  // 当前选中的立绘 URL
  const currentSpriteUrl = currentAvatar?.spriteUrl || null;

  // ========== 上传和删除功能 ==========
  const { mutate: uploadAvatar } = useUploadAvatarMutation();
  const { mutate: batchDeleteAvatars } = useBatchDeleteRoleAvatarsMutation(role?.id);

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

  // Handle avatar upload
  const handleAvatarUpload = useCallback((data: any) => {
    if (!role?.id) {
      setUploadNotification({
        type: "error",
        message: "角色信息缺失，无法上传头像",
      });
      return;
    }

    // Upload avatar with transform data (autoApply: false, autoNameFirst: true)
    uploadAvatar(
      { ...data, roleId: role.id, autoApply: false, autoNameFirst: true },
      {
        onSuccess: () => {
          setUploadNotification({
            type: "success",
            message: "头像上传成功",
          });
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
  }, [role, uploadAvatar]);

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

  // 批量删除确认对话框状态
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);

  // 处理多选状态变化
  const handleMultiSelectChange = useCallback((indices: Set<number>, isMultiMode: boolean) => {
    setSelectedIndices(indices);
    setIsMultiSelectMode(isMultiMode);
  }, []);

  // 请求批量删除
  const handleBatchDeleteRequest = useCallback(() => {
    if (selectedIndices.size === 0)
      return;
    if (selectedIndices.size >= spritesAvatars.length) {
      console.error("无法删除所有头像，至少需要保留一个");
      return;
    }
    setBatchDeleteConfirmOpen(true);
  }, [selectedIndices, spritesAvatars.length]);

  // 执行批量删除
  const handleBatchDeleteConfirm = useCallback(() => {
    // Get avatar IDs from selected indices
    const avatarIdsToDelete = Array.from(selectedIndices)
      .map(index => spritesAvatars[index]?.avatarId)
      .filter((id): id is number => id !== undefined);

    if (avatarIdsToDelete.length === 0)
      return;

    batchDeleteAvatars(avatarIdsToDelete, {
      onSuccess: () => {
        // Exit multi-select mode and clear selections
        setIsMultiSelectMode(false);
        setSelectedIndices(new Set());
        setBatchDeleteConfirmOpen(false);

        // Reset internal index if needed
        if (internalIndex >= spritesAvatars.length - avatarIdsToDelete.length) {
          setInternalIndex(Math.max(0, spritesAvatars.length - avatarIdsToDelete.length - 1));
        }
      },
      onError: (error) => {
        console.error("批量删除失败:", error);
      },
    });
  }, [selectedIndices, spritesAvatars, batchDeleteAvatars, internalIndex]);

  // 当弹窗从关闭变为打开时，重置为 defaultTab 并同步外部索引
  useEffect(() => {
    if (isOpen && !wasOpen) {
      setActiveTab(defaultTab);
      // 同步外部索引到内部
      const validIndex = Math.max(0, Math.min(currentSpriteIndex, spritesAvatars.length - 1));
      setInternalIndex(validIndex);
    }
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
          {/* 头像列表标题栏 */}
          <div className="flex-shrink-0 border-b border-base-300 bg-base-200/50">
            <div className="flex justify-between items-center p-2 py-3.5">
              <h3 className="text-lg font-semibold">头像列表</h3>
              <div className="flex gap-2">
                {isMultiSelectMode && (
                  <>
                    <button
                      type="button"
                      className="btn btn-soft bg-base-200 btn-square btn-xs"
                      onClick={() => {
                        const allSelected = spritesAvatars.length > 0 && selectedIndices.size === spritesAvatars.length;
                        const newSelected = allSelected
                          ? new Set<number>()
                          : new Set(spritesAvatars.length > 0 ? Array.from({ length: spritesAvatars.length }, (_, i) => i) : []);
                        setSelectedIndices(newSelected);
                      }}
                      title={
                        spritesAvatars.length > 0 && selectedIndices.size === spritesAvatars.length
                          ? "取消全选"
                          : selectedIndices.size > 0 && selectedIndices.size < spritesAvatars.length
                            ? `已选 ${selectedIndices.size}`
                            : "全选"
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 256 256"
                        fill="currentColor"
                      >
                        <path d="M149.61,85.71l-89.6,88a8,8,0,0,1-11.22,0L10.39,136a8,8,0,1,1,11.22-11.41L54.4,156.79l84-82.5a8,8,0,1,1,11.22,11.42Zm96.1-11.32a8,8,0,0,0-11.32-.1l-84,82.5-18.83-18.5a8,8,0,0,0-11.21,11.42l24.43,24a8,8,0,0,0,11.22,0l89.6-88A8,8,0,0,0,245.71,74.39Z"></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`btn btn-error btn-square btn-xs ${selectedIndices.size === 0 ? "btn-disabled" : ""}`}
                      onClick={handleBatchDeleteRequest}
                      disabled={selectedIndices.size === 0}
                      title="删除所选头像"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-square btn-xs"
                      onClick={() => {
                        setIsMultiSelectMode(false);
                        setSelectedIndices(new Set());
                      }}
                      title="退出选择模式"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6L6 18" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
                {!isMultiSelectMode && spritesAvatars.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-soft bg-base-200 btn-square btn-xs"
                    onClick={() => setIsMultiSelectMode(true)}
                    title="进入选择模式"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
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
              selectedIndices={selectedIndices}
              isMultiSelectMode={isMultiSelectMode}
              onMultiSelectChange={handleMultiSelectChange}
            />
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tab 导航栏 */}
          <div className="flex-shrink-0 border-b border-base-300 bg-base-200/50">
            <nav className="flex p-2 gap-2 overflow-x-auto">
              {/* 预览 Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "preview"
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 flex-shrink-0"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                >
                  <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z" />
                </svg>
                <span>渲染预览</span>
              </button>

              {/* 立绘校正 Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("cropper")}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "cropper"
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 flex-shrink-0"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                >
                  <path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H216a8,8,0,0,0,0-16H115.32l112-112A16,16,0,0,0,227.32,73.37ZM136,75.31,152.69,92,68,176.69,51.31,160ZM48,208V179.31L76.69,208Zm48-3.31L79.32,188,164,103.31,180.69,120Zm96-96L147.32,64l24-24L216,84.69Z" />
                </svg>
                <span>立绘校正</span>
              </button>

              {/* 头像校正 Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("avatarCropper")}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "avatarCropper"
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 flex-shrink-0"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                >
                  <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z" />
                </svg>
                <span>头像校正</span>
              </button>

              {/* 头像设置 Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("setting")}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "setting"
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 flex-shrink-0"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                >
                  <path d="M228.25,63.07l-4.66-2.69a23.6,23.6,0,0,0,0-8.76l4.66-2.69a8,8,0,0,0-8-13.86l-4.67,2.7A23.92,23.92,0,0,0,208,33.38V28a8,8,0,0,0-16,0v5.38a23.92,23.92,0,0,0-7.58,4.39l-4.67-2.7a8,8,0,1,0-8,13.86l4.66,2.69a23.6,23.6,0,0,0,0,8.76l-4.66,2.69a8,8,0,0,0,4,14.93,7.92,7.92,0,0,0,4-1.07l4.67-2.7A23.92,23.92,0,0,0,192,78.62V84a8,8,0,0,0,16,0V78.62a23.92,23.92,0,0,0,7.58-4.39l4.67,2.7a7.92,7.92,0,0,0,4,1.07,8,8,0,0,0,4-14.93ZM192,56a8,8,0,1,1,8,8A8,8,0,0,1,192,56Zm29.35,48.11a8,8,0,0,0-6.57,9.21A88.85,88.85,0,0,1,216,128a87.62,87.62,0,0,1-22.24,58.41,79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75A88,88,0,0,1,128,40a88.76,88.76,0,0,1,14.68,1.22,8,8,0,0,0,2.64-15.78,103.92,103.92,0,1,0,85.24,85.24A8,8,0,0,0,221.35,104.11ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0Z" />
                </svg>
                <span>头像设置</span>
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
                        selectedIndices={selectedIndices}
                        isMultiSelectMode={isMultiSelectMode}
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
                        selectedIndices={selectedIndices}
                        isMultiSelectMode={isMultiSelectMode}
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

            {/* 头像设置内容 */}
            {activeTab === "setting" && (
              <AvatarSettingsTab
                spritesAvatars={spritesAvatars}
                roleAvatars={roleAvatars}
                selectedIndex={internalIndex}
                onApply={handleApply}
              />
            )}
          </div>
        </div>
      </div>

      {/* Batch Delete Confirmation Dialog */}
      {batchDeleteConfirmOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">确认批量删除</h3>
            <p className="py-4">
              确定要删除选中的
              {" "}
              <span className="font-bold text-error">{selectedIndices.size}</span>
              {" "}
              个头像吗？此操作无法撤销。
            </p>
            {selectedIndices.size >= spritesAvatars.length && (
              <div className="alert alert-warning mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>无法删除所有头像，至少需要保留一个</span>
              </div>
            )}
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setBatchDeleteConfirmOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={handleBatchDeleteConfirm}
                disabled={selectedIndices.size >= spritesAvatars.length}
              >
                确认删除
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setBatchDeleteConfirmOpen(false)}></div>
        </div>
      )}
    </PopWindow>
  );
}
