import type { RoleAvatar } from "api";
import type { Role } from "../../types";
import { BaselineDeleteOutline } from "@/icons";
import { useState } from "react";
import { CharacterCopper } from "../../RoleInfoCard/AvatarUploadCropper";
import { useAvatarDeletion } from "../hooks/useAvatarDeletion";
import { useAvatarNameEditing } from "../hooks/useAvatarNameEditing";

interface SpriteListGridProps {
  /** 头像/立绘列表 */
  avatars: RoleAvatar[];
  /** 当前选中的索引 */
  selectedIndex: number;
  /** 选中回调 */
  onSelect: (index: number) => void;
  /** 自定义类名 */
  className?: string;
  /** 网格列数类名，默认 "grid-cols-4 md:grid-cols-3" */
  gridCols?: string;
  /** 模式：'view' 仅展示，'manage' 管理模式（显示上传、删除等功能） */
  mode?: "view" | "manage";
  /** 上传触发后的回调 */
  onUpload?: (data: any) => void;
  /** 传给上传组件的文件名（可选） */
  fileName?: string;
  /** 角色信息（用于删除和编辑逻辑） */
  role?: Role;
  /** 应用头像回调（用于删除时切换头像） */
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  /** 头像选择回调（用于删除时更新选中状态） */
  onAvatarSelect?: (avatarId: number) => void;
}

/**
 * 立绘/头像列表网格组件
 * 可复用于立绘列表 Tab 和情感设定 Tab
 * 内部管理删除、编辑、多选等逻辑
 */
