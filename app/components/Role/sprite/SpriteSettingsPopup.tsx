import type { RoleAvatar } from "api";
import type { Role } from "../types";
import {
  CheckCircleIcon,
  ChecksIcon,
  CropIcon,
  EyeIcon,
  GearIcon,
  ImageIcon,
  PackageIcon,
  TrashIcon,
  UserCircleIcon,
  UserFocusIcon,
  WarningCircleIcon,
  XCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useBatchDeleteRoleAvatarsMutation, useUploadAvatarMutation } from "api/hooks/RoleAndAvatarHooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PopWindow } from "@/components/common/popWindow";
import { isMobileScreen } from "@/utils/getScreenSize";
import { AvatarLibraryTab } from "./Tabs/AvatarLibraryTab";
import { AvatarSettingsTab } from "./Tabs/AvatarSettingsTab";
import { PreviewTab } from "./Tabs/PreviewTab";
import { SpriteCropper } from "./Tabs/SpriteCropper";
import { SpriteListGrid } from "./Tabs/SpriteListGrid";

export type SettingsTab = "cropper" | "avatarCropper" | "preview" | "setting" | "library";

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
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const isMultiSelectDisabled = activeTab === "setting";

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

  // 头像设置页禁用多选，并强制回到单选
  useEffect(() => {
    if (isMultiSelectDisabled && isMultiSelectMode) {
      setIsMultiSelectMode(false);
      setSelectedIndices(new Set());
    }
  }, [isMultiSelectDisabled, isMultiSelectMode]);

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
                  <CheckCircleIcon
                    className="flex-shrink-0 h-6 w-6"
                    aria-hidden="true"
                  />
                )
              : (
                  <XCircleIcon className="flex-shrink-0 h-6 w-6" aria-hidden="true" />
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
                      <ChecksIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`btn btn-error btn-square btn-xs ${selectedIndices.size === 0 ? "btn-disabled" : ""}`}
                      onClick={handleBatchDeleteRequest}
                      disabled={selectedIndices.size === 0}
                      title="删除所选头像"
                    >
                      <TrashIcon className="h-5 w-5" aria-hidden="true" />
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
                      <XIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </>
                )}
                {!isMultiSelectMode && spritesAvatars.length > 1 && (
                  <button
                    type="button"
                    className={`btn btn-soft bg-base-200 btn-square btn-xs ${isMultiSelectDisabled ? "btn-disabled" : ""}`}
                    onClick={() => {
                      if (!isMultiSelectDisabled)
                        setIsMultiSelectMode(true);
                    }}
                    title="进入选择模式"
                    disabled={isMultiSelectDisabled}
                  >
                    <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
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
                <EyeIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
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
                <CropIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
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
                <UserFocusIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
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
                <GearIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span>头像设置</span>
              </button>

              {/* 素材库 Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "library"
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
              >
                <PackageIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span>素材库</span>
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
                        <ImageIcon className="w-12 h-12 mb-2" weight="duotone" aria-hidden="true" />
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
                        <UserCircleIcon className="w-12 h-12 mb-2" weight="duotone" aria-hidden="true" />
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

            {/* 素材库内容 */}
            {activeTab === "library" && (
              <AvatarLibraryTab />
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
                <WarningCircleIcon className="shrink-0 h-6 w-6" aria-hidden="true" />
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
