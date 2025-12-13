import type { RoleAvatar } from "api";
import { BaselineDeleteOutline } from "@/icons";
import { CharacterCopper } from "../../RoleInfoCard/AvatarUploadCropper";

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
  /** 删除回调 */
  onDelete?: (index: number) => void;
  /** 是否为骰娘模式（显示可编辑名称） */
  isDiceMaiden?: boolean;
  /** 当前正在编辑的头像ID */
  editingAvatarId?: number | null;
  /** 当前编辑的名称 */
  editingName?: string;
  /** 开始编辑名称回调 */
  onStartEditName?: (avatarId: number, currentName: string) => void;
  /** 更新编辑名称回调 */
  onUpdateEditingName?: (name: string) => void;
  /** 保存名称回调 */
  onSaveAvatarName?: (avatarId: number) => void;
  /** 取消编辑回调 */
  onCancelEditName?: () => void;
  /** 键盘事件处理回调 */
  onKeyDown?: (e: React.KeyboardEvent, avatarId: number) => void;
  /** 是否启用多选模式 */
  multiSelectMode?: boolean;
  /** 已选中的索引集合 */
  selectedIndices?: Set<number>;
  /** 切换选中状态回调 */
  onToggleSelection?: (index: number) => void;
  /** 全选/取消全选回调 */
  onSelectAll?: () => void;
}

/**
 * 立绘/头像列表网格组件
 * 可复用于立绘列表 Tab 和情感设定 Tab
 */
const defaultSelectedIndices = new Set<number>();

export function SpriteListGrid({
  avatars,
  selectedIndex,
  onSelect,
  className = "",
  gridCols = "grid-cols-4 md:grid-cols-3",
  mode = "view",
  onUpload,
  fileName,
  onDelete,
  isDiceMaiden = false,
  editingAvatarId = null,
  editingName = "",
  onStartEditName,
  onUpdateEditingName,
  onSaveAvatarName,
  onCancelEditName,
  onKeyDown,
  multiSelectMode = false,
  selectedIndices = defaultSelectedIndices,
  onToggleSelection,
  onSelectAll,
}: SpriteListGridProps) {
  // 管理模式下启用上传和删除功能
  const isManageMode = mode === "manage";
  const showUpload = isManageMode;
  const showDelete = isManageMode;

  // Helper function to get avatar display name
  const getAvatarName = (avatar: RoleAvatar, index: number): string => {
    const label = avatar.avatarTitle?.label;
    if (label)
      return label;
    return index === 0 ? "默认" : `头像${index + 1}`;
  };

  // Handle name edit start
  const handleStartEdit = (avatar: RoleAvatar, index: number) => {
    if (!avatar.avatarId)
      return;
    const currentName = getAvatarName(avatar, index);
    onStartEditName?.(avatar.avatarId, currentName);
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
    <div className={`flex flex-col ${className}`}>
      {/* Select All checkbox - shown in multi-select mode */}
      {multiSelectMode && avatars.length > 0 && (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-base-300">
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
              onChange={onSelectAll}
            />
            <span className="text-sm font-medium">
              {allSelected ? "取消全选" : someSelected ? `已选 ${selectedIndices.size}` : "全选"}
            </span>
          </label>
        </div>
      )}

      <div className={`grid ${gridCols} gap-2 overflow-auto content-start`}>
        {avatars.map((avatar, index) => {
          const isEditing = editingAvatarId === avatar.avatarId;
          const avatarName = getAvatarName(avatar, index);
          const isSelected = multiSelectMode ? selectedIndices.has(index) : index === selectedIndex;

          return (
            <div key={avatar.avatarId} className="flex flex-col gap-1">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    if (multiSelectMode) {
                      onToggleSelection?.(index);
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
                        onChange={() => onToggleSelection?.(index)}
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
                {showDelete && canDelete && onDelete && !multiSelectMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(index);
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
                            value={editingName}
                            onChange={e => onUpdateEditingName?.(e.target.value)}
                            onKeyDown={e => avatar.avatarId && onKeyDown?.(e, avatar.avatarId)}
                            className="input input-xs input-bordered flex-1 min-w-0 text-center"
                            autoFocus
                            placeholder="输入名称"
                          />
                          <button
                            type="button"
                            onClick={() => avatar.avatarId && onSaveAvatarName?.(avatar.avatarId)}
                            className="btn btn-xs btn-primary"
                            title="保存"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={onCancelEditName}
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
  );
}
