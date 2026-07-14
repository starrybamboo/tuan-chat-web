import type { ChangeEvent, CSSProperties, ForwardedRef, KeyboardEvent, SelectHTMLAttributes } from "react";

import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { InterfaceDensity } from "@/components/common/DesignLanguage";
import type { FormControlAppearance, FormControlSurface } from "@/components/common/FormControlStyles";

import { formControlClassName, isFormControlInvalid } from "@/components/common/FormControlStyles";
import {
  findBoundaryOptionIndex,
  findRelativeOptionIndex,
  findTypeaheadOptionIndex,
  normalizeSelectOptions,
  normalizeSelectValue,
} from "@/components/common/SelectInputModel";

const POPOVER_GAP = 6;
const VIEWPORT_PADDING = 8;
const TYPEAHEAD_RESET_MS = 500;

type FloatingPosition = {
  left: number;
  top: number;
  width: number;
  placement: "top" | "bottom";
};

export type SelectInputProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size"> & {
  density?: InterfaceDensity;
  surface?: FormControlSurface;
  appearance?: FormControlAppearance;
  multiple?: false;
};

function assignForwardedRef(ref: ForwardedRef<HTMLSelectElement>, node: HTMLSelectElement | null) {
  if (typeof ref === "function") {
    ref(node);
  }
  else if (ref) {
    ref.current = node;
  }
}

/**
 * 统一浮层选择器：保留原生 select 的表单和 change 契约，交互层使用 Portal listbox。
 */
