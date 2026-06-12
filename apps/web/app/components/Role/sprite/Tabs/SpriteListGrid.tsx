import type { RoleAvatar, RoleAvatarVariant } from "api";

import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useUpdateAvatarNameMutation } from "api/hooks/RoleAndAvatarHooks";
import { type ReactNode, useCallback, useState } from "react";

import { DoubleClickEditableText } from "@/components/common/DoubleClickEditableText";
import { MediaImage } from "@/components/common/mediaImage";
import { BaselineDeleteOutline } from "@/icons";

import type { AvatarUploadFilesContext } from "../../RoleInfoCard/AvatarUploadCropper";
import type { Role } from "../../types";

import { CharacterCopper } from "../../RoleInfoCard/AvatarUploadCropper";
import { useAvatarDeletion } from "../hooks/useAvatarDeletion";
import { getEffectiveAvatarUrl } from "../utils";

type SpriteListGridProps = {
  /** 头像/立绘列表 */
  avatars: RoleAvatar[];
  /** 头像总数（用于判断是否允许删除全部） */
  totalAvatarsCount?: number;
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
  /** 选中文件后由父层接管上传与矫正流程 */
  onUploadFilesSelected?: (
    files: File[],
    context: AvatarUploadFilesContext & { uploadDefaults?: Pick<RoleAvatar, "category" | "variantId"> }
  ) => void | Promise<void>;
  /** 角色信息（用于删除和编辑逻辑） */
  role?: Role;
  /** 应用头像回调（用于删除时切换头像） */
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  /** 头像选择回调（用于删除时更新选中状态） */
  onAvatarSelect?: (avatarId: number) => void;
  onAvatarDeleted?: (avatar: RoleAvatar) => void;
  /** 多选状态（必须从父组件传入） */
  selectedIndices: Set<number>;
  /** 是否处于多选模式（必须从父组件传入） */
  isMultiSelectMode: boolean;
  /** 多选状态变化回调（必须） */
  onMultiSelectChange: (selectedIndices: Set<number>, isMultiSelectMode: boolean) => void;
  /** 可选：直接指定 grid-template-columns，确保网格列数生效 */
  gridTemplateColumns?: string;
  /** 是否按头像分类分组展示 */
  groupByCategory?: boolean;
  /** 分组上传时继承的立绘组 ID */
  uploadVariantId?: number;
  /** 绑定立绘组上传时用于锁定裁剪的完整组配置 */
  lockedUploadVariantGroup?: RoleAvatarVariant;
  /** 上传时可选择的立绘组列表 */
  availableVariants?: RoleAvatarVariant[];
  /** 分组列表顶部的额外操作入口 */
  beforeContentSlot?: ReactNode;
  /** 头像拖拽开始，参数为当前列表索引 */
  onAvatarDragStart?: (index: number) => void;
  /** 头像拖拽结束 */
  onAvatarDragEnd?: () => void;
}

type GroupedAvatar = {
  avatar: RoleAvatar;
  index: number;
}

type AvatarCategoryGroup = {
  category: string;
  items: GroupedAvatar[];
}

const DEFAULT_CATEGORY_LABEL = "默认";

function getAvatarCategoryLabel(avatar: RoleAvatar) {
  return String(avatar.category ?? "").trim() || DEFAULT_CATEGORY_LABEL;
}

function groupAvatarsByCategory(avatars: RoleAvatar[]): AvatarCategoryGroup[] {
  const groupMap = new Map<string, GroupedAvatar[]>();

  avatars.forEach((avatar, index) => {
    const category = getAvatarCategoryLabel(avatar);
    const group = groupMap.get(category) ?? [];
    group.push({ avatar, index });
    groupMap.set(category, group);
  });

  return Array.from(groupMap.entries())
    .sort(([a], [b]) => {
      if (a === DEFAULT_CATEGORY_LABEL)
        return -1;
      if (b === DEFAULT_CATEGORY_LABEL)
        return 1;
      return a.localeCompare(b, "zh-CN");
    })
    .map(([category, items]) => ({ category, items }));
}