export function SpriteListGrid({
  avatars,
  selectedIndex,
  onSelect,
  className = "",
  gridCols = "grid-cols-4 md:grid-cols-3",
  mode = "view",
  onUpload,
  fileName,
  role,
  onAvatarChange,
  onAvatarSelect,
}: SpriteListGridProps) {
  // 管理模式下启用上传和删除功能
  const isManageMode = mode === "manage";
  const showUpload = isManageMode;
  const showDelete = isManageMode;

  // 多选模式状态（内部管理）
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState<number | null>(null);
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);

  // 当前选中的头像
  const currentAvatar = avatars[selectedIndex] || null;
  const selectedAvatarId = currentAvatar?.avatarId || 0;

  // 是否为骰娘模式
  const isDiceMaiden = role?.type === 1;

  // 使用删除 hook（总是调用，但只在管理模式下使用）
  const deletionHook = useAvatarDeletion({
    role,
    avatars,
    selectedAvatarId,
    onAvatarChange,
    onAvatarSelect,
  });

  // 使用名称编辑 hook（总是调用，但只在骰娘模式下使用）
  const nameEditingHook = useAvatarNameEditing({
    roleId: role?.id,
    avatars,
  });

  // Helper function to get avatar display name
  const getAvatarName = (avatar: RoleAvatar, index: number): string => {
    const label = avatar.avatarTitle?.label;
    if (label)
      return label;
    return index === 0 ? "默认" : `头像${index + 1}`;
  };

  // Handle name edit start
  const handleStartEdit = (avatar: RoleAvatar, index: number) => {
    if (!avatar.avatarId || !nameEditingHook)
      return;
    const currentName = getAvatarName(avatar, index);
    nameEditingHook.startEditName(avatar.avatarId, currentName);
  };

  // 处理删除头像请求
  const handleDeleteRequest = (index: number) => {
    const avatar = avatars[index];
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
    if (selectedIndices.size === avatars.length) {
      setSelectedIndices(new Set());
    }
    else {
      setSelectedIndices(new Set(avatars.length > 0 ? Array.from({ length: avatars.length }, (_, i) => i) : []));
    }
  };

  // 请求批量删除
  const handleBatchDeleteRequest = () => {
    if (selectedIndices.size === 0) {
      return;
    }

    // Prevent deleting all avatars
    if (selectedIndices.size >= avatars.length) {
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
      .map(index => avatars[index]?.avatarId)
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

  // Determine if delete button should be shown (not when only 1 avatar remains)
  const canDelete = avatars.length > 1;
  if (avatars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-base-content/70">
        <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p>暂无立绘</p>
      </div>
    );
  }

  // Check if all avatars are selected
  const allSelected = avatars.length > 0 && selectedIndices.size === avatars.length;
  const someSelected = selectedIndices.size > 0 && selectedIndices.size < avatars.length;

  return (
    <>
      <div className={`flex flex-col ${className}`}>
        {/* Multi-select mode controls */}
        {isManageMode && multiSelectMode && (
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-base-300">
            <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={allSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = someSelected;
                  }
                }}
                onChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                {allSelected ? "取消全选" : someSelected ? `已选 ${selectedIndices.size}` : "全选"}
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setMultiSelectMode(false);
                  setSelectedIndices(new Set());
                }}
              >
                退出
              </button>
              <button
                type="button"
                className="btn btn-error btn-xs"
                onClick={handleBatchDeleteRequest}
                disabled={selectedIndices.size === 0 || deletionHook?.isDeleting}
              >
                {deletionHook?.isDeleting ? "删除中..." : `删除 (${selectedIndices.size})`}
              </button>
            </div>
          </div>
        )}

        {/* Enable multi-select button */}
        {isManageMode && !multiSelectMode && avatars.length > 1 && (
          <div className="flex justify-end mb-2">
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setMultiSelectMode(true)}
              title="启用多选模式"
            >
              多选
            </button>
          </div>
        )}

        <div className={`grid ${gridCols} gap-2 overflow-auto content-start`}>
          {avatars.map((avatar, index) => {
            const isEditing = nameEditingHook?.editingAvatarId === avatar.avatarId;
            const avatarName = getAvatarName(avatar, index);
            const isSelected = multiSelectMode ? selectedIndices.has(index) : index === selectedIndex;

            return (
              <div key={avatar.avatarId} className="flex flex-col gap-1">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      if (multiSelectMode) {
                        handleToggleSelection(index);
                      }
                      else {
                        onSelect(index);
                      }
                    }}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-[border-color,box-shadow] duration-200 w-full ${
                      isSelected
                        ? "border-primary shadow-lg ring-2 ring-primary/30"
                        : "border-base-300 hover:border-primary/50 hover:shadow-md"
                    }`}
                    title={multiSelectMode ? `选择头像 ${index + 1}` : `切换到立绘 ${index + 1}`}
                  >
                    {avatar.avatarUrl
                      ? (
                          <img
                            src={avatar.avatarUrl}
                            alt={`头像 ${index + 1}`}
                            className="w-full h-full object-cover pointer-events-none"
                            loading="lazy"
                            style={{ aspectRatio: "1 / 1" }}
                          />
                        )
                      : (
                          <div className="w-full h-full bg-base-200 flex items-center justify-center text-base-content/50">
                            {index + 1}
                          </div>
                        )}

                    {/* Multi-select mode: show checkbox */}
                    {multiSelectMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary bg-base-100 shadow-md"
                          checked={selectedIndices.has(index)}
                          onChange={() => handleToggleSelection(index)}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    )}

                    {/* Single-select mode: show checkmark for selected */}
                    {!multiSelectMode && index === selectedIndex && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}

                    {/* Multi-select mode: show overlay for selected items */}
                    {multiSelectMode && selectedIndices.has(index) && (
                      <div className="absolute inset-0 bg-primary/20 pointer-events-none" />
                    )}
                  </button>

                  {/* Delete button - shown on hover (desktop) or always (mobile), hidden if only 1 avatar or in multi-select mode */}
                  {showDelete && canDelete && !multiSelectMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRequest(index);
                      }}
                      className="absolute top-1 right-1 p-1.5 bg-error/90 hover:bg-error text-error-content rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-10"
                      title="删除头像"
                    >
                      <BaselineDeleteOutline className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dice Maiden name label - editable */}
                {isDiceMaiden && (
                  <div className="text-xs text-center">
                    {isEditing
                      ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={nameEditingHook?.editingName || ""}
                              onChange={e => nameEditingHook?.updateEditingName(e.target.value)}
                              onKeyDown={e => avatar.avatarId && nameEditingHook?.handleKeyDown(e, avatar.avatarId)}
                              className="input input-xs input-bordered flex-1 min-w-0 text-center"
                              autoFocus
                              placeholder="输入名称"
                            />
                            <button
                              type="button"
                              onClick={() => avatar.avatarId && nameEditingHook?.saveAvatarName(avatar.avatarId)}
                              className="btn btn-xs btn-primary"
                              title="保存"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => nameEditingHook?.cancelEditName()}
                              className="btn btn-xs btn-ghost"
                              title="取消"
                            >
                              ✕
                            </button>
                          </div>
                        )
                      : (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(avatar, index)}
                            className="text-base-content/70 hover:text-primary transition-colors truncate w-full"
                            title="点击编辑名称"
                          >
                            {avatarName}
                          </button>
                        )}
                  </div>
                )}
              </div>
            );
          })}
          {showUpload && (
            <CharacterCopper
              setDownloadUrl={() => { }}
              setCopperedDownloadUrl={() => { }}
              fileName={fileName ?? `avatar-upload-${Date.now()}`}
              scene={3}
              mutate={(data) => {
                try {
                  onUpload?.(data);
                }
                catch (e) {
                  // 保持轻量：调用方处理错误
                  console.error("onUpload 回调执行失败", e);
                }
              }}
            >
              <button
                type="button"
                className="w-full h-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-base-200 transition-all cursor-pointer relative group overflow-hidden"
                title="上传新头像"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-gray-400 transition-transform duration-300 group-hover:scale-105" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </CharacterCopper>
          )}
        </div>
        <div className="text-sm text-center mt-3 text-base-content/70 flex-shrink-0">
          当前选中:
          {" "}
          {selectedIndex + 1}
          {" "}
          /
          {" "}
          {avatars.length}
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
            {selectedIndices.size >= avatars.length && (
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
                disabled={deletionHook?.isDeleting || selectedIndices.size >= avatars.length}
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
