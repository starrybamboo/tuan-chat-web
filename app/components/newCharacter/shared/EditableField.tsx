import { useState } from "react";

interface EditableFieldProps {
  fieldKey: string;
  value: string;
  isEditing: boolean;
  onValueChange: (key: string, value: string) => void;
  onDelete: (key: string) => void;
  onRename: (oldKey: string, newKey: string) => void;
  className?: string;
  valueInputClassName?: string;
  showDeleteButton?: boolean;
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
  onDelete,
  onRename,
  className = "",
  valueInputClassName = "grow focus:outline-none border-none outline-none",
  showDeleteButton = true,
}: EditableFieldProps) {
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [tempFieldKey, setTempFieldKey] = useState("");

  const handleRename = (newKey: string) => {
    if (!newKey.trim() || newKey === fieldKey) {
      return;
    }
    onRename(fieldKey, newKey);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between p-2 md:p-3 rounded-lg border bg-base-100/50 whitespace-nowrap border-base-content/10">
        <span className="font-medium text-sm md:text-base flex-shrink-0 md:mr-4">{fieldKey}</span>
        <span className="badge text-sm md:text-base flex-shrink-0 badge-ghost">
          {String(value)}
        </span>
      </div>
    );
  }

  return (
    <div className={`form-control ${className}`}>
      <label className="input flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none">
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
                className="text-sm font-medium whitespace-nowrap bg-transparent border-none focus:outline-none outline-none flex-shrink-0"
                autoFocus
              />
            )
          : (
              <span
                className="text-sm font-medium whitespace-nowrap cursor-pointer hover:text-primary flex-shrink-0 text-left"
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
          className={valueInputClassName}
        />

        {/* 删除按钮 */}
        {showDeleteButton && (
          <button
            type="button"
            onClick={() => onDelete(fieldKey)}
            className="btn btn-ghost btn-xs text-error hover:bg-error/10"
            title="删除字段"
          >
            ✕
          </button>
        )}
      </label>
    </div>
  );
}
