import type { KeyboardEvent, ReactNode } from "react";

import { useId } from "react";

import type { InterfaceDensity } from "@/components/common/DesignLanguage";

import { selectionClassName } from "@/components/common/DesignLanguage";

const selectedTabClassName = selectionClassName({
  level: "strong",
  className: "hover:bg-info/20",
});

export type TabOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  controls?: string;
};

/** 根据方向键、Home 与 End 计算下一个可用页签。 */
export function resolveNextTabValue<Value extends string>({
  options,
  currentValue,
  key,
}: {
  options: readonly TabOption<Value>[];
  currentValue: Value;
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End";
}) {
  const enabledOptions = options.filter(option => !option.disabled);
  if (enabledOptions.length === 0) {
    return currentValue;
  }
  if (key === "Home") {
    return enabledOptions[0].value;
  }
  if (key === "End") {
    return enabledOptions.at(-1)?.value ?? currentValue;
  }

  const currentIndex = Math.max(0, enabledOptions.findIndex(option => option.value === currentValue));
  const direction = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  const nextIndex = (currentIndex + direction + enabledOptions.length) % enabledOptions.length;
  return enabledOptions[nextIndex].value;
}

export type TabsProps<Value extends string> = {
  value: Value;
  options: readonly TabOption<Value>[];
  onValueChange: (value: Value) => void;
  ariaLabel: string;
  density?: InterfaceDensity;
  className?: string;
  tabClassName?: string;
};

/** 统一页签的选中态、两档密度、ARIA 与方向键行为。 */
export function Tabs<Value extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  density = "compact",
  className = "",
  tabClassName = "",
}: TabsProps<Value>) {
  const idPrefix = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const nextValue = resolveNextTabValue({
      options,
      currentValue: value,
      key: event.key as "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End",
    });
    onValueChange(nextValue);
    document.getElementById(`${idPrefix}-${nextValue}`)?.focus();
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={`tc-tab-list ${className}`}>
      {options.map(option => (
        <button
          key={option.value}
          id={`${idPrefix}-${option.value}`}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          aria-controls={option.controls}
          tabIndex={value === option.value ? 0 : -1}
          disabled={option.disabled}
          className={`
            tc-tab
            ${density === "default" ? "min-h-control-default px-4" : ""}
            ${value === option.value ? selectedTabClassName : ""}
            ${tabClassName}
          `}
          onClick={() => onValueChange(option.value)}
          onKeyDown={handleKeyDown}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
