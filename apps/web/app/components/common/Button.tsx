import type { ButtonHTMLAttributes, ReactNode } from "react";

import { forwardRef } from "react";

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
export type ButtonSize = "xs" | "sm" | "md" | "lg";
export type ButtonShape = "default" | "square" | "circle";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "tc-button-primary",
  ghost: "tc-button-ghost",
  error: "tc-button-error",
  warning: "tc-button-warning",
  success: "tc-button-success",
  outline: "tc-button-outline",
  errorOutline: "tc-button-error-outline",
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
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
  /** 非加载态时展示的前置图标。 */
  icon?: ReactNode;
};

export function buttonClassName({
  variant = "ghost",
  size = "md",
  shape = "default",
  loading = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
  className?: string;
}) {
  return [
    "tc-button",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    SHAPE_CLASS[shape],
    loading ? "pointer-events-none" : "",
    className ?? "",
  ].filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "ghost",
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
  const classes = buttonClassName({ variant, size, shape, loading, className });

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
