import type { ReactNode } from "react";

import { forwardRef } from "react";

import PortalTooltip from "@/components/common/portalTooltip";

import { Button, type ButtonProps } from "./Button";

/**
 * 统一图标按钮：强制无障碍标签（label → aria-label），可选悬浮提示。
 * 用于关闭、工具栏、分页等图标按钮，替代散写的 `btn-ghost btn-circle`。
 */
export type IconButtonProps = Omit<ButtonProps, "children"> & {
  /** 按钮内图标节点。 */
  icon: ReactNode;
  /** 必填：无障碍标签（aria-label）。 */
  label: string;
  /** 可选：鼠标悬浮提示文案（与 label 不同时可单独提供）。 */
  tooltip?: string;
  tooltipPlacement?: "right" | "left" | "top" | "bottom";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    label,
    tooltip,
    tooltipPlacement = "top",
    shape = "circle",
    variant = "ghost",
    ...rest
  },
  ref,
) {
  const button = (
    <Button ref={ref} aria-label={label} variant={variant} shape={shape} {...rest}>
      {icon}
    </Button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <PortalTooltip label={tooltip} placement={tooltipPlacement}>
      {button}
    </PortalTooltip>
  );
});