/**
 * 立绘/头像列表网格组件
 * 可复用于立绘列表 Tab 和情感设定 Tab
 * 内部管理删除、编辑、多选等逻辑
 */
export function SpriteListGrid({
  avatars,
  totalAvatarsCount,
  selectedIndex,
  onSelect,
  className = "",
  gridCols = "grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  mode = "view",
  onUploadFilesSelected,
  role,
  onAvatarChange,
  onAvatarSelect,
  onAvatarDeleted,
  selectedIndices,
  isMultiSelectMode,
  onMultiSelectChange,
  gridTemplateColumns,
  groupByCategory = false,
  uploadVariantId,
  lockedUploadVariantGroup,
  availableVariants,
  beforeContentSlot,
  onAvatarDragStart,
  onAvatarDragEnd,
}: SpriteListGridProps) {
  // 管理模式下启用上传和删除功能
  const isManageMode = mode === "manage";
  const showUpload = isManageMode;
  const showDelete = isManageMode;

  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState<number | null>(null);
  const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null);
  const [droppedBatchId, setDroppedBatchId] = useState<number | null>(null);
  const [droppedTargetId, setDroppedTargetId] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => new Set());
  // 当前选中的头像
  const currentAvatar = avatars[selectedIndex] || null;
  const selectedAvatarId = currentAvatar?.avatarId || 0;

  // 使用删除 hook（总是调用，但只在管理模式下使用）
  const deletionHook = useAvatarDeletion({
    role,
    avatars,
    selectedAvatarId,
    onAvatarChange,
    onAvatarSelect,
    onDeleteSuccess: onAvatarDeleted,
  });

  const updateNameMutation = useUpdateAvatarNameMutation(role?.id);
  const canEditName = Boolean(role?.id);

  const handleAvatarNameCommit = useCallback(async (avatar: RoleAvatar, nextName: string) => {
    if (!role?.id) {
      return;
    }
    if (updateNameMutation.isPending) {
      return;
    }
    const trimmedName = nextName.trim();
    if (!trimmedName) {
      return;
    }
    const normalizedAvatar: RoleAvatar = {
      ...avatar,
      avatarTitle: typeof avatar.avatarTitle === "string"
        ? { label: avatar.avatarTitle }
        : (avatar.avatarTitle ?? {}),
    };

    try {
      await updateNameMutation.mutateAsync({
        avatar: normalizedAvatar,
        name: trimmedName,
      });
    }
    catch (error) {
      console.error("保存头像名称失败:", error);
    }
  }, [role?.id, updateNameMutation]);

  // Helper function to get avatar display name
  const getAvatarName = (avatar: RoleAvatar, index: number): string => {
    const title = avatar.avatarTitle;
    if (typeof title === "string")
      return title || `头像${index + 1}`;
    return title?.label || `头像${index + 1}`;
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
    onMultiSelectChange(newSelected, isMultiSelectMode);
  };

  const handleToggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      }
      else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Determine if delete button should be shown (not when only 1 avatar remains)
  const canDelete = (totalAvatarsCount ?? avatars.length) > 1;
  const categoryGroups = groupByCategory ? groupAvatarsByCategory(avatars) : [];
  const defaultUploadDefaults = uploadVariantId ? { variantId: uploadVariantId } : undefined;
  const lockedUploadVariant = lockedUploadVariantGroup
    ?? (uploadVariantId ? { variantId: uploadVariantId } : undefined);
  // 分组内头像数量可能很少，用 auto-fill 保留列宽，避免单项被 1fr 拉满。
  const groupedGridTemplateColumns = gridTemplateColumns?.replace("auto-fit", "auto-fill");

  const renderAvatarTile = (avatar: RoleAvatar, index: number) => {
    const avatarName = getAvatarName(avatar, index);
    const isSelected = isMultiSelectMode ? selectedIndices.has(index) : index === selectedIndex;
    const displayAvatarUrl = getEffectiveAvatarUrl(avatar);
    const isAppliedAvatar = Boolean(
      role?.avatarId
        ? avatar.avatarId === role.avatarId
        : (role?.avatar ? displayAvatarUrl === role.avatar : false),
    );

    return (
      <div key={avatar.avatarId} className="min-w-0 flex flex-col">
        <div className="relative group w-full overflow-visible">
          <button
            type="button"
            draggable={Boolean(onAvatarDragStart)}
            onDragStart={(event) => {
              if (!onAvatarDragStart) {
                return;
              }
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", `role-avatar:${avatar.avatarId ?? index}`);
              onAvatarDragStart(index);
            }}
            onDragEnd={onAvatarDragEnd}
            onClick={() => {
              if (isMultiSelectMode) {
                handleToggleSelection(index);
              }
              else {
                onSelect(index);
              }
            }}
            className={`
              relative aspect-square rounded-lg overflow-hidden border-2
              transition-[border-color,box-shadow] duration-200 w-full
              cursor-pointer
              ${
              isSelected
                ? "border-primary shadow-lg ring-2 ring-primary/30"
                : `
                  border-base-300
                  hover:border-primary/50 hover:shadow-md
                `
            }
            `}
            title={isMultiSelectMode ? `选择头像 ${index + 1}` : `切换到立绘 ${index + 1}`}
          >
            {displayAvatarUrl
              ? (
                  <MediaImage
                    src={displayAvatarUrl}
                    alt={`头像 ${index + 1}`}
                    className="
                      size-full object-cover pointer-events-none
                    "
                    loading="lazy"
                    draggable={false}
                    style={{ aspectRatio: "1 / 1" }}
                  />
                )
              : (
                  <div className="
                    size-full bg-base-200 flex items-center
                    justify-center text-base-content/50
                  ">
                    {index + 1}
                  </div>
                )}

            {isMultiSelectMode && (
              <div className="
                absolute top-2 left-2 z-10 pointer-events-none
              ">
                <div
                  className={`
                    flex items-center justify-center size-5 rounded-full
                    border-2 transition-all duration-200 bg-base-100
                    shadow-md
                    ${
                    selectedIndices.has(index)
                      ? "bg-info border-info"
                      : "border-base-content/30"
                  }
                  `}
                >
                  {selectedIndices.has(index) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      className="text-accent-content"
                    >
                      <path
                        fill="currentColor"
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                      />
                    </svg>
                  )}
                </div>
              </div>
            )}

            {!isMultiSelectMode && index === selectedIndex && (
              <div className="
                absolute inset-0 bg-primary/10 flex items-center
                justify-center
              ">
                <svg className="size-6 text-primary" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}

            {isMultiSelectMode && selectedIndices.has(index) && (
              <div className="
                absolute inset-0 bg-primary/20 pointer-events-none
              " />
            )}

            {isAppliedAvatar && (
              <div className="
                absolute bottom-0 left-1 z-10 flex items-center gap-1.5
              ">
                <span
                  className="size-3 rounded-full bg-success shadow-sm"
                  title="这是当前应用的头像"
                >
                </span>
                <span className="
                  rounded-full bg-success/90 p-1 text-[10px]
                  text-success-content opacity-0 transition-opacity
                  duration-200
                  group-hover:opacity-100
                ">
                  当前应用
                </span>
              </div>
            )}
          </button>

          {showDelete && canDelete && !isMultiSelectMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteRequest(index);
              }}
              className="
                absolute top-1 right-1 p-1.5 bg-error/90
                hover:bg-error
                text-error-content rounded-full opacity-100
                md:opacity-0
                md:group-hover:opacity-100
                transition-opacity duration-200 z-10 cursor-pointer
              "
              title="删除头像"
            >
              <BaselineDeleteOutline className="size-4" />
            </button>
          )}
        </div>

        <DoubleClickEditableText
          value={avatarName}
          disabled={!canEditName || updateNameMutation.isPending}
          className="text-xs text-center text-base-content/70 w-full"
          displayClassName={`block truncate ${canEditName ? "cursor-text" : ""}`}
          inputClassName="input input-xs w-full text-center"
          placeholder={`头像${index + 1}`}
          invalidBehavior="revert"
          validate={nextValue => (nextValue.trim().length ? null : "头像名称不能为空")}
          onCommit={nextValue => handleAvatarNameCommit(avatar, nextValue)}
          displayProps={{
            title: canEditName ? "双击修改头像标题" : avatarName,
          }}
        />
      </div>
    );
  };

  const renderUploadTile = (
    uploadDefaults?: Pick<RoleAvatar, "category" | "variantId">,
    uploadTargetId = "default",
  ) => showUpload
    ? (
        <CharacterCopper
          externalFiles={droppedTargetId === uploadTargetId ? droppedFiles : null}
          externalFilesBatchId={droppedTargetId === uploadTargetId ? (droppedBatchId ?? undefined) : undefined}
          onExternalFilesHandled={() => {
            setDroppedFiles(null);
            setDroppedBatchId(null);
            setDroppedTargetId(null);
          }}
          lockedVariantGroup={uploadDefaults?.variantId ? lockedUploadVariant : undefined}
          availableVariants={availableVariants}
          defaultVariantId={uploadDefaults?.variantId}
          onFilesSelected={(files, context) => onUploadFilesSelected?.(files, {
            ...context,
            uploadDefaults,
          })}
        >
          <button
            type="button"
            className="
              size-full flex items-center justify-center gap-2 rounded-lg
              border-2 border-dashed border-gray-300
              hover:border-primary hover:bg-base-200
              transition-all cursor-pointer relative group overflow-hidden
            "
            title="上传新头像"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="
              size-full text-gray-400 transition-transform duration-300
              group-hover:scale-105
            " fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </CharacterCopper>
      )
    : null;
  const uploadTile = renderUploadTile(defaultUploadDefaults);

  if (avatars.length === 0) {
    return (
      <div
        className={`
          flex min-w-0 flex-col
          ${className}
        `}
        onDragOver={(event) => {
          if (!showUpload) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          if (!showUpload) {
            return;
          }
          if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
            return;
          }
          setIsDragActive(false);
        }}
        onDrop={(event) => {
          if (!showUpload) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          setIsDragActive(false);
          const files = Array.from(event.dataTransfer.files ?? []);
          if (files.length === 0) {
            return;
          }
          setDroppedTargetId("default");
          setDroppedFiles(files);
          setDroppedBatchId(Date.now());
        }}
      >
        {beforeContentSlot && (
          <div className="mb-4 w-full shrink-0">
            {beforeContentSlot}
          </div>
        )}
        <div className={`
          flex flex-col items-center justify-center flex-1 text-base-content/70
          ${isDragActive ? `ring-2 ring-primary/40 rounded-lg` : ""}
        `}>
          {showUpload && (
            <div className="size-24">
              <CharacterCopper
                externalFiles={droppedFiles}
                externalFilesBatchId={droppedBatchId ?? undefined}
                onExternalFilesHandled={() => {
                  setDroppedFiles(null);
                  setDroppedBatchId(null);
                }}
                lockedVariantGroup={defaultUploadDefaults?.variantId ? lockedUploadVariant : undefined}
                availableVariants={availableVariants}
                defaultVariantId={defaultUploadDefaults?.variantId}
                onFilesSelected={(files, context) => onUploadFilesSelected?.(files, {
                  ...context,
                  uploadDefaults: defaultUploadDefaults,
                })}
              >
                <button
                  type="button"
                  className="
                    size-full flex items-center justify-center gap-2 rounded-lg
                    border-2 border-dashed border-gray-300
                    hover:border-primary hover:bg-base-200
                    transition-all cursor-pointer relative group overflow-hidden
                  "
                  title="上传新头像"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="
                    size-full text-gray-400 transition-transform duration-300
                    group-hover:scale-105
                  " fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </CharacterCopper>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`
          flex flex-col
          ${className}
        `}
        onDragOver={(event) => {
          if (!showUpload) {
            return;
          }
          if (groupByCategory) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          if (!showUpload) {
            return;
          }
          if (groupByCategory) {
            return;
          }
          if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
            return;
          }
          setIsDragActive(false);
        }}
        onDrop={(event) => {
          if (!showUpload) {
            return;
          }
          if (groupByCategory) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          setIsDragActive(false);
          const files = Array.from(event.dataTransfer.files ?? []);
          if (files.length === 0) {
            return;
          }
          setDroppedTargetId("default");
          setDroppedFiles(files);
          setDroppedBatchId(Date.now());
        }}
      >

        {groupByCategory
          ? (
              <div className={`
                flex min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden
                ${isDragActive ? `ring-2 ring-primary/40 rounded-lg` : ""}
              `}>
                {beforeContentSlot}
                {categoryGroups.map((group, groupIndex) => {
                  const uploadTargetId = `category-${groupIndex}`;
                  const isCollapsed = collapsedCategories.has(group.category);
                  const selectedInGroupCount = group.items.filter(item => selectedIndices.has(item.index)).length;
                  return (
                    <section
                      key={group.category}
                      className="min-w-0 space-y-2"
                      onDragOver={(event) => {
                        if (!showUpload) {
                          return;
                        }
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "copy";
                        setIsDragActive(true);
                      }}
                      onDragLeave={(event) => {
                        if (!showUpload) {
                          return;
                        }
                        if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
                          return;
                        }
                        setIsDragActive(false);
                      }}
                      onDrop={(event) => {
                        if (!showUpload) {
                          return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        setIsDragActive(false);
                        const files = Array.from(event.dataTransfer.files ?? []);
                        if (files.length === 0) {
                          return;
                        }
                        setDroppedTargetId(uploadTargetId);
                        setDroppedFiles(files);
                        setDroppedBatchId(Date.now());
                      }}
                    >
                      <button
                        type="button"
                        className="
                          flex w-full min-w-0 items-center justify-between gap-2
                          rounded-md px-1.5 py-1 text-xs text-base-content/70
                          hover:bg-base-200
                        "
                        onClick={() => handleToggleCategory(group.category)}
                        aria-expanded={!isCollapsed}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          {isCollapsed
                            ? <CaretRightIcon className="size-3.5 shrink-0" aria-hidden="true" />
                            : <CaretDownIcon className="size-3.5 shrink-0" aria-hidden="true" />}
                          <span className="truncate font-semibold text-base-content/85">
                            {group.category}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {isMultiSelectMode && selectedInGroupCount > 0 && (
                            <span className="badge badge-primary badge-xs">
                              已选
                              {" "}
                              {selectedInGroupCount}
                            </span>
                          )}
                          <span className="badge badge-ghost badge-xs">
                            {group.items.length}
                          </span>
                        </span>
                      </button>
                      {!isCollapsed && (
                        <div
                          className={`
                            grid w-full min-w-0 ${gridCols} gap-2 content-start
                          `}
                          style={groupedGridTemplateColumns
                            ? { gridTemplateColumns: groupedGridTemplateColumns }
                            : undefined}
                        >
                          {group.items.map(item => renderAvatarTile(item.avatar, item.index))}
                          {renderUploadTile({
                            category: group.category,
                            variantId: uploadVariantId,
                          }, uploadTargetId)}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )
          : (
              <div
                className={`
                  grid w-full min-w-0
                  ${gridCols}
                  gap-2 overflow-y-auto overflow-x-hidden content-start
                  ${isDragActive ? `ring-2 ring-primary/40 rounded-lg` : ""}
                `}
                style={gridTemplateColumns ? { gridTemplateColumns } : undefined}
              >
                {beforeContentSlot && (
                  <div className="col-span-full">
                    {beforeContentSlot}
                  </div>
                )}
                {avatars.map((avatar, index) => renderAvatarTile(avatar, index))}
                {uploadTile}
              </div>
            )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">确认删除头像</h3>
            <p className="py-4">删除后会进入回收站，可在回收站恢复。</p>
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
          <button
            type="button"
            className="modal-backdrop"
            onClick={handleCancelDelete}
            aria-label="关闭删除确认弹窗"
          />
        </div>
      )}
    </>
  );
}
