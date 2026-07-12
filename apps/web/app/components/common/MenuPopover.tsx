import type { ButtonHTMLAttributes, HTMLAttributes, ReactElement, ReactNode } from "react";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cloneElement, createElement, forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useDismissibleLayer } from "@/components/common/customHooks/useDismissibleLayer";

export type PopoverSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  closeOnEscape?: boolean;
  closeOnOutsidePointerDown?: boolean;
};

/** 统一轻浮层的表面、Esc 与外部点击关闭行为。 */
export function PopoverSurface({
  open,
  onClose,
  children,
  closeOnEscape = true,
  closeOnOutsidePointerDown = true,
  className = "",
  ...rest
}: PopoverSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useDismissibleLayer({
    enabled: open,
    containerRef,
    onDismiss: onClose,
    closeOnEscape,
    closeOnOutsidePointerDown,
  });

  if (!open) {
    return null;
  }

  return (
    <div
      {...rest}
      ref={containerRef}
      data-dismissible-layer="true"
      className={`tc-surface-floating ${className}`}
    >
      {children}
    </div>
  );
}

/** 统一菜单表面及其可访问角色。 */
export const MenuSurface = forwardRef<HTMLElement, {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  as?: "div" | "ul";
} & HTMLAttributes<HTMLElement>>(function MenuSurface({
  children,
  ariaLabel,
  className = "",
  as = "div",
  ...rest
}, ref) {
  return createElement(as, { ...rest, ref, role: "menu", "aria-label": ariaLabel, className: `tc-menu ${className}` }, children);
});

const MENU_VIEWPORT_PADDING = 8;
const MENU_ANCHOR_GAP = 8;
type MenuPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export type DropdownMenuProps = {
  trigger: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
  children: ReactNode;
  ariaLabel: string;
  placement?: MenuPlacement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  menuClassName?: string;
  /** 让 Portal 菜单保持与触发区域同宽。 */
  matchTriggerWidth?: boolean;
};

/** 统一菜单触发、外部点击、Esc、aria-expanded 与定位。 */
export function DropdownMenu({
  trigger,
  children,
  ariaLabel,
  placement = "bottom-start",
  open,
  onOpenChange,
  className = "",
  menuClassName = "",
  matchTriggerWidth = false,
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number; width?: number } | null>(null);
  const resolvedOpen = open ?? uncontrolledOpen;
  const setOpen = useCallback((nextOpen: boolean) => {
    if (open == null) {
      setUncontrolledOpen(nextOpen);
    }
    if (nextOpen) {
      setMenuPosition(null);
    }
    onOpenChange?.(nextOpen);
  }, [onOpenChange, open]);

  // Portal 脱离祖先 overflow 后，按触发区与视口边界重新计算固定坐标。
  const computeMenuPosition = useCallback(() => {
    const anchor = containerRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) {
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const menuWidth = matchTriggerWidth ? anchorRect.width : menuRect.width;
    const placeAtBottom = placement.startsWith("bottom");
    const alignToEnd = placement.endsWith("end");
    let left = alignToEnd ? anchorRect.right - menuWidth : anchorRect.left;
    let top = placeAtBottom
      ? anchorRect.bottom + MENU_ANCHOR_GAP
      : anchorRect.top - menuRect.height - MENU_ANCHOR_GAP;

    if (placeAtBottom && top + menuRect.height > window.innerHeight - MENU_VIEWPORT_PADDING) {
      top = anchorRect.top - menuRect.height - MENU_ANCHOR_GAP;
    }
    else if (!placeAtBottom && top < MENU_VIEWPORT_PADDING) {
      top = anchorRect.bottom + MENU_ANCHOR_GAP;
    }

    const maxLeft = Math.max(MENU_VIEWPORT_PADDING, window.innerWidth - menuWidth - MENU_VIEWPORT_PADDING);
    const maxTop = Math.max(MENU_VIEWPORT_PADDING, window.innerHeight - menuRect.height - MENU_VIEWPORT_PADDING);
    setMenuPosition({
      left: Math.min(Math.max(MENU_VIEWPORT_PADDING, left), maxLeft),
      top: Math.min(Math.max(MENU_VIEWPORT_PADDING, top), maxTop),
      width: matchTriggerWidth ? menuWidth : undefined,
    });
  }, [matchTriggerWidth, placement]);

  useLayoutEffect(() => {
    if (!resolvedOpen) {
      return;
    }
    const frameId = window.requestAnimationFrame(computeMenuPosition);
    return () => window.cancelAnimationFrame(frameId);
  }, [computeMenuPosition, resolvedOpen]);

  useEffect(() => {
    if (!resolvedOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const handleViewportChange = () => computeMenuPosition();

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(handleViewportChange)
      : null;
    if (menuRef.current) {
      resizeObserver?.observe(menuRef.current);
    }
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      resizeObserver?.disconnect();
    };
  }, [computeMenuPosition, resolvedOpen, setOpen]);

  const triggerNode = cloneElement(trigger, {
    "aria-haspopup": "menu",
    "aria-expanded": resolvedOpen,
    "aria-controls": menuId,
    onClick: (event) => {
      trigger.props.onClick?.(event);
      if (!event.defaultPrevented) {
        setOpen(!resolvedOpen);
      }
    },
  });
  const menuEnterOffset = placement.startsWith("top") ? 6 : -6;

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      {triggerNode}
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence initial={false} onExitComplete={() => setMenuPosition(null)}>
              {resolvedOpen && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, scale: 0.98, y: menuEnterOffset }}
                  animate={menuPosition
                    ? { opacity: 1, scale: 1, y: 0 }
                    : { opacity: 0, scale: 0.98, y: menuEnterOffset }}
                  exit={{ opacity: 0, scale: 0.98, y: menuEnterOffset }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.14, ease: "easeOut" }}
                  style={{
                    position: "fixed",
                    left: menuPosition?.left ?? 0,
                    top: menuPosition?.top ?? 0,
                    width: menuPosition?.width,
                    zIndex: 10000,
                    visibility: menuPosition ? "visible" : "hidden",
                    transformOrigin: placement.startsWith("top") ? "bottom" : "top",
                  }}
                >
                  <MenuSurface
                    id={menuId}
                    as="ul"
                    ariaLabel={ariaLabel}
                    className={`max-w-[calc(100vw-1rem)] ${menuClassName}`}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("button, a, [role='menuitem']")) {
                        setOpen(false);
                      }
                    }}
                  >
                    {children}
                  </MenuSurface>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )
        : resolvedOpen
          ? (
              <MenuSurface id={menuId} as="ul" ariaLabel={ariaLabel} className={menuClassName}>
                {children}
              </MenuSurface>
            )
          : null}
    </div>
  );
}

export type MenuItemProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "danger";
  selected?: boolean;
};

/** 统一菜单项的热区、选中、危险、焦点和禁用状态。 */
export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  {
    children,
    icon,
    tone = "default",
    selected = false,
    className = "",
    ...rest
  },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="menuitem"
      data-selected={selected ? "true" : undefined}
      className={`tc-menu-item ${tone === "danger" ? "text-error hover:bg-error/10" : ""} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
});
