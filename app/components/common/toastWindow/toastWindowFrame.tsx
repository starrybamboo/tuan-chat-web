import { AnimatePresence, motion } from "motion/react";
import React from "react";
import "@/components/common/scrollbar.css";

export interface ToastWindowFrameProps {
  isOpen: boolean;
  children: React.ReactNode;
  onClose: () => void;
  fullScreen?: boolean;
  transparent?: boolean;
  hiddenScrollbar?: boolean;
  disableScroll?: boolean;
  showCloseButton?: boolean;
  rootClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
}

export function ToastWindowFrame({
  isOpen,
  children,
  onClose,
  fullScreen = false,
  transparent = false,
  hiddenScrollbar = false,
  disableScroll = false,
  showCloseButton = true,
  rootClassName = "",
  panelClassName = "",
  bodyClassName = "",
}: ToastWindowFrameProps) {
  const supportsDynamicViewportUnit = typeof CSS !== "undefined" && CSS.supports("height: 100dvh");
  const fullScreenHeight = fullScreen
    ? (supportsDynamicViewportUnit ? "100dvh" : "100vh")
    : undefined;
  const modalMaxHeight = !fullScreen
    ? (supportsDynamicViewportUnit ? "min(90vh, 100dvh - 2rem)" : "min(90vh, calc(100vh - 2rem))")
    : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`
          modal modal-open
          ${rootClassName}
        `}>
          <motion.div
            className={`
              relative flex flex-col
              ${transparent ? "bg-transparent w-full h-screen" : `
                bg-base-100
                dark:bg-base-300
              `}
              ${fullScreen ? "w-full h-screen" : `
                modal-box w-auto max-w-[100vw]
                lg:max-w-[80vw] lg:h-auto lg:max-h-[90vh]
              `}
              ${panelClassName}
            `}
            style={{
              height: fullScreenHeight,
              maxHeight: modalMaxHeight,
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {showCloseButton && (
              <button
                type="button"
                className="
                  btn btn-sm btn-circle absolute right-2 top-2 bg-base-200
                  hover:bg-base-300
                  dark:bg-base-200
                  dark:hover:bg-base-100
                  z-20
                "
                onClick={onClose}
                aria-label="关闭弹窗"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            )}
            <div className={`
              ${disableScroll ? "overflow-hidden" : (hiddenScrollbar ? `
                hidden-scrollbar
              ` : `overflow-auto`)}
              w-full h-full min-h-0
              ${bodyClassName}
            `}>
              {children}
            </div>
          </motion.div>
          <button
            type="button"
            className={`
              modal-backdrop
              ${transparent ? `
                bg-black/20
                dark:bg-black/30
              ` : `
                bg-black/50
                dark:bg-black/70
              `}
            `}
            onClick={(fullScreen && !transparent) ? () => {} : onClose}
            aria-label="关闭弹窗"
          />
        </div>
      )}
    </AnimatePresence>
  );
}
