import { Mounter } from "@/components/common/mounter";
import React from "react";

export function PopWindow({ isOpen, children, onClose, fullScreen }: {
  isOpen: boolean;
  children: React.ReactNode;
  onClose: () => void;
  fullScreen?: boolean; // 开启后会变成全屏，并且只能靠右上角的关闭按钮关闭
}) {
  if (!isOpen) {
    return null;
  }
  return (
    <Mounter targetId="modal-root">
      <div className={`modal ${isOpen ? "modal-open" : ""}`}>
        <div className={`relative bg-base-100 dark:bg-base-300 overflow-auto
          ${fullScreen ? "w-screen h-screen" : "modal-box w-auto max-w-[90vw] lg:max-w-[80vw] h-auto max-h-[90vh]"}`}
        >
          {/* 关闭按钮 */}
          <button
            type="button"
            className="btn btn-sm btn-circle absolute right-2 top-2 bg-base-200 hover:bg-base-300 dark:bg-base-200 dark:hover:bg-base-100 z-20"
            onClick={onClose}
          >
            ✕
          </button>
          {/* 卡片内容 */}
          <div className="card-body p-4 w-full h-full">
            {children}
          </div>
        </div>

        {/* 背景遮罩 */}
        <div className="modal-backdrop bg-black/50 dark:bg-black/70" onClick={fullScreen ? () => {} : onClose}></div>
      </div>
    </Mounter>
  );
}
