import { useEffect, useRef, useState } from "react";

type AddFieldFormProps = {
  onAddField: (key: string, value: string) => void | Promise<void>;
  existingKeys: string[];
  placeholder?: {
    key?: string;
    value?: string;
  };
  className?: string;
  layout?: "inline" | "stacked";
  variant?: "section" | "tile";
  showTitle?: boolean;
  title?: string;
  enableArrowNavigation?: boolean;
};

const defaultPlaceholder = { key: "字段名", value: "字段值" };
type AddFieldStatus = "empty" | "duplicate" | "ready";
type SubmitStatus = "idle" | "saving" | "saved" | "error";

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
  variant = "section",
  showTitle = true,
  title = "添加新字段",
  enableArrowNavigation = false,
}: AddFieldFormProps) {
  const [keyDraft, setKeyDraft] = useState("");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [isStackedOpen, setIsStackedOpen] = useState(false);
  const resetStatusTimerRef = useRef<number | null>(null);
  const keyInputRef = useRef<HTMLInputElement | null>(null);
  const valueInputRef = useRef<HTMLInputElement | null>(null);
  const valueTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return () => {
      if (resetStatusTimerRef.current != null) {
        window.clearTimeout(resetStatusTimerRef.current);
      }
    };
  }, []);

  const readFieldDraft = () => {
    const key = keyInputRef.current?.value ?? "";
    const value = valueInputRef.current?.value ?? valueTextareaRef.current?.value ?? "";
    return { key, value };
  };

  const trimmedKeyDraft = keyDraft.trim();
  const fieldStatus: AddFieldStatus = !trimmedKeyDraft
    ? "empty"
    : existingKeys.includes(trimmedKeyDraft) ? "duplicate" : "ready";

  const resetSubmitStatusLater = () => {
    if (resetStatusTimerRef.current != null) {
      window.clearTimeout(resetStatusTimerRef.current);
    }
    resetStatusTimerRef.current = window.setTimeout(() => {
      setSubmitStatus("idle");
      resetStatusTimerRef.current = null;
    }, 1200);
  };

  const handleAddField = async () => {
    const { key, value } = readFieldDraft();
    const trimmedKey = key.trim();
    if (!trimmedKey || existingKeys.includes(trimmedKey) || submitStatus === "saving") {
      return; // 字段名不能为空或重复
    }

    setSubmitStatus("saving");
    try {
      await onAddField(trimmedKey, value);
      if (keyInputRef.current)
        keyInputRef.current.value = "";
      if (valueInputRef.current)
        valueInputRef.current.value = "";
      if (valueTextareaRef.current)
        valueTextareaRef.current.value = "";
      setKeyDraft("");
      setSubmitStatus("saved");
      if (layout === "stacked") {
        setIsStackedOpen(false);
      }
      resetSubmitStatusLater();
    }
    catch {
      setSubmitStatus("error");
      resetSubmitStatusLater();
    }
  };

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

    if (fieldStatus !== "ready")
      return;

    e.preventDefault();
    void handleAddField();
  };

  const handleCtrlEnterToAdd = (e: any) => {
    if (e?.key !== "Enter")
      return;

    if (e?.nativeEvent?.isComposing)
      return;

    // textarea 保留 Enter 换行，用 Ctrl+Enter 添加
    if (!e.ctrlKey)
      return;

    if (fieldStatus !== "ready")
      return;

    e.preventDefault();
    void handleAddField();
  };

  const canAdd = fieldStatus === "ready";
  const isSubmitting = submitStatus === "saving";
  const isSubmitSaved = submitStatus === "saved";
  const isSubmitError = submitStatus === "error";
  const inlineAddTip = fieldStatus === "duplicate" ? "key 已存在" : "↩︎ 回车";
  const stackedAddTip = fieldStatus === "duplicate" ? "key 已存在" : "Ctrl + ↩︎ 添加";
  const tileShellStateClassName = canAdd
    ? `
      border-primary/55 bg-primary/8 shadow-sm shadow-primary/10
      ring-1 ring-primary/25
    `
    : fieldStatus === "duplicate"
      ? "border-error/45 bg-error/5 ring-1 ring-error/15"
      : "border-base-content/20 bg-base-100";
  const tileSubmitButtonStateClassName = isSubmitSaved
    ? "btn-success text-success-content shadow-sm shadow-success/20"
    : isSubmitError
      ? "btn-error text-error-content shadow-sm shadow-error/20"
      : canAdd || isSubmitting
        ? "btn-primary text-primary-content shadow-sm shadow-primary/25"
        : "btn-ghost text-base-content/35 hover:text-primary hover:bg-primary/10";

  if (layout === "stacked") {
    if (!isStackedOpen) {
      return (
        <div className={`h-full ${className}`}>
          <button
            type="button"
            onClick={() => setIsStackedOpen(true)}
            className="
              flex h-full min-h-16 w-full items-center justify-center gap-2
              rounded-xl border border-dashed border-base-content/14
              bg-base-100/25 px-3 text-sm font-medium text-base-content/52
              transition hover:border-primary/35 hover:bg-base-100/45
              hover:text-primary focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-primary/25
            "
          >
            <span className="
              inline-flex size-6 items-center justify-center rounded-lg
              bg-base-content/6 text-base-content/60
            ">+</span>
            {title}
          </button>
        </div>
      );
    }

    return (
      <div className={`
        h-full rounded-xl border border-dashed border-base-content/18
        bg-base-100/35 p-3 transition-colors
        hover:border-primary/35 hover:bg-base-100/55
        ${className}
      `}>
        {showTitle && (
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="
              inline-flex items-center gap-2 text-sm font-medium
              text-base-content/62
            ">
              <span className="
                inline-flex size-5 items-center justify-center rounded-md
                bg-primary/10 text-primary
              ">+</span>
              {title}
            </span>
            <button
              type="button"
              onClick={() => setIsStackedOpen(false)}
              className="btn btn-ghost btn-xs text-base-content/45 hover:text-base-content"
            >
              收起
            </button>
          </div>
        )}
        <div className="space-y-3">
          <label className="
            input flex w-full items-center gap-2 rounded-lg border-base-content/12
            bg-base-200/35 transition focus-within:border-primary
            focus-within:outline-none focus-within:ring-2
            focus-within:ring-primary/20
          ">
            <input
              ref={keyInputRef}
              type="text"
              onChange={e => setKeyDraft(e.currentTarget.value)}
              onKeyDown={(e) => {
                handleKeyInputArrowSwitch(e);
                handleEnterToAdd(e);
              }}
              placeholder={placeholder.key || "字段名"}
              data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
              className="
                grow border-none bg-transparent outline-none
                placeholder:text-base-content/35 focus:outline-none
              "
            />
          </label>
          <div className="relative">
            <label className="
              textarea flex w-full items-center gap-2 rounded-lg
              border-base-content/12 bg-base-200/35 p-0 transition
              focus-within:border-primary focus-within:outline-none
              focus-within:ring-2 focus-within:ring-primary/20
            ">
              <textarea
                ref={valueTextareaRef}
                onKeyDown={(e) => {
                  handleValueInputArrowSwitch(e);
                  handleCtrlEnterToAdd(e);
                }}
                placeholder={placeholder.value || "字段值"}
                data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
                className="
                  textarea min-h-28 grow border-none bg-transparent pb-12 pr-20
                  outline-none placeholder:text-base-content/35 focus:outline-none
                "
              />
            </label>
            <div className="tooltip tooltip-top absolute bottom-2 right-2" data-tip={stackedAddTip}>
              <button
                type="button"
                onClick={() => void handleAddField()}
                disabled={!canAdd || isSubmitting}
                className="btn btn-primary btn-xs"
              >
                {isSubmitting ? "保存中..." : isSubmitSaved ? "已保存" : isSubmitError ? "保存失败" : "✓ 添加"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "tile") {
    return (
      <div className={`form-control ${className}`}>
        <label className={`
          relative flex items-center gap-2 rounded-lg border
          py-2 px-3 transition-all
          focus-within:border-primary focus-within:ring-1
          focus-within:ring-primary/20
          max-md:flex-col max-md:items-stretch max-md:h-auto max-md:gap-0
          w-full
          md:input md:input-ghost md:h-10
          ${tileShellStateClassName}
        `}>
          <input
            ref={keyInputRef}
            type="text"
            onChange={e => setKeyDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              handleKeyInputArrowSwitch(e);
              handleEnterToAdd(e);
            }}
            placeholder={placeholder.key || "字段名"}
            data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
            className="
              bg-transparent border-none outline-none font-medium
              focus:outline-none
              text-xs
              md:text-sm
              w-full
              md:w-auto md:max-w-[6em] md:shrink-0
              max-md:text-base-content/70
              placeholder:text-base-content/40
            "
          />
          <div className="
            hidden
            md:block
            w-px h-4 bg-base-content/20 mx-2
          "></div>
          <input
            ref={valueInputRef}
            type="text"
            onKeyDown={(e) => {
              handleValueInputArrowSwitch(e);
              handleEnterToAdd(e);
            }}
            placeholder={placeholder.value || "字段值"}
            data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
            className="
              bg-transparent border-none outline-none
              focus:outline-none
              grow min-w-0 text-sm
              max-md:w-full max-md:font-semibold max-md:text-base-content
              placeholder:text-base-content/30
            "
          />
          <button
            type="button"
            onClick={() => void handleAddField()}
            disabled={!canAdd || isSubmitting}
            className={`
              btn btn-circle
              md:static md:btn-xs
              max-md:absolute max-md:top-1 max-md:right-1 max-md:size-6
              max-md:min-h-0
              ${tileSubmitButtonStateClassName}
            `}
            title={inlineAddTip}
            aria-label={isSubmitting ? "保存中" : isSubmitSaved ? "已保存" : isSubmitError ? "保存失败" : "添加字段"}
          >
            {isSubmitting && <span className="loading loading-spinner loading-xs" aria-hidden="true" />}
            {isSubmitSaved && <span className="text-success">✓</span>}
            {isSubmitError && <span className="text-error">!</span>}
            {submitStatus === "idle" && "✓"}
          </button>
        </label>
      </div>
    );
  }

  return (
    <div className={`
      border-t-2 pt-4 border-base-content/10
      ${className}
    `}>
      {showTitle && (
        <span className="text-sm text-base-content/50 mb-2 block">{title}</span>
      )}
      <label className="
        input flex items-center gap-2 rounded-md transition
        focus-within:ring-2 focus-within:ring-primary/20
        focus-within:border-primary focus-within:outline-none
      ">
        <input
          ref={keyInputRef}
          type="text"
          onChange={e => setKeyDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            handleKeyInputArrowSwitch(e);
            handleEnterToAdd(e);
          }}
          placeholder={placeholder.key || "字段名"}
          data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
          className="
            text-sm font-medium bg-transparent border-none
            focus:outline-none
            outline-none w-24 shrink-0
          "
        />
        <div className="w-px h-4 bg-base-content/20"></div>
        <input
          ref={valueInputRef}
          type="text"
          onKeyDown={(e) => {
            handleValueInputArrowSwitch(e);
            handleEnterToAdd(e);
          }}
          placeholder={placeholder.value || "字段值"}
          data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
          className="
            grow
            focus:outline-none
            border-none outline-none
          "
        />
        <div className="tooltip tooltip-top" data-tip={inlineAddTip}>
          <button
            type="button"
            onClick={() => void handleAddField()}
            disabled={!canAdd || isSubmitting}
            className="btn btn-xs btn-primary"
          >
            {isSubmitting ? "保存中..." : isSubmitSaved ? "已保存" : isSubmitError ? "保存失败" : "✓ 添加"}
          </button>
        </div>
      </label>
    </div>
  );
}
