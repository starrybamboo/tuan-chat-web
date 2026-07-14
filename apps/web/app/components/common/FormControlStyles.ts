import type { AriaAttributes } from "react";

import type { InterfaceDensity } from "@/components/common/DesignLanguage";

export type FormControlSurface = "default" | "muted";
export type FormControlAppearance = "field" | "bare";

const CONTROL_DENSITY_CLASS: Record<InterfaceDensity, string> = {
  compact: "min-h-control-compact px-2.5 py-1.5 text-sm",
  default: "min-h-control-default px-3 py-2 text-sm",
};

const CONTROL_SURFACE_CLASS: Record<FormControlSurface, string> = {
  default: "bg-base-100",
  muted: "bg-base-200",
};

/** 生成文本输入类，统一尺寸、表面与交互状态；复合输入可直接复用该函数。 */
export function formControlClassName({
  density = "default",
  surface = "default",
  appearance = "field",
  invalid = false,
  className,
}: {
  density?: InterfaceDensity;
  surface?: FormControlSurface;
  appearance?: FormControlAppearance;
  invalid?: boolean;
  className?: string;
} = {}) {
  return [
    "w-full text-base-content transition-colors duration-150 placeholder:text-base-content/40 focus:outline-none",
    appearance === "field"
      ? "rounded-md border focus:ring-2"
      : "tc-form-control-bare border-0 bg-transparent focus:border-transparent focus:ring-0 focus:shadow-none focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:bg-base-200 disabled:text-base-content/40 disabled:opacity-70",
    "read-only:cursor-default read-only:bg-base-200 read-only:text-base-content/70",
    appearance === "field"
      ? invalid
        ? "border-error focus:border-error focus:ring-error/20"
        : "border-base-300 hover:border-base-content/30 focus:border-info focus:ring-info/20"
      : "",
    CONTROL_DENSITY_CLASS[density],
    appearance === "field" ? CONTROL_SURFACE_CLASS[surface] : "",
    className ?? "",
  ].filter(Boolean).join(" ");
}

/** 生成带前后缀复合输入的统一外壳状态。 */
export function formControlShellClassName({
  surface = "default",
  invalid = false,
  className,
}: {
  surface?: FormControlSurface;
  invalid?: boolean;
  className?: string;
} = {}) {
  return [
    "relative flex items-center rounded-md border transition-colors duration-150 focus-within:ring-1 focus-within:ring-inset",
    invalid
      ? "border-error focus-within:border-error focus-within:ring-error/20"
      : "border-base-300 hover:border-base-content/30 focus-within:border-info focus-within:ring-info/20",
    CONTROL_SURFACE_CLASS[surface],
    className ?? "",
  ].filter(Boolean).join(" ");
}

export function isFormControlInvalid(value: AriaAttributes["aria-invalid"]) {
  return value === true || value === "true" || value === "grammar" || value === "spelling";
}
