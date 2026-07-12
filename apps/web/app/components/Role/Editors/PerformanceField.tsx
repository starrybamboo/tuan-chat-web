import { useState } from "react";

import { IconButton } from "@/components/common/IconButton";
import { FieldGroup, formControlShellClassName, TextArea, TextInput } from "@/components/common/FormField";

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
    <FieldGroup className="
      group/form-field h-full w-full rounded-xl border
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
              <label className={formControlShellClassName({
                surface: "muted",
                className: "flex-1 gap-2 bg-base-200/60",
              })}>
                <TextInput
                  appearance="bare"
                  density={isCompact ? "compact" : "default"}
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
                    if (e.nativeEvent.isComposing)
                      return;
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
              <button
                type="button"
                className={`
                  min-w-0 flex-1 cursor-pointer truncate bg-transparent p-0
                  text-left font-semibold
                  text-base-content/90 hover:text-info
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30
                  ${
                  isCompact ? "text-xs" : "text-base"
                }
                `}
                onClick={() => {
                  setEditingFieldKey(fieldKey);
                  setTempFieldKey(fieldKey);
                }}
                title={`点击编辑字段名：${fieldKey}`}
              >
                {fieldKey}
              </button>
            )}
        <IconButton
          size="xs"
          label={`删除字段 ${fieldKey}`}
          onClick={() => onDelete(fieldKey)}
          className="
            size-6 min-h-6 shrink-0 rounded-md p-0
            text-base-content/50 opacity-100 transition
            hover:bg-error/10 hover:text-error
            md:opacity-0 md:group-hover/form-field:opacity-100
            md:focus-visible:opacity-100
          "
          title="删除字段"
          icon="✕"
        />
      </div>

      <label className={formControlShellClassName({
        surface: "muted",
        className: "size-full gap-2 rounded-lg border-base-content/10 bg-base-200/45 p-0",
      })}>
        <TextArea
          appearance="bare"
          density={isCompact ? "compact" : "default"}
          className={`
            h-full grow resize-none leading-relaxed
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
    </FieldGroup>
  );
}
