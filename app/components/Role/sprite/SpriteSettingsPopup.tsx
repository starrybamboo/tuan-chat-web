import type { RoleAvatar } from "api";
import type { UploadContext } from "../RoleInfoCard/AvatarUploadCropper";
import type { Role } from "../types";
import {
  CheckCircleIcon,
  ChecksIcon,
  CropIcon,
  EyeIcon,
  FunnelIcon,
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
import { useQueryClient } from "@tanstack/react-query";
import { useClearDeletedRoleAvatarsMutation, useGetDeletedRoleAvatarsQuery, useRestoreRoleAvatarMutation, useUploadAvatarMutation } from "api/hooks/RoleAndAvatarHooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Drawer } from "vaul";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { isMobileScreen } from "@/utils/getScreenSize";
import { useAvatarDeletion } from "./hooks/useAvatarDeletion";
import { AvatarLibraryTab } from "./Tabs/AvatarLibraryTab";
import { AvatarSettingsTab } from "./Tabs/AvatarSettingsTab";
import { PreviewTab } from "./Tabs/PreviewTab";
import { SpriteCropper } from "./Tabs/SpriteCropper";
import { SpriteListGrid } from "./Tabs/SpriteListGrid";
import { getEffectiveSpriteUrl } from "./utils";

export type SettingsTab = "cropper" | "avatarCropper" | "preview" | "setting" | "library" | "trash";

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
  // 内部维护 tab ״̬
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const isMobile = isMobileScreen();
  const [isMobileControlDrawerOpen, setIsMobileControlDrawerOpen] = useState(false);
  const DEFAULT_CATEGORY = "默认";
  const [categoryFilter, setCategoryFilter] = useState<string>("");

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

  const { categoryOptions, hasDefaultCategory } = useMemo(() => {
    const categorySet = new Set<string>();
    let hasDefault = false;
    spritesAvatars.forEach((avatar) => {
      const category = String(avatar.category ?? "").trim();
      if (category) {
        if (category === DEFAULT_CATEGORY) {
          hasDefault = true;
        }
        else {
          categorySet.add(category);
        }
      }
      else {
        hasDefault = true;
      }
    });
    return {
      categoryOptions: Array.from(categorySet).sort((a, b) => a.localeCompare(b, "zh-CN")),
      hasDefaultCategory: hasDefault,
    };
  }, [spritesAvatars, DEFAULT_CATEGORY]);

  const filteredIndices = useMemo(() => {
    if (!categoryFilter) {
      return spritesAvatars.map((_, index) => index);
    }
    if (categoryFilter === DEFAULT_CATEGORY) {
      return spritesAvatars
        .map((avatar, index) => {
          const category = String(avatar.category ?? "").trim();
          return !category || category === DEFAULT_CATEGORY ? index : -1;
        })
        .filter(index => index >= 0);
    }
    return spritesAvatars
      .map((avatar, index) => {
        const category = String(avatar.category ?? "").trim();
        return category === categoryFilter ? index : -1;
      })
      .filter(index => index >= 0);
  }, [spritesAvatars, categoryFilter]);

  const filteredIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    filteredIndices.forEach((originalIndex, filteredIndex) => {
      map.set(originalIndex, filteredIndex);
    });
    return map;
  }, [filteredIndices]);

  const filteredSelectedIndices = useMemo(() => {
    const next = new Set<number>();
    selectedIndices.forEach((originalIndex) => {
      const filteredIndex = filteredIndexMap.get(originalIndex);
      if (filteredIndex !== undefined) {
        next.add(filteredIndex);
      }
    });
    return next;
  }, [selectedIndices, filteredIndexMap]);

  const filteredSprites = useMemo(
    () => filteredIndices
      .map(index => spritesAvatars[index])
      .filter((avatar): avatar is RoleAvatar => Boolean(avatar)),
    [filteredIndices, spritesAvatars],
  );

  const visibleCount = filteredIndices.length;

  useEffect(() => {
    setIsMultiSelectMode(false);
    setSelectedIndices(new Set());
  }, [categoryFilter]);

  useEffect(() => {
    if (filteredIndices.length === 0) {
      return;
    }
    if (!filteredIndices.includes(internalIndex)) {
      setInternalIndex(filteredIndices[0]);
    }
  }, [filteredIndices, internalIndex]);

  // 当前选中的头像数据
  const currentAvatar = useMemo(() => {
    if (spritesAvatars.length > 0 && internalIndex < spritesAvatars.length) {
      return spritesAvatars[internalIndex] || null;
    }
    return null;
  }, [spritesAvatars, internalIndex]);

  // 当前选中的立绘 URL
  const currentSpriteUrl = currentAvatar ? (getEffectiveSpriteUrl(currentAvatar) || null) : null;

  // ========== 上传和删除功能 ==========
  const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();

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
  const handleAvatarUpload = useCallback(async (data: any, context?: UploadContext) => {
    const isBatchUpload = Boolean(context?.batch);
    if (!role?.id) {
      if (!isBatchUpload) {
        setUploadNotification({
          type: "error",
          message: "角色信息缺失，无法上传头像",
        });
      }
      if (isBatchUpload) {
        throw new Error("角色信息缺失，无法上传头像");
      }
      return;
    }

    try {
      // Upload avatar with transform data (autoApply: false, autoNameFirst: true)
      await uploadAvatar({ ...data, roleId: role.id, autoApply: false, autoNameFirst: true });
    }
    catch (error) {
      console.error("头像上传失败:", error);
      if (!isBatchUpload) {
        setUploadNotification({
          type: "error",
          message: "头像上传失败，请重试",
        });
      }
      throw error;
    }
  }, [role, uploadAvatar]);

  // 内部索引变更处理
  const handleInternalIndexChange = useCallback((index: number) => {
    setInternalIndex(index);
  }, []);

  const handleAvatarSelectById = useCallback((avatarId: number) => {
    const index = spritesAvatars.findIndex(a => a.avatarId === avatarId);
    if (index !== -1) {
      handleInternalIndexChange(index);
    }
  }, [spritesAvatars, handleInternalIndexChange]);

  // 应用头像到外部（同步外部状态）
  const handleAvatarChange = useCallback((avatarUrl: string, avatarId: number) => {
    onAvatarChange?.(avatarUrl, avatarId);
    // 同步外部立绘索引
    if (onSpriteIndexChange) {
      const nextIndex = spritesAvatars.findIndex(a => a.avatarId === avatarId);
      onSpriteIndexChange(nextIndex !== -1 ? nextIndex : internalIndex);
    }
  }, [onAvatarChange, onSpriteIndexChange, spritesAvatars, internalIndex]);

  const queryClient = useQueryClient();
  const trashQuery = useGetDeletedRoleAvatarsQuery(role?.id ?? 0, { enabled: Boolean(role?.id) });
  const trashItems = useMemo(
    () => trashQuery.data?.data ?? [],
    [trashQuery.data],
  );

  const handleAvatarDeleted = useCallback((_avatar: RoleAvatar) => {
    if (role?.id) {
      queryClient.invalidateQueries({ queryKey: ["getDeletedRoleAvatars", role.id] });
    }
  }, [queryClient, role?.id]);

  const handleBatchDeleted = useCallback((_avatars: RoleAvatar[]) => {
    if (role?.id) {
      queryClient.invalidateQueries({ queryKey: ["getDeletedRoleAvatars", role.id] });
    }
  }, [queryClient, role?.id]);

  const { mutateAsync: restoreAvatar } = useRestoreRoleAvatarMutation(role?.id);
  const { mutateAsync: clearDeletedAvatars, isPending: isClearingTrash } = useClearDeletedRoleAvatarsMutation(role?.id);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const handleRestoreFromTrash = useCallback(async (avatar: RoleAvatar) => {
    if (restoringId) {
      return;
    }
    if (!avatar.avatarId) {
      toast.error("头像ID无效，无法恢复");
      return;
    }
    setRestoringId(avatar.avatarId);
    try {
      await restoreAvatar(avatar.avatarId);
      toast.success("头像已恢复");
    }
    catch (error) {
      console.error("恢复头像失败:", error);
      toast.error("恢复失败，请稍后重试");
    }
    finally {
      setRestoringId(null);
    }
  }, [restoringId, restoreAvatar]);

  const handleClearTrash = useCallback(async () => {
    if (!role?.id) {
      toast.error("角色信息缺失，无法清空回收站");
      return;
    }
    if (trashItems.length === 0 || isClearingTrash) {
      return;
    }
    try {
      await clearDeletedAvatars(role.id);
      toast.success("回收站已清空");
    }
    catch (error) {
      console.error("清空回收站失败:", error);
      toast.error("清空失败，请稍后重试");
    }
  }, [role?.id, trashItems.length, isClearingTrash, clearDeletedAvatars]);

  const deletionHook = useAvatarDeletion({
    role,
    avatars: spritesAvatars,
    selectedAvatarId: currentAvatar?.avatarId ?? 0,
    onAvatarChange: handleAvatarChange,
    onAvatarSelect: handleAvatarSelectById,
    onDeleteSuccess: handleAvatarDeleted,
    onBatchDeleteSuccess: handleBatchDeleted,
  });
  const { handleBatchDelete, isDeleting: isDeletingAvatar } = deletionHook;

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
      toast.error("无法删除所有头像，至少需要保留一个");
      return;
    }
    setBatchDeleteConfirmOpen(true);
  }, [selectedIndices, spritesAvatars.length]);

  // 执行批量删除
  const handleBatchDeleteConfirm = useCallback(async () => {
    // Get avatar IDs from selected indices
    const avatarIdsToDelete = Array.from(selectedIndices)
      .map(index => spritesAvatars[index]?.avatarId)
      .filter((id): id is number => id !== undefined);

    if (avatarIdsToDelete.length === 0)
      return;

    try {
      await handleBatchDelete(avatarIdsToDelete);
      // Exit multi-select mode and clear selections
      setIsMultiSelectMode(false);
      setSelectedIndices(new Set());
      setBatchDeleteConfirmOpen(false);

      // Reset internal index if needed
      if (internalIndex >= spritesAvatars.length - avatarIdsToDelete.length) {
        setInternalIndex(Math.max(0, spritesAvatars.length - avatarIdsToDelete.length - 1));
      }
    }
    catch (error) {
      console.error("批量删除失败:", error);
      toast.error("批量删除失败，请稍后重试");
    }
  }, [selectedIndices, spritesAvatars, handleBatchDelete, internalIndex]);

  // 当弹窗从关闭变为打开时，重置为 defaultTab 并同步外部索引
  useEffect(() => {
    if (isOpen && !wasOpen) {
      setActiveTab(defaultTab);
      // 同步外部索引到内部
      const validIndex = Math.max(0, Math.min(currentSpriteIndex, spritesAvatars.length - 1));
      setInternalIndex(validIndex);
      setIsMobileControlDrawerOpen(isMobile);
    }
    setWasOpen(isOpen);
  }, [isOpen, wasOpen, defaultTab, currentSpriteIndex, spritesAvatars.length, isMobile]);

  useEffect(() => {
    if (!isOpen) {
      setIsMobileControlDrawerOpen(false);
    }
  }, [isOpen]);

  const handleTabChange = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
    if (isMobile) {
      setIsMobileControlDrawerOpen(false);
    }
  }, [isMobile]);

  const activeTabLabel = useMemo(() => {
    if (activeTab === "preview")
      return "渲染预览";
    if (activeTab === "cropper")
      return "立绘校正";
    if (activeTab === "avatarCropper")
      return "头像校正";
    if (activeTab === "setting")
      return "头像设置";
    if (activeTab === "library")
      return "素材库";
    return "回收站";
  }, [activeTab]);

  const avatarListPanel = (
    <>
      {/* 头像列表标题栏 */}
      <div className="shrink-0 border-b border-base-300 bg-base-200/50">
        <div className="flex justify-between items-center px-3 py-3">
          <h3 className="text-lg font-semibold">头像列表</h3>
          <div className="flex gap-2">
            {isMultiSelectMode && (
              <>
                <button
                  type="button"
                  className="btn btn-soft bg-base-200 btn-square btn-xs"
                  onClick={() => {
                    const allSelected = visibleCount > 0 && selectedIndices.size === visibleCount;
                    const newSelected = allSelected
                      ? new Set<number>()
                      : new Set(filteredIndices);
                    setSelectedIndices(newSelected);
                  }}
                  title={
                    visibleCount > 0 && selectedIndices.size === visibleCount
                      ? "取消全选"
                      : selectedIndices.size > 0 && selectedIndices.size < visibleCount
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
            {!isMultiSelectMode && visibleCount > 1 && (
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
            <div className="dropdown dropdown-end">
              <button
                type="button"
                tabIndex={0}
                className={`btn btn-square btn-xs ${categoryFilter ? "btn-primary" : "btn-soft bg-base-200"}`}
                title={categoryFilter ? `当前分类：${categoryFilter}` : "分类筛选"}
                aria-label="头像分类筛选"
              >
                <FunnelIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box shadow-xl border border-base-300 z-40 w-44 p-2 mt-1">
                <li>
                  <button
                    type="button"
                    className={categoryFilter === "" ? "active font-semibold" : ""}
                    onClick={() => setCategoryFilter("")}
                  >
                    全部
                  </button>
                </li>
                {hasDefaultCategory && (
                  <li>
                    <button
                      type="button"
                      className={categoryFilter === DEFAULT_CATEGORY ? "active font-semibold" : ""}
                      onClick={() => setCategoryFilter(DEFAULT_CATEGORY)}
                    >
                      默认
                    </button>
                  </li>
                )}
                {categoryOptions.map(category => (
                  <li key={category}>
                    <button
                      type="button"
                      className={categoryFilter === category ? "active font-semibold" : ""}
                      onClick={() => setCategoryFilter(category)}
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5 md:p-3">
        <SpriteListGrid
          avatars={filteredSprites}
          totalAvatarsCount={spritesAvatars.length}
          selectedIndex={filteredIndexMap.get(internalIndex) ?? 0}
          onSelect={(index) => {
            const originalIndex = filteredIndices[index];
            if (originalIndex === undefined)
              return;
            handleInternalIndexChange(originalIndex);
          }}
          mode="manage"
          className="h-full w-full min-w-0"
          gridCols="grid-cols-4 md:grid-cols-3"
          role={role}
          onAvatarChange={handleAvatarChange}
          onAvatarSelect={handleAvatarSelectById}
          onAvatarDeleted={handleAvatarDeleted}
          onUpload={handleAvatarUpload}
          fileName={role?.id ? `avatar-${role.id}-${Date.now()}` : undefined}
          selectedIndices={filteredSelectedIndices}
          isMultiSelectMode={isMultiSelectMode}
          onMultiSelectChange={(indices, isMultiMode) => {
            const nextSelected = new Set<number>();
            indices.forEach((filteredIndex) => {
              const originalIndex = filteredIndices[filteredIndex];
              if (originalIndex !== undefined) {
                nextSelected.add(originalIndex);
              }
            });
            handleMultiSelectChange(nextSelected, isMultiMode);
          }}
        />
      </div>
    </>
  );

  const tabNavigation = (
    <div className="shrink-0 border-b border-base-300 bg-base-200/50">
      <nav className="flex flex-wrap gap-1.5 p-2 overflow-x-hidden md:flex-nowrap md:overflow-x-auto">
        {/* 预览 Tab */}
        <button
          type="button"
          onClick={() => handleTabChange("preview")}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
            activeTab === "preview"
              ? "bg-primary text-primary-content"
              : "hover:bg-base-300"
          }`}
        >
          <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden="true" />
          <span>渲染预览</span>
        </button>

        {/* 立绘校正 Tab */}
        <button
          type="button"
          onClick={() => handleTabChange("cropper")}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
            activeTab === "cropper"
              ? "bg-primary text-primary-content"
              : "hover:bg-base-300"
          }`}
        >
          <CropIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden="true" />
          <span>立绘校正</span>
        </button>

        {/* 头像校正 Tab */}
        <button
          type="button"
          onClick={() => handleTabChange("avatarCropper")}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
            activeTab === "avatarCropper"
              ? "bg-primary text-primary-content"
              : "hover:bg-base-300"
          }`}
        >
          <UserFocusIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden="true" />
          <span>头像校正</span>
        </button>

        {/* 头像设置 Tab */}
        <button
          type="button"
          onClick={() => handleTabChange("setting")}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
            activeTab === "setting"
              ? "bg-primary text-primary-content"
              : "hover:bg-base-300"
          }`}
        >
          <GearIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden="true" />
          <span>头像设置</span>
        </button>

        {/* 素材库 Tab */}
        <button
          type="button"
          onClick={() => handleTabChange("library")}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
            activeTab === "library"
              ? "bg-primary text-primary-content"
              : "hover:bg-base-300"
          }`}
        >
          <PackageIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden="true" />
          <span>素材库</span>
        </button>
        {/* 回收站 Tab */}
        <button
          type="button"
          onClick={() => handleTabChange("trash")}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
            activeTab === "trash"
              ? "bg-primary text-primary-content"
              : "hover:bg-base-300"
          }`}
        >
          <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden="true" />
          <span>回收站</span>
          {trashItems.length > 0 && (
            <span className="badge badge-sm bg-base-100 text-base-content">
              {trashItems.length}
            </span>
          )}
        </button>
      </nav>
    </div>
  );

  if (!isOpen)
    return null;

  return (
    <ToastWindow
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={isMobile}
      showCloseButton={!isMobile}
    >
      {/* Upload notification toast */}
      {uploadNotification && (
        <div className="toast toast-top toast-center z-50">
          <div className={`alert ${uploadNotification.type === "success" ? "alert-success" : "alert-error"} shadow-lg flex flex-row items-center gap-2`}>
            {uploadNotification.type === "success"
              ? (
                  <CheckCircleIcon
                    className="shrink-0 h-6 w-6"
                    aria-hidden="true"
                  />
                )
              : (
                  <XCircleIcon className="shrink-0 h-6 w-6" aria-hidden="true" />
                )}
            <span>{uploadNotification.message}</span>
          </div>
        </div>
      )}

      <div className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-x-hidden md:h-[80vh] md:w-[86vw] md:max-w-6xl md:flex-row">
        {/* 左侧头像列表 - 桌面端固定显示 */}
        <div className="hidden md:flex md:w-80 md:shrink-0 md:border-r border-base-300 bg-base-200/30 md:min-h-0 md:overflow-hidden md:flex-col">
          {avatarListPanel}
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-x-hidden">
          {/* 移动端折叠控制按钮 */}
          {isMobile && (
            <div className="shrink-0 border-b border-base-300 bg-base-200/50 p-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileControlDrawerOpen(true)}
                  className="btn btn-soft bg-base-200 flex-1 justify-between min-w-0"
                >
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" aria-hidden="true" />
                    <span>头像与工具</span>
                  </span>
                  <span className="text-sm text-base-content/70 truncate max-w-[7rem]">
                    {activeTabLabel}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost btn-square btn-sm shrink-0"
                  aria-label="关闭头像弹窗"
                >
                  <XIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* 桌面端 Tab 导航栏 */}
          <div className="hidden md:block">
            {tabNavigation}
          </div>

          {/* Tab 内容区域 */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 min-h-0">
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

            {/* 回收站内容 */}
            {activeTab === "trash" && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-2 shrink-0 min-h-8">
                  <h3 className="text-lg font-semibold">回收站</h3>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-sm ${trashItems.length === 0 || isClearingTrash ? "btn-disabled" : ""}`}
                    onClick={handleClearTrash}
                    disabled={trashItems.length === 0 || isClearingTrash}
                  >
                    {isClearingTrash ? "清空中..." : "清空回收站"}
                  </button>
                </div>

                <div className="flex-1 min-h-0 relative bg-base-200 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 overflow-auto p-4">
                    {trashQuery.isLoading
                      ? (
                          <div className="flex flex-col items-center justify-center h-full text-base-content/60 text-sm">
                            加载中...
                          </div>
                        )
                      : trashItems.length === 0
                        ? (
                            <div className="flex flex-col items-center justify-center h-full text-base-content/60 text-sm">
                              回收站为空
                            </div>
                          )
                        : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {trashItems.map((avatar, index) => {
                                const displayUrl = avatar.avatarUrl || avatar.spriteUrl || avatar.originUrl || "";
                                const title = typeof avatar.avatarTitle === "string"
                                  ? avatar.avatarTitle
                                  : avatar.avatarTitle?.label;
                                const name = title && title.trim().length ? title : "未命名头像";
                                const isRestoring = restoringId === avatar.avatarId;
                                const isBusy = Boolean(restoringId) || isClearingTrash;
                                const canRestore = Boolean(avatar.avatarId);
                                return (
                                  <div key={avatar.avatarId ?? `trash-${index}`} className="rounded-lg border border-base-300 bg-base-100 p-3 flex flex-col gap-3">
                                    <div className="flex gap-3 items-start">
                                      <div className="w-16 h-16 rounded-md overflow-hidden bg-base-200 flex items-center justify-center shrink-0">
                                        {displayUrl
                                          ? (
                                              <img
                                                src={displayUrl}
                                                alt={name}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                decoding="async"
                                              />
                                            )
                                          : (
                                              <span className="text-xs text-base-content/50">无预览</span>
                                            )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{name}</div>
                                        {avatar.avatarId && (
                                          <div className="text-xs text-base-content/40 mt-1">
                                            头像ID：
                                            {avatar.avatarId}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleRestoreFromTrash(avatar)}
                                        disabled={!canRestore || isBusy}
                                      >
                                        {isRestoring ? "恢复中..." : "恢复"}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 移动端：头像与工具抽屉 */}
      {isMobile && (
        <Drawer.Root
          open={isMobileControlDrawerOpen}
          onOpenChange={setIsMobileControlDrawerOpen}
          direction="bottom"
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[1200] bg-black/40 md:hidden pointer-events-auto" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-[1201] h-[75vh] rounded-t-2xl border border-base-300 bg-base-100 md:hidden flex flex-col pointer-events-auto">
              <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-base-content/30" />
              <div className="flex items-center justify-between px-3 py-2">
                <Drawer.Title className="text-base font-semibold">头像与工具</Drawer.Title>
                <Drawer.Description className="sr-only">
                  在移动端查看头像列表并切换预览、设置、回收站等工具面板。
                </Drawer.Description>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square"
                  onClick={() => setIsMobileControlDrawerOpen(false)}
                  aria-label="关闭头像与工具抽屉"
                >
                  <XIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
                {tabNavigation}
                <div className="w-full min-h-0 max-h-[46vh] overflow-hidden border-y border-base-300 bg-base-200/30 flex flex-col">
                  {avatarListPanel}
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}

      {/* Batch Delete Confirmation Dialog */}
      {batchDeleteConfirmOpen && (
        <div className="modal modal-open">
          <div className="modal-box w-[92vw] max-w-md">
            <h3 className="font-bold text-lg">确认批量删除</h3>
            <p className="py-4">
              确定要删除选中的
              {" "}
              <span className="font-bold text-error">{selectedIndices.size}</span>
              {" "}
              个头像吗？删除后会进入回收站，可在回收站恢复。
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
                disabled={selectedIndices.size >= spritesAvatars.length || isDeletingAvatar}
              >
                {isDeletingAvatar ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setBatchDeleteConfirmOpen(false)}></div>
        </div>
      )}
    </ToastWindow>
  );
}
