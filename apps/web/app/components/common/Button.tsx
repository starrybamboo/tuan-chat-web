import type { ButtonHTMLAttributes, ReactNode } from "react";

import { forwardRef } from "react";

import { SEMANTIC_APPEARANCES, type SemanticAppearance } from "@/components/common/DesignLanguage";
import { LoadingIndicator } from "@/components/common/StatusPrimitives";

/**
 * 统一按钮组件：颜色、密度、形状与交互状态全部由项目 `tc-button` 设计语言维护。
 * 新代码请使用本组件，避免在业务组件中散写按钮视觉样式。
 */
export type ButtonVariant =
  | "primary"
  | "ghost"
  | "error"
  | "warning"
  | "success"
  | "outline"
  | "errorOutline";
/** 公共按钮支持的完整颜色语义清单。 */
export const BUTTON_TONES = ["neutral", "primary", "success", "warning", "error"] as const;
export type ButtonTone = typeof BUTTON_TONES[number];
/** 公共按钮支持的完整外观清单。 */
export const BUTTON_APPEARANCES = SEMANTIC_APPEARANCES;
export type ButtonAppearance = SemanticAppearance;
export type ButtonSize = "xs" | "sm" | "md" | "lg";
export type ButtonShape = "default" | "square" | "circle";

const VARIANT_STYLE: Record<ButtonVariant, { tone: ButtonTone; appearance: ButtonAppearance }> = {
  primary: { tone: "primary", appearance: "solid" },
  ghost: { tone: "neutral", appearance: "ghost" },
  error: { tone: "error", appearance: "solid" },
  warning: { tone: "warning", appearance: "solid" },
  success: { tone: "success", appearance: "solid" },
  outline: { tone: "neutral", appearance: "outline" },
  errorOutline: { tone: "error", appearance: "outline" },
};

const TONE_CLASS: Record<ButtonTone, string> = {
  neutral: "tc-button-tone-neutral",
  primary: "tc-button-tone-primary",
  success: "tc-button-tone-success",
  warning: "tc-button-tone-warning",
  error: "tc-button-tone-error",
};

const APPEARANCE_CLASS: Record<ButtonAppearance, string> = {
  solid: "tc-button-solid",
  soft: "tc-button-soft",
  outline: "tc-button-outline",
  ghost: "tc-button-ghost",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  xs: "tc-button-compact",
  sm: "tc-button-compact",
  md: "tc-button-default",
  lg: "tc-button-default",
};

const SHAPE_CLASS: Record<ButtonShape, string> = {
  default: "",
  square: "tc-button-square",
  circle: "tc-button-circle",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 旧版组合写法；新代码优先分别传入 tone 与 appearance。 */
  variant?: ButtonVariant;
  /** 按钮的颜色语义。 */
  tone?: ButtonTone;
  /** 按钮的填充形式。 */
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
  /** 非加载态时展示的前置图标。 */
  icon?: ReactNode;
};

export function buttonClassName({
  variant,
  tone,
  appearance,
  size = "md",
  shape = "default",
  loading = false,
  className,
}: {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
  className?: string;
}) {
  const legacyStyle = variant ? VARIANT_STYLE[variant] : undefined;
  const resolvedTone = tone ?? legacyStyle?.tone ?? "neutral";
  const resolvedAppearance = appearance ?? legacyStyle?.appearance ?? (tone ? "solid" : "ghost");

  return [
    "tc-button",
    TONE_CLASS[resolvedTone],
    APPEARANCE_CLASS[resolvedAppearance],
    SIZE_CLASS[size],
    SHAPE_CLASS[shape],
    loading ? "pointer-events-none" : "",
    className ?? "",
  ].filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    tone,
    appearance,
    size = "md",
    shape = "default",
    loading = false,
    icon,
    className,
    disabled,
    children,
    ...rest
  },
  ref,
) {
  const classes = buttonClassName({ variant, tone, appearance, size, shape, loading, className });

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoadingIndicator size="compact" label="正在处理" /> : icon}
      {children}
    </button>
  );
});
