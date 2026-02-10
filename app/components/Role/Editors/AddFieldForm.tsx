import { useRef, useState } from "react";

interface AddFieldFormProps {
  onAddField: (key: string, value: string) => void;
  existingKeys: string[];
  placeholder?: {
    key?: string;
    value?: string;
  };
  className?: string;
  layout?: "inline" | "stacked";
  showTitle?: boolean;
  title?: string;
}

const defaultPlaceholder = { key: "字段名", value: "字段值" };

/**
 * 添加字段表单组件
 * 提供统一的添加新字段界面
 */
export default function AddFieldForm({
  onAddField,
  existingKeys,
  placeholder = defaultPlaceholder,
  className = "",
  layout = "inline",
  showTitle = true,
  title = "添加新字段",
}: AddFieldFormProps) {
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const keyInputRef = useRef<HTMLInputElement | null>(null);
  const valueInputRef = useRef<HTMLInputElement | null>(null);
  const valueTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleAddField = () => {
    if (!newFieldKey.trim() || existingKeys.includes(newFieldKey)) {
      return; // 字段名不能为空或重复
    }

    onAddField(newFieldKey, newFieldValue);
    setNewFieldKey("");
    setNewFieldValue("");
  };

  const canAdd = newFieldKey.trim() && !existingKeys.includes(newFieldKey);

  const focusKeyInput = () => {
    const el = keyInputRef.current;
    if (!el)
      return;
    el.focus();
    const pos = el.value.length;
    el.setSelectionRange(pos, pos);
  };

  const focusValueInput = () => {
    const inputEl = valueInputRef.current;
    if (inputEl) {
      inputEl.focus();
      const pos = inputEl.value.length;
      inputEl.setSelectionRange(pos, pos);
      return;
    }

    const textareaEl = valueTextareaRef.current;
    if (!textareaEl)
      return;
    textareaEl.focus();
    const pos = textareaEl.value.length;
    textareaEl.setSelectionRange(pos, pos);
  };

  const shouldIgnoreArrowSwitch = (e: React.KeyboardEvent<HTMLElement>) => {
    return Boolean(
      e.nativeEvent.isComposing
      || e.ctrlKey
      || e.metaKey
      || e.altKey
      || e.shiftKey,
    );
  };

  const handleKeyInputArrowSwitch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (shouldIgnoreArrowSwitch(e))
      return;
    if (e.key !== "ArrowRight")
      return;

    e.preventDefault();
    focusValueInput();
  };

  const handleValueInputArrowSwitch = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (shouldIgnoreArrowSwitch(e))
      return;
    if (e.key !== "ArrowLeft")
      return;

    const cursorStart = e.currentTarget.selectionStart ?? 0;
    const cursorEnd = e.currentTarget.selectionEnd ?? 0;
    if (cursorStart !== 0 || cursorEnd !== 0)
      return;

    e.preventDefault();
    focusKeyInput();
  };

  const handleEnterToAdd = (e: any) => {
    if (e?.key !== "Enter")
      return;

    // 避免输入法确认阶段误触发
    if (e?.nativeEvent?.isComposing)
      return;

    if (!canAdd)
      return;

    e.preventDefault();
    handleAddField();
  };

  const handleCtrlEnterToAdd = (e: any) => {
    if (e?.key !== "Enter")
      return;

    if (e?.nativeEvent?.isComposing)
      return;

    // textarea 保留 Enter 换行，用 Ctrl+Enter 添加
    if (!e.ctrlKey)
      return;

    if (!canAdd)
      return;

    e.preventDefault();
    handleAddField();
  };

  if (layout === "stacked") {
    return (
      <div className={`border-2 border-dashed border-base-content/20 rounded-lg p-4 bg-base-50 h-full ${className}`}>
        {showTitle && (
          <span className="text-sm text-base-content/50 mb-3 block">{title}</span>
        )}
        <div className="space-y-3">
          <label className="input flex items-center w-full gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none bg-base-100">
            <input
              ref={keyInputRef}
              type="text"
              value={newFieldKey}
              onChange={e => setNewFieldKey(e.target.value)}
              onKeyDown={(e) => {
                handleKeyInputArrowSwitch(e);
                handleEnterToAdd(e);
              }}
              placeholder={placeholder.key || "字段名"}
              className="grow focus:outline-none border-none outline-none bg-transparent"
            />
          </label>
          <div className="relative">
            <label className="textarea flex items-center w-full gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none bg-base-100 p-0">
              <textarea
                ref={valueTextareaRef}
                value={newFieldValue}
                onChange={e => setNewFieldValue(e.target.value)}
                onKeyDown={(e) => {
                  handleValueInputArrowSwitch(e);
                  handleCtrlEnterToAdd(e);
                }}
                placeholder={placeholder.value || "字段值"}
                className="textarea grow focus:outline-none border-none outline-none bg-transparent min-h-32 pr-20 pb-12"
              />
            </label>
            <button
              type="button"
              onClick={handleAddField}
              disabled={!canAdd}
              className="btn btn-primary btn-xs absolute bottom-2 right-2"
            >
              ✓ 添加
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-t-2 pt-4 border-base-content/10 ${className}`}>
      {showTitle && (
        <span className="text-sm text-base-content/50 mb-2 block">{title}</span>
      )}
      <label className="input flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none">
        <input
          ref={keyInputRef}
          type="text"
          value={newFieldKey}
          onChange={e => setNewFieldKey(e.target.value)}
          onKeyDown={(e) => {
            handleKeyInputArrowSwitch(e);
            handleEnterToAdd(e);
          }}
          placeholder={placeholder.key || "字段名"}
          className="text-sm font-medium bg-transparent border-none focus:outline-none outline-none w-24 flex-shrink-0"
        />
        <div className="w-px h-4 bg-base-content/20"></div>
        <input
          ref={valueInputRef}
          type="text"
          value={newFieldValue}
          onChange={e => setNewFieldValue(e.target.value)}
          onKeyDown={(e) => {
            handleValueInputArrowSwitch(e);
            handleEnterToAdd(e);
          }}
          placeholder={placeholder.value || "字段值"}
          className="grow focus:outline-none border-none outline-none"
        />
        <button
          type="button"
          onClick={handleAddField}
          disabled={!canAdd}
          className="btn btn-xs btn-primary"
          title="添加字段"
        >
          ✓ 添加
        </button>
      </label>
    </div>
  );
}
