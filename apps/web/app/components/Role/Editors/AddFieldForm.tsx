import { PlusIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/common/Button";
import { FieldGroup, formControlShellClassName, TextArea, TextInput } from "@/components/common/FormField";
import { IconButton } from "@/components/common/IconButton";
import PortalTooltip from "@/components/common/portalTooltip";

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
      border-info/55 bg-info/8
    `
    : fieldStatus === "duplicate"
      ? "border-error/45 bg-error/5"
      : "border-base-content/20 bg-base-100";
  const tileSubmitButtonStateClassName = isSubmitSaved
    ? "text-success"
    : isSubmitError
      ? "text-error hover:bg-error/10 focus-visible:bg-error/10 focus-visible:ring-0"
      : canAdd || isSubmitting
        ? "text-info hover:bg-info/10 focus-visible:bg-info/10 focus-visible:ring-0"
        : "text-base-content/40 hover:text-info hover:bg-info/10 focus-visible:bg-info/10 focus-visible:ring-0";
  const addButtonIcon = submitStatus === "idle"
    ? <PlusIcon weight="bold" aria-hidden="true" />
    : undefined;

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
              transition hover:border-info/35 hover:bg-base-100/45
              hover:text-info focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-info/25
            "
          >
            <span className="
              inline-flex size-6 items-center justify-center rounded-lg
              bg-base-content/6 text-base-content/60
            "><PlusIcon className="size-4" weight="bold" aria-hidden="true" /></span>
            {title}
          </button>
        </div>
      );
    }

    return (
      <div className={`
        h-full rounded-xl border border-dashed border-base-content/18
        bg-base-100/35 p-3 transition-colors
        hover:border-info/35 hover:bg-base-100/55
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
                bg-info/10 text-info
              "><PlusIcon className="size-3.5" weight="bold" aria-hidden="true" /></span>
              {title}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setIsStackedOpen(false)}
              className="text-base-content/50 hover:text-base-content"
            >
              收起
            </Button>
          </div>
        )}
        <div className="space-y-3">
          <div className={formControlShellClassName({
            surface: "muted",
            className: "w-full gap-2 rounded-lg border-base-content/12 bg-base-200/35",
          })}>
            <TextInput
              appearance="bare"
              ref={keyInputRef}
              type="text"
              autoComplete="off"
              onChange={e => setKeyDraft(e.currentTarget.value)}
              onKeyDown={(e) => {
                handleKeyInputArrowSwitch(e);
                handleEnterToAdd(e);
              }}
              aria-label="字段名"
              placeholder={placeholder.key || "字段名"}
              data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
              className="
                grow placeholder:text-base-content/35
              "
            />
          </div>
          <div className="relative">
            <div className={formControlShellClassName({
              surface: "muted",
              className: "w-full gap-2 rounded-lg border-base-content/12 bg-base-200/35 p-0",
            })}>
              <TextArea
                appearance="bare"
                ref={valueTextareaRef}
                autoComplete="off"
                onKeyDown={(e) => {
                  handleValueInputArrowSwitch(e);
                  handleCtrlEnterToAdd(e);
                }}
                aria-label="字段值"
                placeholder={placeholder.value || "字段值"}
                data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
                className="min-h-28 grow pb-12 pr-20 placeholder:text-base-content/35"
              />
            </div>
            <PortalTooltip label={stackedAddTip} placement="top" anchorClassName="absolute bottom-2 right-2">
              <Button
                variant="primary"
                size="xs"
                loading={isSubmitting}
                icon={addButtonIcon}
                onClick={() => void handleAddField()}
                disabled={!canAdd || isSubmitting}
                title={
                  isSubmitting
                    ? "正在保存字段"
                    : fieldStatus === "empty"
                      ? "请输入字段名"
                      : stackedAddTip
                }
              >
                {isSubmitting ? "保存中..." : isSubmitSaved ? "已保存" : isSubmitError ? "保存失败" : "添加"}
              </Button>
            </PortalTooltip>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "tile") {
    return (
      <FieldGroup className={className}>
        <div
          role="group"
          aria-label="添加字段"
          className={formControlShellClassName({
          className: `
            gap-2 px-3 py-2
            max-md:h-auto max-md:flex-col max-md:items-stretch max-md:gap-0
            w-full md:h-10
            ${tileShellStateClassName}
          `,
          })}
        >
          <TextInput
            appearance="bare"
            ref={keyInputRef}
            type="text"
            onChange={e => setKeyDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              handleKeyInputArrowSwitch(e);
              handleEnterToAdd(e);
            }}
            placeholder={placeholder.key || "字段名"}
            autoComplete="off"
            data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
            className="
              font-medium
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
          <TextInput
            appearance="bare"
            ref={valueInputRef}
            type="text"
            onKeyDown={(e) => {
              handleValueInputArrowSwitch(e);
              handleEnterToAdd(e);
            }}
            placeholder={placeholder.value || "字段值"}
            autoComplete="off"
            data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
            className="
              grow min-w-0 text-sm
              max-md:w-full max-md:font-semibold max-md:text-base-content
              placeholder:text-base-content/30
            "
          />
          <IconButton
            variant="ghost"
            shape="square"
            size="xs"
            loading={isSubmitting}
            onClick={() => void handleAddField()}
            disabled={!canAdd || isSubmitting}
            className={`
              md:static
              max-md:absolute max-md:right-0 max-md:top-0
              max-md:min-h-hit-default max-md:min-w-hit-default
              ${tileSubmitButtonStateClassName}
            `}
            title={inlineAddTip}
            label={isSubmitting ? "保存中" : isSubmitSaved ? "已保存" : isSubmitError ? "保存失败" : "添加字段"}
            icon={<PlusIcon weight="bold" aria-hidden="true" />}
          />
        </div>
      </FieldGroup>
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
      <div role="group" aria-label="添加字段" className={formControlShellClassName({ className: "gap-2" })}>
        <TextInput
          appearance="bare"
          ref={keyInputRef}
          type="text"
          onChange={e => setKeyDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            handleKeyInputArrowSwitch(e);
            handleEnterToAdd(e);
          }}
          placeholder={placeholder.key || "字段名"}
          autoComplete="off"
          data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
          className="
            w-24 shrink-0 text-sm font-medium
          "
        />
        <div className="w-px h-4 bg-base-content/20"></div>
        <TextInput
          appearance="bare"
          ref={valueInputRef}
          type="text"
          onKeyDown={(e) => {
            handleValueInputArrowSwitch(e);
            handleEnterToAdd(e);
          }}
          placeholder={placeholder.value || "字段值"}
          autoComplete="off"
          data-arrow-nav-control={enableArrowNavigation ? "true" : undefined}
          className="grow"
        />
        <PortalTooltip label={inlineAddTip} placement="top">
          <Button
            variant="primary"
            size="xs"
            loading={isSubmitting}
            icon={addButtonIcon}
            onClick={() => void handleAddField()}
            disabled={!canAdd || isSubmitting}
            title={
              isSubmitting
                ? "正在保存字段"
                : fieldStatus === "empty"
                  ? "请输入字段名"
                : inlineAddTip
            }
          >
            {isSubmitting ? "保存中..." : isSubmitSaved ? "已保存" : isSubmitError ? "保存失败" : "添加"}
          </Button>
        </PortalTooltip>
      </div>
    </div>
  );
}
