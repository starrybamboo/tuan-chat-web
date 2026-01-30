import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CommitReason = "enter" | "blur" | "programmatic";
type CancelReason = "escape" | "invalid" | "programmatic";
type InvalidReason = "parse" | "validate";
type InvalidBehavior = "keepEditing" | "revert";

export interface DoubleClickEditableTextProps<T = string> {
  value: T;
  onCommit: (nextValue: T, meta: { previousValue: T; rawValue: string; reason: CommitReason }) => void;
  onCancel?: (meta: { previousValue: T; rawValue: string; reason: CancelReason }) => void;
  onInvalid?: (meta: { rawValue: string; reason: InvalidReason; message?: string }) => void;
  onEditingChange?: (editing: boolean) => void;
  formatDisplay?: (value: T) => string;
  formatInput?: (value: T) => string;
  parse?: (rawValue: string, previousValue: T) => T | null;
  validate?: (nextValue: T, previousValue: T) => string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  displayProps?: React.HTMLAttributes<HTMLSpanElement>;
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onKeyDown" | "onBlur">;
  trigger?: "doubleClick" | "click";
  commitOnBlur?: boolean;
  commitOnEnter?: boolean;
  selectAllOnFocus?: boolean;
  invalidBehavior?: InvalidBehavior;
  renderDisplay?: (params: { displayValue: string; isEditing: boolean; startEditing: () => void }) => React.ReactNode;
  renderInput?: (params: {
    value: string;
    setValue: (nextValue: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    commit: () => void;
    cancel: () => void;
    error: string | null;
  }) => React.ReactNode;
}

const defaultFormat = (value: unknown) => (value === null || value === undefined ? "" : String(value));

export function DoubleClickEditableText<T = string>({
  value,
  onCommit,
  onCancel,
  onInvalid,
  onEditingChange,
  formatDisplay,
  formatInput,
  parse,
  validate,
  placeholder,
  disabled = false,
  className,
  displayClassName,
  inputClassName,
  displayProps,
  inputProps,
  trigger = "doubleClick",
  commitOnBlur = true,
  commitOnEnter = true,
  selectAllOnFocus = true,
  invalidBehavior = "revert",
  renderDisplay,
  renderInput,
}: DoubleClickEditableTextProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef(value);

  const displayValue = useMemo(() => {
    return formatDisplay ? formatDisplay(value) : defaultFormat(value);
  }, [formatDisplay, value]);

  const inputValue = useMemo(() => {
    return formatInput ? formatInput(value) : displayValue;
  }, [formatInput, displayValue, value]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!isEditing) {
      setDraft(inputValue);
    }
  }, [inputValue, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }
    const input = inputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    if (selectAllOnFocus) {
      input.select();
    }
  }, [isEditing, selectAllOnFocus]);

  const updateEditing = useCallback((nextEditing: boolean) => {
    setIsEditing(nextEditing);
    onEditingChange?.(nextEditing);
  }, [onEditingChange]);

  const handleInvalid = useCallback((reason: InvalidReason, message?: string) => {
    setError(message ?? null);
    onInvalid?.({ rawValue: draft, reason, message });
    if (invalidBehavior === "keepEditing") {
      requestAnimationFrame(() => inputRef.current?.focus());
      return false;
    }
    updateEditing(false);
    onCancel?.({ previousValue: valueRef.current, rawValue: draft, reason: "invalid" });
    return false;
  }, [draft, invalidBehavior, onCancel, onInvalid, updateEditing]);

  const commit = useCallback((reason: CommitReason) => {
    const previousValue = valueRef.current;
    const rawValue = draft;
    const parseValue = parse ?? ((raw: string) => raw as unknown as T);
    const nextValue = parseValue(rawValue, previousValue);
    if (nextValue === null) {
      return handleInvalid("parse");
    }
    const validationMessage = validate?.(nextValue, previousValue) ?? null;
    if (validationMessage) {
      return handleInvalid("validate", validationMessage);
    }
    setError(null);
    updateEditing(false);
    if (!Object.is(nextValue, previousValue)) {
      onCommit(nextValue, { previousValue, rawValue, reason });
    }
    return true;
  }, [draft, handleInvalid, onCommit, parse, updateEditing, validate]);

  const cancel = useCallback((reason: CancelReason = "programmatic") => {
    setError(null);
    updateEditing(false);
    setDraft(inputValue);
    onCancel?.({ previousValue: valueRef.current, rawValue: draft, reason });
  }, [draft, inputValue, onCancel, updateEditing]);

  const startEditing = useCallback(() => {
    if (disabled) {
      return;
    }
    setError(null);
    setDraft(inputValue);
    updateEditing(true);
  }, [disabled, inputValue, updateEditing]);

  const handleDisplayDoubleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    displayProps?.onDoubleClick?.(event);
    if (trigger === "doubleClick") {
      startEditing();
    }
  };

  const handleDisplayClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    displayProps?.onClick?.(event);
    if (trigger === "click") {
      startEditing();
    }
  };
  const { className: displayPropsClassName, ...restDisplayProps } = displayProps ?? {};
  const { className: inputPropsClassName, ...restInputProps } = inputProps ?? {};
  const mergedDisplayClassName = [displayPropsClassName, displayClassName].filter(Boolean).join(" ");
  const baseInputClassName = "transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
  const mergedInputClassName = [inputPropsClassName, inputClassName, baseInputClassName].filter(Boolean).join(" ");

  if (isEditing) {
    if (renderInput) {
      return (
        <span className={className}>
          {renderInput({
            value: draft,
            setValue: setDraft,
            inputRef,
            commit: () => commit("programmatic"),
            cancel: () => cancel("programmatic"),
            error,
          })}
        </span>
      );
    }
    return (
      <span className={className}>
        <input
          ref={inputRef}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && commitOnEnter) {
              event.preventDefault();
              commit("enter");
            }
            else if (event.key === "Escape") {
              event.preventDefault();
              cancel("escape");
            }
          }}
          onBlur={() => {
            if (commitOnBlur) {
              commit("blur");
            }
          }}
          className={mergedInputClassName}
          aria-invalid={!!error}
          {...restInputProps}
        />
      </span>
    );
  }

  const content = displayValue || placeholder || "";
  if (renderDisplay) {
    return (
      <span className={className}>
        {renderDisplay({
          displayValue: content,
          isEditing,
          startEditing,
        })}
      </span>
    );
  }

  return (
    <span className={className}>
      <span
        {...restDisplayProps}
        onDoubleClick={handleDisplayDoubleClick}
        onClick={handleDisplayClick}
        className={mergedDisplayClassName}
      >
        {content}
      </span>
    </span>
  );
}
