import type { HTMLAttributes, ReactNode } from "react";

import { createElement, forwardRef } from "react";

export type InterfaceDensity = "compact" | "default";
/** 具有语义色表面的组件共同支持的四档强调强度。 */
export const SEMANTIC_APPEARANCES = ["solid", "soft", "outline", "ghost"] as const;
export type SemanticAppearance = typeof SEMANTIC_APPEARANCES[number];
export type SelectionLevel = "tone" | "soft" | "strong" | "solid";
export type SurfaceLevel = "canvas" | "content" | "floating" | "inset";
export type TextRole =
  | "pageTitle"
  | "sectionTitle"
  | "componentTitle"
  | "body"
  | "label"
  | "supporting"
  | "data"
  | "code";
export type TextWrap = "default" | "balance" | "pretty" | "truncate" | "line2";

const SURFACE_CLASS: Record<SurfaceLevel, string> = {
  canvas: "tc-surface-canvas",
  content: "tc-surface-content",
  floating: "tc-surface-floating",
  inset: "tc-surface-inset",
};

const TEXT_ROLE_CLASS: Record<TextRole, string> = {
  pageTitle: "text-page-title font-semibold text-base-content",
  sectionTitle: "text-section-title font-semibold text-base-content",
  componentTitle: "text-component-title font-medium text-base-content",
  body: "text-body font-normal text-base-content",
  label: "text-body font-medium text-base-content",
  supporting: "text-supporting font-normal text-base-content/60",
  data: "text-supporting font-medium tabular-nums text-base-content/70",
  code: "font-mono text-supporting font-normal text-base-content/80",
};

const TEXT_WRAP_CLASS: Record<TextWrap, string> = {
  default: "",
  balance: "text-balance",
  pretty: "text-pretty",
  truncate: "truncate",
  line2: "line-clamp-2",
};

const SELECTION_CLASS: Record<SelectionLevel, string> = {
  tone: "text-info",
  soft: "bg-info/10 text-info",
  strong: "bg-info/15 text-base-content ring-1 ring-inset ring-info/70 dark:bg-info/20",
  solid: "bg-info text-info-content",
};

export type MaskShape = "squircle";

const MASK_SHAPE_CLASS: Record<MaskShape, string> = {
  squircle: "mask mask-squircle",
};

/** 统一头像和缩略图的裁切形状，底层 Mask class 只在设计语言层维护。 */
export function maskClassName({
  shape = "squircle",
  className,
}: {
  shape?: MaskShape;
  className?: string;
} = {}) {
  return [MASK_SHAPE_CLASS[shape], className ?? ""].filter(Boolean).join(" ");
}

/** 生成三层表面与嵌套面的统一样式。 */
export function surfaceClassName({
  level = "content",
  className,
}: {
  level?: SurfaceLevel;
  className?: string;
} = {}) {
  return [SURFACE_CLASS[level], className ?? ""].filter(Boolean).join(" ");
}

/** 生成固定文字角色、长文本和截断规则。 */
export function textClassName({
  variant = "body",
  wrap = "default",
  className,
}: {
  variant?: TextRole;
  wrap?: TextWrap;
  className?: string;
} = {}) {
  return [TEXT_ROLE_CLASS[variant], TEXT_WRAP_CLASS[wrap], className ?? ""].filter(Boolean).join(" ");
}

/** 生成统一交互状态与紧凑／默认触控热区。 */
export function interactiveClassName({
  density = "default",
  className,
}: {
  density?: InterfaceDensity;
  className?: string;
} = {}) {
  return [
    "tc-interactive",
    density === "compact" ? "min-h-hit-compact min-w-hit-compact" : "min-h-hit-default min-w-hit-default",
    className ?? "",
  ].filter(Boolean).join(" ");
}

/** 生成从颜色提示到实心确认的统一选中强度。 */
export function selectionClassName({
  level = "soft",
  className,
}: {
  level?: SelectionLevel;
  className?: string;
} = {}) {
  return [SELECTION_CLASS[level], className ?? ""].filter(Boolean).join(" ");
}

/** 统一正文内链接的颜色、悬浮下划线与键盘焦点。 */
export function textLinkClassName(className?: string) {
  return [
    "rounded-sm text-info underline-offset-4 transition-colors duration-150 hover:underline",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/20",
    className ?? "",
  ].filter(Boolean).join(" ");
}

export type SurfaceProps = {
  as?: "div" | "section" | "article" | "aside";
  level?: SurfaceLevel;
  children: ReactNode;
  className?: string;
};

/** 统一画布、内容、悬浮和嵌套表面的边框、圆角与阴影。 */
export function Surface({
  as = "div",
  level = "content",
  children,
  className,
}: SurfaceProps) {
  return createElement(as, { className: surfaceClassName({ level, className }) }, children);
}

export type TextProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div" | "label" | "code";
  variant?: TextRole;
  wrap?: TextWrap;
  children: ReactNode;
};

/** 统一标题、正文、标签、辅助信息、数字与代码的固定文字档位。 */
export const Text = forwardRef<HTMLElement, TextProps>(function Text({
  as = "span",
  variant = "body",
  wrap = "default",
  children,
  className,
  ...rest
}, ref) {
  return createElement(as, { ...rest, ref, className: textClassName({ variant, wrap, className }) }, children);
});
