import { useState } from "react";

type PerformanceFieldProps = {
  fieldKey: string;
  value: string;
  onValueChange: (key: string, value: string) => void;
  onValueCommit?: (key: string, value: string) => void;
  onDelete: (key: string) => void;
  onRename: (oldKey: string, newKey: string) => void;
  placeholder?: string;
  rowSpan?: number; // 用于根据网格跨行数决定高度
  size?: "default" | "compact";
  enableArrowNavigation?: boolean;
  commitOnBlur?: boolean;
};

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
  enableArrowNavigation = false,
  commitOnBlur = true,
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
    <div className="
      group/form-field form-control h-full w-full rounded-xl border
      border-base-content/10 bg-base-100/55 p-3
      transition-colors hover:border-base-content/18 hover:bg-base-100/75
      focus-within:border-info/45 focus-within:bg-base-100
    ">
      <div className={`
        flex min-h-6 items-center gap-2
        ${isCompact ? "mb-1" : "mb-2"}
      `}>
        {editingFieldKey === fieldKey
          ? (
              <label className={`
                input flex flex-1 items-center gap-2 rounded-md bg-base-200/60
                transition focus-within:border-info focus-within:outline-none
                focus-within:ring-2 focus-within:ring-info/20
                ${
                isCompact ? "input-xs" : "input-sm"
              }
              `}
              >
                <input
                  type="text"
                  autoComplete="off"
                  aria-label="字段名"
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
                  data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
                  className={`
                    grow
                    focus:outline-none focus:ring-2 focus:ring-info/30
                    border-none outline-none bg-transparent font-semibold
                    ${isCompact ? `text-xs` : `text-base`}
                  `}

                />
              </label>
            )
          : (
              <span
                className={`
                  label-text min-w-0 flex-1 cursor-pointer truncate font-semibold
                  text-base-content/90 hover:text-info
                  ${
                  isCompact ? "text-xs" : "text-base"
                }
                `}
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
          className="
            btn btn-ghost btn-xs size-6 min-h-6 shrink-0 rounded-md p-0
            text-base-content/50 opacity-100 transition
            hover:bg-error/10 hover:text-error
            md:opacity-0 md:group-hover/form-field:opacity-100
            md:focus-visible:opacity-100
          "
          title="删除字段"
        >
          ✕
        </button>
      </div>

      <label className={`
        textarea flex size-full items-center gap-2 rounded-lg border-base-content/10
        bg-base-200/45 p-0 transition
        focus-within:border-info focus-within:outline-none
        focus-within:ring-2 focus-within:ring-info/20
        ${
        isCompact ? "textarea-sm" : ""
      }
      `}
      >
        <textarea
          className={`
            textarea h-full grow resize-none border-none bg-transparent
            leading-relaxed outline-none focus:outline-none focus:ring-2 focus:ring-info/30
            placeholder:text-base-content/35
            ${
            isCompact ? "text-xs" : ""
          }
          `}
          style={{ minHeight: `${minHeight}rem` }}
          autoComplete="off"
          placeholder={placeholder}
          value={value === "0" ? "" : String(value ?? "")}
          onChange={e => onValueChange(fieldKey, e.target.value)}
          onBlur={e => commitOnBlur && onValueCommit?.(fieldKey, e.currentTarget.value)}
          data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
        />
      </label>
    </div>
  );
}
