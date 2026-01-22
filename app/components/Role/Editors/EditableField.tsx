import { useState } from "react";

interface EditableFieldProps {
  fieldKey: string;
  value: string;
  isEditing: boolean;
  onValueChange: (key: string, value: string) => void;
  onValueCommit?: (key: string, value: string) => void;
  onDelete: (key: string) => void;
  onRename: (oldKey: string, newKey: string) => void;
  className?: string;
  valueInputClassName?: string;
  showDeleteButton?: boolean;
  size?: "default" | "compact";
}

/**
 * 可编辑字段组件
 * 支持字段名编辑、值编辑和删除功能
 */
export default function EditableField({
  fieldKey,
  value,
  isEditing,
  onValueChange,
  onValueCommit,
  onDelete,
  onRename,
  className = "",
  valueInputClassName,
  showDeleteButton = true,
  size = "default",
}: EditableFieldProps) {
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [tempFieldKey, setTempFieldKey] = useState("");
  const isCompact = size === "compact";
  const resolvedValueInputClassName
    = valueInputClassName
      || `${isCompact ? "text-xs" : ""} grow focus:outline-none border-none outline-none`;

  const handleRename = (newKey: string) => {
    if (!newKey.trim() || newKey === fieldKey) {
      return;
    }
    onRename(fieldKey, newKey);
  };

  if (!isEditing) {
    return (
      <div className={`flex items-center justify-between rounded-lg border bg-base-100/50 whitespace-nowrap border-base-content/10 ${
        isCompact ? "px-2 py-1" : "p-2 md:p-3"
      }`}
      >
        <span className={`font-medium shrink-0 md:mr-4 ${isCompact ? "text-xs" : "text-sm md:text-base"}`}>
          {fieldKey}
        </span>
        <span className={`badge shrink-0 badge-ghost ${isCompact ? "badge-xs" : "text-sm md:text-base"}`}>
          {String(value)}
        </span>
      </div>
    );
  }

  return (
    <div className={`form-control ${className}`}>
      <label className={`input flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none ${
        isCompact ? "input" : ""
      }`}
      >
        {/* 字段名编辑 */}
        {editingFieldKey === fieldKey
          ? (
              <input
                type="text"
                value={tempFieldKey}
                onChange={e => setTempFieldKey(e.target.value)}
                onBlur={() => {
                  if (tempFieldKey.trim() && tempFieldKey !== fieldKey) {
                    handleRename(tempFieldKey);
                  }
                  setEditingFieldKey(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (tempFieldKey.trim() && tempFieldKey !== fieldKey) {
                      handleRename(tempFieldKey);
                    }
                    setEditingFieldKey(null);
                  }
                }}
                className={`${isCompact ? "text-xs" : "text-sm"} font-medium whitespace-nowrap bg-transparent border-none focus:outline-none outline-none shrink-0`}
                autoFocus
              />
            )
          : (
              <span
                className={`${isCompact ? "text-xs" : "text-sm"} font-medium whitespace-nowrap cursor-pointer hover:text-primary shrink-0 text-left`}
                onClick={() => {
                  setEditingFieldKey(fieldKey);
                  setTempFieldKey(fieldKey);
                }}
                title="点击编辑字段名"
              >
                {fieldKey}
              </span>
            )}

        <div className="w-px h-4 bg-base-content/20"></div>

        {/* 字段值编辑 */}
        <input
          type="text"
          value={String(value)}
          onChange={e => onValueChange(fieldKey, e.target.value)}
          onBlur={e => onValueCommit?.(fieldKey, e.currentTarget.value)}
          onKeyDown={(e) => {
            if (!onValueCommit)
              return;
            if (e.key !== "Enter")
              return;
            if (e.nativeEvent.isComposing)
              return;
            e.preventDefault();
            onValueCommit?.(fieldKey, (e.target as HTMLInputElement).value);
          }}
          className={resolvedValueInputClassName}
        />

        {/* 删除按钮 */}
        {showDeleteButton && (
          <button
            type="button"
            onClick={() => onDelete(fieldKey)}
            className={`btn btn-ghost ${isCompact ? "btn-xs" : "btn-xs"} text-error hover:bg-error/10`}
            title="删除字段"
          >
            ✕
          </button>
        )}
      </label>
    </div>
  );
}
