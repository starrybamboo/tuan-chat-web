import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, type HTMLAttributes, type MouseEvent, type ReactNode } from "react";

import { useEscapeToClose } from "@/components/common/customHooks/useEscapeToClose";
import { surfaceClassName } from "@/components/common/DesignLanguage";

export type DialogFrameMode = "native" | "inline";

export type DialogFrameProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  mode?: DialogFrameMode;
  ariaLabel?: string;
  rootClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
  panelStyle?: React.CSSProperties;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  closeButtonLabel?: string;
};

/** 统一弹窗操作区的排列、间距和可选边界。 */
export function DialogActions({
  bordered = false,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { bordered?: boolean }) {
  return (
    <div
      className={`flex items-center justify-end gap-2 ${bordered ? "border-t border-base-300" : ""} ${className}`}
      {...rest}
    />
  );
}

function renderDialogBody(children: ReactNode, bodyClassName?: string) {
  if (!bodyClassName) {
    return children;
  }
  return <div className={bodyClassName}>{children}</div>;
}

/** 生成弹窗根层类名，默认弹窗统一使用视口居中层。 */
export function dialogLayerClassName(mode: DialogFrameMode, rootClassName = "") {
  const hasCustomLayerPosition = /(?:^|\s)(?:absolute|fixed|sticky)(?:\s|$)/.test(rootClassName);

  return [
    "modal",
    mode === "inline" ? "modal-open" : "",
    hasCustomLayerPosition ? "" : "tc-dialog-layer",
    rootClassName,
  ].filter(Boolean).join(" ");
}

/**
 * 统一弹窗外壳：集中处理遮罩、Esc、aria 与动效。
 * `native` 保留原生 dialog 能力，`inline` 适配 Portal/历史 daisyUI 弹窗。
 */
export function DialogFrame({
  open,
  onClose,
  children,
  mode = "inline",
  ariaLabel = "弹窗",
  rootClassName = "",
  panelClassName = "",
  bodyClassName,
  panelStyle,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  closeButtonLabel = "关闭弹窗",
}: DialogFrameProps) {
  const layerRef = useRef<HTMLElement | null>(null);
  const nativeDialogRef = useRef<HTMLDialogElement | null>(null);
  const motionKey = useId();
  const shouldReduceMotion = useReducedMotion();

  const setNativeDialogRef = (node: HTMLDialogElement | null) => {
    nativeDialogRef.current = node;
    layerRef.current = node;
  };
  const setInlineLayerRef = (node: HTMLDivElement | null) => {
    layerRef.current = node;
  };

  useEscapeToClose({
    enabled: open && closeOnEscape,
    onClose,
    containerRef: layerRef,
  });

  useEffect(() => {
    if (mode !== "native") {
      return;
    }
    const dialog = nativeDialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      try {
        dialog.showModal();
      }
      catch {
        // 部分浏览器在快速切换时可能已处于打开流程，忽略即可。
      }
    }
    else if (!open && dialog.open) {
      dialog.close();
    }
  }, [mode, open]);

  useEffect(() => {
    if (mode !== "native") {
      return;
    }
    const dialog = nativeDialogRef.current;
    if (!dialog) {
      return;
    }
    const handleClose = () => {
      if (open) {
        onClose();
      }
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [mode, onClose, open]);

  const handleNativeBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (closeOnOverlayClick && event.target === nativeDialogRef.current) {
      onClose();
    }
  };

  const panel = (
    <motion.div
      key={motionKey}
      role="document"
      className={surfaceClassName({
        level: "floating",
        className: `relative max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto p-6 ${panelClassName}`,
      })}
      style={panelStyle}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={event => event.stopPropagation()}
    >
      {renderDialogBody(children, bodyClassName)}
    </motion.div>
  );

  const layerClassName = dialogLayerClassName(mode, rootClassName);

  if (mode === "native") {
    return (
      <dialog
        ref={setNativeDialogRef}
        data-modal-layer={open ? "true" : undefined}
        className={layerClassName}
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={handleNativeBackdropClick}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <AnimatePresence>
          {open && panel}
        </AnimatePresence>
        {closeOnOverlayClick && (
          <form method="dialog" className="modal-backdrop">
            <button type="submit" aria-label={closeButtonLabel}>close</button>
          </form>
        )}
      </dialog>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          ref={setInlineLayerRef}
          data-modal-layer="true"
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className={layerClassName}
        >
          {panel}
          {closeOnOverlayClick && (
            <button
              type="button"
              className="modal-backdrop"
              onClick={onClose}
              aria-label={closeButtonLabel}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
