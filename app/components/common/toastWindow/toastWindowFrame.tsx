import React from "react";

export interface ToastWindowFrameProps {
  isOpen: boolean;
  children: React.ReactNode;
  onClose: () => void;
  fullScreen?: boolean;
  transparent?: boolean;
  hiddenScrollbar?: boolean;
}

export function ToastWindowFrame({
  isOpen,
  children,
  onClose,
  fullScreen = false,
  transparent = false,
  hiddenScrollbar = false,
}: ToastWindowFrameProps) {
  const supportsDynamicViewportUnit = typeof CSS !== "undefined" && CSS.supports("height: 100dvh");
  const fullScreenHeight = fullScreen
    ? (supportsDynamicViewportUnit ? "100dvh" : "100vh")
    : undefined;
  const modalMaxHeight = !fullScreen
    ? (supportsDynamicViewportUnit ? "min(90vh, 100dvh - 2rem)" : "min(90vh, calc(100vh - 2rem))")
    : undefined;

  return (
    <div className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div
        className={`relative flex flex-col
               ${transparent ? "bg-transparent w-full h-screen" : "bg-base-100 dark:bg-base-300"}
               ${fullScreen ? "w-full h-screen" : "modal-box w-auto max-w-[100vw] lg:max-w-[80vw] lg:h-auto lg:max-h-[90vh]"}`}
        style={{
          height: fullScreenHeight,
          maxHeight: modalMaxHeight,
        }}
      >
        <button
          type="button"
          className="btn btn-sm btn-circle absolute right-2 top-2 bg-base-200 hover:bg-base-300 dark:bg-base-200 dark:hover:bg-base-100 z-20"
          onClick={onClose}
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
        <div className={`${hiddenScrollbar ? "hidden-scrollbar" : "overflow-auto"} w-full h-full min-h-0`}>
          {children}
        </div>
      </div>
      <div
        className={`modal-backdrop ${transparent ? "bg-black/20 dark:bg-black/30" : "bg-black/50 dark:bg-black/70"}`}
        onClick={(fullScreen && !transparent) ? () => {} : onClose}
      >
      </div>
    </div>
  );
}
