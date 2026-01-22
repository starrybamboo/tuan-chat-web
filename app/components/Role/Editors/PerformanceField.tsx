import { useState } from "react";

interface PerformanceFieldProps {
  fieldKey: string;
  value: string;
  onValueChange: (key: string, value: string) => void;
  onValueCommit?: (key: string, value: string) => void;
  onDelete: (key: string) => void;
  onRename: (oldKey: string, newKey: string) => void;
  placeholder?: string;
  rowSpan?: number; // 用于根据网格跨行数决定高度
  size?: "default" | "compact";
}

/**
 * 表演字段编辑器组件
 * 专门用于处理需要 textarea 的长文本字段
 */
export default function PerformanceField({
  fieldKey,
  value,
  onValueChange,
  onValueCommit,
  onDelete,
  onRename,
  placeholder = "请输入描述...",
  rowSpan = 1,
  size = "default",
}: PerformanceFieldProps) {
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [tempFieldKey, setTempFieldKey] = useState("");
  const isCompact = size === "compact";
  const minHeight = isCompact ? rowSpan * 3 : rowSpan * 6;

  const handleRename = (newKey: string) => {
    if (!newKey.trim() || newKey === fieldKey) {
      return;
    }
    onRename(fieldKey, newKey);
  };

  return (
    <div className="form-control w-full">
      <div className={`flex items-center gap-2 ${isCompact ? "mb-1" : "mb-2"}`}>
        {editingFieldKey === fieldKey
          ? (
              <label className={`input flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none bg-base-100 flex-1 ${
                isCompact ? "input-xs" : "input-sm"
              }`}
              >
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
                  className={`grow focus:outline-none border-none outline-none bg-transparent font-semibold ${isCompact ? "text-xs" : "text-base"}`}
                  autoFocus
                />
              </label>
            )
          : (
              <span
                className={`ml-1 font-semibold label-text cursor-pointer hover:text-primary flex-1 ${
                  isCompact ? "text-xs" : "text-base"
                }`}
                onClick={() => {
                  setEditingFieldKey(fieldKey);
                  setTempFieldKey(fieldKey);
                }}
                title="点击编辑字段名"
              >
                {fieldKey}
              </span>
            )}
        <button
          type="button"
          onClick={() => onDelete(fieldKey)}
          className="btn btn-ghost btn-xs text-error hover:bg-error/10"
          title="删除字段"
        >
          ✕
        </button>
      </div>

      <label className={`textarea w-full flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none bg-base-100 p-0 h-full ${
        isCompact ? "textarea-sm" : ""
      }`}
      >
        <textarea
          className={`textarea grow focus:outline-none border-none outline-none bg-transparent h-full resize-none ${
            isCompact ? "text-xs" : ""
          }`}
          style={{ minHeight: `${minHeight}rem` }}
          placeholder={placeholder}
          value={value === "0" ? "" : String(value ?? "")}
          onChange={e => onValueChange(fieldKey, e.target.value)}
          onBlur={e => onValueCommit?.(fieldKey, e.currentTarget.value)}
        />
      </label>
    </div>
  );
}