export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  {
    density = "default",
    surface = "default",
    appearance = "field",
    className,
    children,
    value,
    defaultValue,
    disabled = false,
    id,
    name,
    required,
    autoFocus,
    tabIndex,
    title,
    style,
    onChange,
    onInvalid,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...nativeProps
  },
  forwardedRef,
) {
  const options = useMemo(() => normalizeSelectOptions(children), [children]);
  const controlled = value !== undefined;
  const initialValue = normalizeSelectValue(defaultValue) || options.find(option => option.kind === "option")?.value || "";
  const [uncontrolledValue, setUncontrolledValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const nativeSelectRef = useRef<HTMLSelectElement | null>(null);
  const listboxRef = useRef<HTMLUListElement | null>(null);
  const typeaheadRef = useRef("");
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawSelectedValue = controlled ? normalizeSelectValue(value) : uncontrolledValue;
  const selectedOption = options.find(option => option.kind === "option" && option.value === rawSelectedValue);
  const selectedValue = controlled ? rawSelectedValue : selectedOption?.value ?? initialValue;
  const selectedIndex = options.findIndex(option => option.kind === "option" && option.value === selectedValue);

  const setNativeSelectRef = useCallback((node: HTMLSelectElement | null) => {
    nativeSelectRef.current = node;
    assignForwardedRef(forwardedRef, node);
  }, [forwardedRef]);

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const listbox = listboxRef.current;
    if (!trigger || !listbox) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const listboxRect = listbox.getBoundingClientRect();
    const width = Math.min(triggerRect.width, window.innerWidth - VIEWPORT_PADDING * 2);
    const roomBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_PADDING;
    const roomAbove = triggerRect.top - VIEWPORT_PADDING;
    const placement = roomBelow >= Math.min(listboxRect.height + POPOVER_GAP, 240) || roomBelow >= roomAbove
      ? "bottom"
      : "top";
    const preferredTop = placement === "bottom"
      ? triggerRect.bottom + POPOVER_GAP
      : triggerRect.top - listboxRect.height - POPOVER_GAP;
    const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
    const maxTop = Math.max(VIEWPORT_PADDING, window.innerHeight - listboxRect.height - VIEWPORT_PADDING);

    setPosition({
      left: Math.min(Math.max(VIEWPORT_PADDING, triggerRect.left), maxLeft),
      top: Math.min(Math.max(VIEWPORT_PADDING, preferredTop), maxTop),
      width,
      placement,
    });
  }, []);

  const openListbox = useCallback((preferredIndex = selectedIndex) => {
    const nextIndex = options[preferredIndex]?.kind === "option" && !options[preferredIndex]?.disabled
      ? preferredIndex
      : findBoundaryOptionIndex(options, "first");
    setActiveIndex(nextIndex);
    setPosition(null);
    setOpen(true);
  }, [options, selectedIndex]);

  const closeListbox = useCallback(() => {
    setOpen(false);
    typeaheadRef.current = "";
    if (typeaheadTimerRef.current) {
      clearTimeout(typeaheadTimerRef.current);
      typeaheadTimerRef.current = null;
    }
  }, []);

  const handleNativeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    if (!controlled) {
      setUncontrolledValue(event.currentTarget.value);
    }
    onChange?.(event);
  }, [controlled, onChange]);

  const chooseOption = useCallback((index: number) => {
    const option = options[index];
    if (!option || option.kind !== "option" || option.disabled) {
      return;
    }
    closeListbox();
    if (option.value === selectedValue) {
      return;
    }

    const nativeSelect = nativeSelectRef.current;
    if (!nativeSelect) {
      return;
    }
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    valueSetter?.call(nativeSelect, option.value);
    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }, [closeListbox, options, selectedValue]);

  const handleTypeahead = useCallback((key: string) => {
    typeaheadRef.current += key.toLocaleLowerCase();
    if (typeaheadTimerRef.current) {
      clearTimeout(typeaheadTimerRef.current);
    }
    typeaheadTimerRef.current = setTimeout(() => {
      typeaheadRef.current = "";
      typeaheadTimerRef.current = null;
    }, TYPEAHEAD_RESET_MS);
    const matchIndex = findTypeaheadOptionIndex(options, typeaheadRef.current, activeIndex);
    if (matchIndex >= 0) {
      setActiveIndex(matchIndex);
    }
  }, [activeIndex, options]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      closeListbox();
      return;
    }
    if (event.key === "Tab" && open) {
      closeListbox();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (open) {
        event.preventDefault();
        chooseOption(activeIndex);
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!open) {
        const boundary = direction === 1 ? "first" : "last";
        openListbox(selectedIndex >= 0 ? selectedIndex : findBoundaryOptionIndex(options, boundary));
      }
      else {
        setActiveIndex(findRelativeOptionIndex(options, activeIndex, direction));
      }
      return;
    }
    if ((event.key === "Home" || event.key === "End") && open) {
      event.preventDefault();
      setActiveIndex(findBoundaryOptionIndex(options, event.key === "Home" ? "first" : "last"));
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (!open) {
        openListbox();
      }
      handleTypeahead(event.key);
    }
  };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const frameId = window.requestAnimationFrame(computePosition);
    return () => window.cancelAnimationFrame(frameId);
  }, [computePosition, open, options.length]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || triggerRef.current?.contains(target) || listboxRef.current?.contains(target)) {
        return;
      }
      closeListbox();
    };
    const handleViewportChange = () => computePosition();
    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(handleViewportChange) : null;
    if (triggerRef.current) {
      resizeObserver?.observe(triggerRef.current);
    }
    if (listboxRef.current) {
      resizeObserver?.observe(listboxRef.current);
    }
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      resizeObserver?.disconnect();
    };
  }, [closeListbox, computePosition, open]);

  useEffect(() => () => {
    if (typeaheadTimerRef.current) {
      clearTimeout(typeaheadTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (autoFocus) {
      triggerRef.current?.focus();
    }
  }, [autoFocus]);

  const invalid = isFormControlInvalid(ariaInvalid);
  const activeOptionId = open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;
  const triggerId = id ? `${id}-trigger` : undefined;
  const listboxStyle: CSSProperties = {
    position: "fixed",
    left: position?.left ?? 0,
    top: position?.top ?? 0,
    width: position?.width,
    zIndex: 10000,
    visibility: position ? "visible" : "hidden",
    transformOrigin: position?.placement === "top" ? "bottom" : "top",
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={required || undefined}
        disabled={disabled}
        tabIndex={tabIndex}
        title={title}
        style={style}
        className={formControlClassName({
          density,
          surface,
          appearance,
          invalid,
          className: `inline-flex items-center justify-between gap-2 text-left max-md:min-h-hit-default ${className ?? ""}`,
        })}
        onBlur={(event) => {
          if (open && !listboxRef.current?.contains(event.relatedTarget as Node | null)) {
            closeListbox();
          }
        }}
        onClick={() => open ? closeListbox() : openListbox()}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label ?? "请选择"}</span>
        <CaretDownIcon
          className={`size-icon-compact shrink-0 text-base-content/45 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          weight="bold"
          aria-hidden="true"
        />
      </button>

      <select
        {...nativeProps}
        ref={setNativeSelectRef}
        id={id}
        name={name}
        value={selectedValue}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute size-px overflow-hidden opacity-0"
        onChange={handleNativeChange}
        onFocus={() => triggerRef.current?.focus()}
        onInvalid={(event) => {
          onInvalid?.(event);
          if (!event.defaultPrevented) {
            triggerRef.current?.focus();
          }
        }}
      >
        {children}
      </select>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence initial={false} onExitComplete={() => setPosition(null)}>
              {open
                ? (
                    <motion.ul
                      ref={listboxRef}
                      id={listboxId}
                      role="listbox"
                      aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : "选择选项")}
                      aria-labelledby={ariaLabelledBy}
                      data-dismissible-layer="true"
                      initial={{ opacity: 0, scale: 0.98, y: -4 }}
                      animate={position
                        ? { opacity: 1, scale: 1, y: 0 }
                        : { opacity: 0, scale: 0.98, y: -4 }}
                      exit={{ opacity: 0, scale: 0.98, y: -4 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.12, ease: "easeOut" }}
                      style={listboxStyle}
                      className="tc-surface-floating max-h-60 list-none overflow-y-auto overscroll-contain p-1"
                    >
                      {options.map((option, index) => {
                        if (option.kind === "group") {
                          return (
                            <li
                              key={option.key}
                              role="presentation"
                              className="mt-1 border-t border-base-300 px-2.5 pb-1 pt-2 text-xs font-medium text-base-content/45 first:mt-0 first:border-t-0 first:pt-1"
                            >
                              {option.label}
                            </li>
                          );
                        }
                        const selected = option.value === selectedValue;
                        const stateClassName = selected
                          ? `bg-info/10 text-info ${index === activeIndex ? "bg-info/15" : ""}`
                          : index === activeIndex ? "bg-base-200" : "";
                        return (
                            <li key={option.key} role="presentation">
                              <button
                                id={`${listboxId}-option-${index}`}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                aria-disabled={option.disabled || undefined}
                                disabled={option.disabled}
                                tabIndex={-1}
                                data-active={index === activeIndex ? "true" : undefined}
                                className={`flex min-h-hit-default w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-base-content transition-colors duration-100 hover:bg-base-200 focus:outline-none md:min-h-control-compact disabled:pointer-events-none disabled:opacity-45 ${stateClassName}`}
                                onPointerDown={event => event.preventDefault()}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => chooseOption(index)}
                              >
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                <CheckIcon
                                  className={`size-icon-compact shrink-0 ${selected ? "opacity-100" : "opacity-0"}`}
                                  weight="bold"
                                  aria-hidden="true"
                                />
                              </button>
                            </li>
                        );
                      })}
                    </motion.ul>
                  )
                : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
});
