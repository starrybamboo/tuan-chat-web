import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

import { useEscapeToClose } from "@/components/common/customHooks/useEscapeToClose";

/**
 * 统一模态弹窗：基于原生 <dialog> + showModal()。
 * 原生提供 focus trap、ESC 关闭、背景滚动锁定；::backdrop 作遮罩。
 * 新代码请使用本组件，替代各自实现的 overlay/动画/scroll-lock。
 */
export type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: ModalSize;
  /** 点击遮罩是否关闭，默认 true。 */
  closeOnOverlayClick?: boolean;
  /** 无障碍标签；若内容含可见标题，也可由调用方设 ariaLabel。 */
  ariaLabel?: string;
  /** 追加到 modal-box 的额外类名（自定义宽高/内边距等）。 */
  className?: string;
  children: ReactNode;
};

export function Modal({
  open,
  onOpenChange,
  size = "md",
  closeOnOverlayClick = true,
  ariaLabel,
  className,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const shouldReduceMotion = useReducedMotion();
  const accessibleLabel = ariaLabel?.trim() || "弹窗";

  useEscapeToClose({
    enabled: open,
    onClose: () => onOpenChange(false),
    containerRef: ref,
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      try {
        dialog.showModal();
      }
      catch {
        /* 可能已在打开中，忽略 */
      }
    }
    else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // 原生 ESC 关闭会触发 close 事件，同步回外部状态。
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    const handleClose = () => {
      if (open) {
        onOpenChange(false);
      }
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onOpenChange, open]);

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (!closeOnOverlayClick) {
      return;
    }
    // 点击的是 dialog 自身（modal-box 外的遮罩区域）才关闭。
    if (event.target === ref.current) {
      onOpenChange(false);
    }
  };

  return (
    <dialog
      ref={ref}
      data-modal-layer={open ? "true" : undefined}
      className="modal"
      aria-modal="true"
      aria-label={accessibleLabel}
      onClick={handleBackdropClick}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            key={titleId}
            role="document"
            className={`modal-box ${SIZE_CLASS[size]} ${className ?? ""}`}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={event => event.stopPropagation()}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
      {/* 点击遮罩关闭（modal-backdrop 作为可点击区域，form method=dialog 触发 close） */}
      {closeOnOverlayClick && (
        <form method="dialog" className="modal-backdrop">
          <button type="submit" aria-label="关闭弹窗">close</button>
        </form>
      )}
    </dialog>
  );
}
