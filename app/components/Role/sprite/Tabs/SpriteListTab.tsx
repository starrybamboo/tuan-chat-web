import type { RoleAvatar } from "api";
import type { Role } from "../../types";
import { useUploadAvatarMutation } from "@/../api/queryHooks";
import { AvatarPreview } from "@/components/Role/Preview/AvatarPreview";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useEffect, useRef, useState } from "react";
import { useAvatarDeletion } from "../hooks/useAvatarDeletion";
import { useAvatarNameEditing } from "../hooks/useAvatarNameEditing";
import { SpriteListGrid } from "./SpriteListGrid";

interface SpriteListTabProps {
  /** 有立绘的头像列表 */
  spritesAvatars: RoleAvatar[];
  /** 当前选中的索引 */
  selectedIndex: number;
  /** 索引变更回调（内部切换） */
  onIndexChange: (index: number) => void;
  /** 角色名称 */
  characterName: string;
  /** 应用头像回调（真正更改角色头像） */
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  /** 展示预览回调（仅同步外部索引） */
  onPreview?: () => void;
  /** 应用完成后的回调（用于关闭弹窗等） */
  onApply?: () => void;
  /** 打开立绘校正面板的回调 */
  onOpenSpriteCorrection?: () => void;
  /** 打开头像校正面板的回调 */
  onOpenAvatarCorrection?: () => void;
  /** 打开情感设定面板的回调 */
  onOpenEmotionSettings?: () => void;
  /** 角色信息（用于删除逻辑） */
  role?: Role;
  /** 所有头像列表（包括没有立绘的） */
  allAvatars?: RoleAvatar[];
  /** 头像选择回调 */
  onAvatarSelect?: (avatarId: number) => void;
}

/**
 * 立绘列表 Tab 内容组件
 * 包含左侧立绘网格、右侧预览区域、底部操作按钮
 */
