import type { ButtonHTMLAttributes, ReactNode } from "react";

import { forwardRef } from "react";

/**
 * 统一按钮组件：在 daisyUI `btn` 之上的轻封装。
 * 新代码请使用本组件，替代散写的 `className="btn ..."`。
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "error"
  | "warning"
  | "info"
  | "neutral"
  | "outline";
export type ButtonSize = "xs" | "sm" | "md" | "lg";
export type ButtonShape = "default" | "square" | "circle";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-outline",
  ghost: "btn-ghost",
  error: "btn-error",
  warning: "btn-warning",
  info: "btn-info",
  neutral: "btn-neutral",
  outline: "btn-outline",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  xs: "btn-xs",
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

const SHAPE_CLASS: Record<ButtonShape, string> = {
  default: "",
  square: "btn-square",
  circle: "btn-circle",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
  /** 非加载态时展示的前置图标。 */
  icon?: ReactNode;
};

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
  const classes = [
    "btn",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    SHAPE_CLASS[shape],
    loading ? "pointer-events-none" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="loading loading-spinner loading-xs" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});
