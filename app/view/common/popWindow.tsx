import React from "react";

export function PopWindow({ isOpen, children, onClose }: { isOpen: boolean; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box relative bg-base-100 dark:bg-base-300 w-max max-w-none h-max max-h-none">
        {/* 关闭按钮 */}
        <button
          type="button"
          className="btn btn-sm btn-circle absolute right-2 top-2 bg-base-200 hover:bg-base-300 dark:bg-base-200 dark:hover:bg-base-100"
          onClick={onClose}
        >
          ✕
        </button>
        {/* 卡片内容 */}
        <div className="card-body px-0 w-max">
          {children}
        </div>
      </div>

      {/* 背景遮罩 */}
      <div className="modal-backdrop bg-black/50 dark:bg-black/70" onClick={onClose}></div>
    </div>
  );
}