export function SpriteListTab({
  spritesAvatars,
  selectedIndex,
  onIndexChange,
  characterName,
  onAvatarChange,
  onPreview,
  onApply,
  onOpenSpriteCorrection,
  onOpenAvatarCorrection,
  onOpenEmotionSettings,
  role,
  allAvatars,
  onAvatarSelect,
}: SpriteListTabProps) {
  // 是否显示立绘预览（true）还是头像预览（false）
  const [showSpritePreview, setShowSpritePreview] = useState(true);
  // 图片加载状态
  const [isImageLoading, setIsImageLoading] = useState(false);
  // 用于存储加载的立绘图片
  const spriteImgRef = useRef<HTMLImageElement | null>(null);
  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState<number | null>(null);

  // 批量删除确认对话框状态
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);

  // 多选模式状态
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // 当前选中的头像数据
  const currentAvatar = spritesAvatars[selectedIndex] || null;
  const spriteUrl = currentAvatar?.spriteUrl || null;
  const avatarUrl = currentAvatar?.avatarUrl || null;

  // Use avatar deletion hook if role and allAvatars are provided
  const avatarsForDeletion = allAvatars || spritesAvatars;
  const selectedAvatarId = currentAvatar?.avatarId || 0;

  const deletionHook = useAvatarDeletion({
    role,
    avatars: avatarsForDeletion,
    selectedAvatarId,
    onAvatarChange,
    onAvatarSelect,
  });

  // Use avatar name editing hook for Dice Maiden mode
  const isDiceMaiden = role?.type === 1;
  const nameEditingHook = useAvatarNameEditing({
    roleId: role?.id,
    avatars: avatarsForDeletion,
  });

  // Avatar upload mutation
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
      const targetAvatar = avatarsForDeletion.find(a => a.avatarId === avatarId);
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

  // 当 spriteUrl 变化时重置加载状态
  useEffect(() => {
    if (spriteUrl) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsImageLoading(true);
    }
  }, [spriteUrl]);

  // 加载立绘图片
  useEffect(() => {
    if (!spriteUrl) {
      spriteImgRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      spriteImgRef.current = img;
      setIsImageLoading(false);
    };
    img.onerror = () => {
      spriteImgRef.current = null;
      setIsImageLoading(false);
    };
    img.src = spriteUrl;
  }, [spriteUrl]);

  // 处理展示预览（同步外部索引并关闭弹窗）
  const handlePreview = () => {
    onPreview?.();
    // 展示预览后关闭弹窗
    onApply?.();
  };

  // 处理应用头像（真正更改角色头像，调用接口）
  const handleApplyAvatar = () => {
    if (currentAvatar && onAvatarChange) {
      onAvatarChange(currentAvatar.avatarUrl || "", currentAvatar.avatarId || 0);
    }
    // 应用头像后关闭弹窗
    onApply?.();
  };

  // 处理删除头像请求
  const handleDeleteRequest = (index: number) => {
    const avatar = spritesAvatars[index];
    if (avatar?.avatarId) {
      setAvatarToDelete(avatar.avatarId);
      setDeleteConfirmOpen(true);
    }
  };

  // 确认删除头像
  const handleConfirmDelete = async () => {
    if (avatarToDelete && deletionHook) {
      await deletionHook.handleDeleteAvatar(avatarToDelete);
      setDeleteConfirmOpen(false);
      setAvatarToDelete(null);
    }
  };

  // 取消删除
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setAvatarToDelete(null);
  };

  // 切换多选模式
  const handleToggleMultiSelectMode = () => {
    setMultiSelectMode(!multiSelectMode);
    setSelectedIndices(new Set()); // Clear selections when toggling mode
  };

  // 切换单个头像的选中状态
  const handleToggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    }
    else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIndices.size === spritesAvatars.length) {
      setSelectedIndices(new Set());
    }
    else {
      setSelectedIndices(new Set(spritesAvatars.length > 0 ? Array.from({ length: spritesAvatars.length }, (_, i) => i) : []));
    }
  };

  // 请求批量删除
  const handleBatchDeleteRequest = () => {
    if (selectedIndices.size === 0) {
      return;
    }

    // Prevent deleting all avatars
    if (selectedIndices.size >= avatarsForDeletion.length) {
      console.error("无法删除所有头像，至少需要保留一个");
      return;
    }

    setBatchDeleteConfirmOpen(true);
  };

  // 确认批量删除
  const handleConfirmBatchDelete = async () => {
    if (selectedIndices.size === 0 || !deletionHook) {
      return;
    }

    // Get avatar IDs from selected indices
    const avatarIdsToDelete = Array.from(selectedIndices)
      .map(index => spritesAvatars[index]?.avatarId)
      .filter((id): id is number => id !== undefined);

    if (avatarIdsToDelete.length === 0) {
      return;
    }

    try {
      await deletionHook.handleBatchDelete(avatarIdsToDelete);

      // Exit multi-select mode and clear selections
      setMultiSelectMode(false);
      setSelectedIndices(new Set());
      setBatchDeleteConfirmOpen(false);
    }
    catch (error) {
      console.error("批量删除失败:", error);
      // Keep dialog open on error so user can retry or cancel
    }
  };

  // 取消批量删除
  const handleCancelBatchDelete = () => {
    setBatchDeleteConfirmOpen(false);
  };

  // Handle avatar upload
  const handleAvatarUpload = async (data: any) => {
    if (!role?.id) {
      setUploadNotification({
        type: "error",
        message: "角色信息缺失，无法上传头像",
      });
      return;
    }

    try {
      // Upload avatar with transform data
      uploadAvatar(
        { ...data, roleId: role.id },
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
              // Still show success since upload succeeded
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
  };

  // 预览区域内容渲染
  const renderPreviewContent = () => (
    <>
      {isImageLoading && spriteUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      )}

      {showSpritePreview
        ? (
            spriteUrl
              ? (
                  <div className="w-full h-full flex items-center justify-center p-2 md:p-4">
                    <img
                      src={spriteUrl}
                      alt="立绘预览"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )
              : (
                  <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
                    <p>暂无立绘</p>
                  </div>
                )
          )
        : (
            avatarUrl
              ? (
                  <div className="w-full h-full flex items-center justify-center p-2 md:p-4">
                    <AvatarPreview
                      currentAvatarUrl={avatarUrl}
                      characterName={characterName}
                      mode="full"
                      className="h-full md:space-y-4"
                      hideTitle={true}
                    />
                  </div>
                )
              : (
                  <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
                    <p>暂无头像</p>
                  </div>
                )
          )}
    </>
  );

  // 预览标题和切换按钮
  const renderPreviewHeader = () => (
    <div className="flex justify-between items-center mb-2 md:mb-4 flex-shrink-0">
      <h3 className="text-lg font-semibold">
        {showSpritePreview ? "立绘预览" : "头像预览"}
      </h3>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={() => setShowSpritePreview(!showSpritePreview)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        切换至
        {showSpritePreview ? "头像" : "立绘"}
      </button>
    </div>
  );

  // 操作按钮
  const renderActionButtons = () => {
    // Multi-select mode buttons
    if (multiSelectMode) {
      return (
        <div className="mt-2 md:mt-4 flex justify-between gap-2 flex-shrink-0">
          <button
            type="button"
            className="btn btn-ghost btn-sm md:btn-md"
            onClick={handleToggleMultiSelectMode}
          >
            退出多选
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-error btn-sm md:btn-md"
              onClick={handleBatchDeleteRequest}
              disabled={selectedIndices.size === 0 || deletionHook?.isDeleting}
            >
              {deletionHook?.isDeleting
                ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      删除中...
                    </>
                  )
                : (
                    `批量删除 (${selectedIndices.size})`
                  )}
            </button>
          </div>
        </div>
      );
    }

    // Normal mode buttons
    return (
      <div className="mt-2 md:mt-4 flex justify-between gap-2 flex-shrink-0">
        <div className="flex gap-2 items-center">
          <button
            type="button"
            className="btn btn-ghost btn-sm md:btn-sm"
            onClick={handleToggleMultiSelectMode}
            title="启用多选模式"
          >
            多选
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm md:btn-sm"
            onClick={() => onOpenSpriteCorrection?.()}
            title="前往立绘校正"
          >
            立绘校正
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm md:btn-sm"
            onClick={() => onOpenAvatarCorrection?.()}
            title="前往头像校正"
          >
            头像校正
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm md:btn-sm"
            onClick={() => onOpenEmotionSettings?.()}
            title="前往情感设定"
          >
            情感设定
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm md:btn-md"
            onClick={handlePreview}
            disabled={!currentAvatar}
          >
            展示预览
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm md:btn-md"
            onClick={handleApplyAvatar}
            disabled={!currentAvatar}
          >
            应用头像
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
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

      <div className="h-full flex flex-col md:flex-row gap-4">
        {/* 移动端：预览区域在上方，固定高度 */}
        <div className="md:hidden flex flex-col flex-shrink-0">
          {renderPreviewHeader()}
          <div className="h-48 relative bg-base-200 rounded-lg overflow-hidden flex-shrink-0">
            {renderPreviewContent()}
          </div>
          {renderActionButtons()}
        </div>

        {/* 立绘列表 - 移动端可滚动，桌面端固定宽度 */}
        <div className="flex-1 md:w-1/3 md:flex-none flex flex-col min-h-0 border-t md:border-t-0 border-base-300 pt-4 md:pt-0">
          <h3 className="text-lg font-semibold mb-4 flex-shrink-0">头像列表</h3>
          <div className="flex-1 min-h-0 overflow-auto">
            <SpriteListGrid
              avatars={spritesAvatars}
              selectedIndex={selectedIndex}
              onSelect={onIndexChange}
              mode="manage"
              className="h-full"
              onDelete={deletionHook ? handleDeleteRequest : undefined}
              isDiceMaiden={isDiceMaiden}
              editingAvatarId={nameEditingHook?.editingAvatarId || null}
              editingName={nameEditingHook?.editingName || ""}
              onStartEditName={nameEditingHook?.startEditName}
              onUpdateEditingName={nameEditingHook?.updateEditingName}
              onSaveAvatarName={nameEditingHook?.saveAvatarName}
              onCancelEditName={nameEditingHook?.cancelEditName}
              onKeyDown={nameEditingHook?.handleKeyDown}
              multiSelectMode={multiSelectMode}
              selectedIndices={selectedIndices}
              onToggleSelection={handleToggleSelection}
              onSelectAll={handleSelectAll}
              onUpload={handleAvatarUpload}
              fileName={role?.id ? `avatar-${role.id}-${Date.now()}` : undefined}
            />
          </div>
        </div>

        {/* 桌面端：右侧预览区域 */}
        <div className="hidden md:flex flex-1 min-h-0 flex-col border-l border-base-300 pl-4">
          {renderPreviewHeader()}
          <div className="flex-1 min-h-0 relative bg-base-200 rounded-lg overflow-hidden">
            {renderPreviewContent()}
          </div>
          {renderActionButtons()}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">确认删除头像</h3>
            <p className="py-4">确定要删除这个头像吗？此操作无法撤销。</p>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancelDelete}
                disabled={deletionHook?.isDeleting}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={handleConfirmDelete}
                disabled={deletionHook?.isDeleting}
              >
                {deletionHook?.isDeleting
                  ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        删除中...
                      </>
                    )
                  : (
                      "删除"
                    )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelDelete}></div>
        </div>
      )}

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
            {selectedIndices.size >= avatarsForDeletion.length && (
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
                onClick={handleCancelBatchDelete}
                disabled={deletionHook?.isDeleting}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={handleConfirmBatchDelete}
                disabled={deletionHook?.isDeleting || selectedIndices.size >= avatarsForDeletion.length}
              >
                {deletionHook?.isDeleting
                  ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        删除中...
                      </>
                    )
                  : (
                      "确认删除"
                    )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelBatchDelete}></div>
        </div>
      )}
    </>
  );
}
