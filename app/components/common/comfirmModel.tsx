import React from "react";
import { PopWindow } from "./popWindow";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  confirmText = "确认",
  cancelText = "取消",
  variant = "danger",
}) => {
  const getButtonClass = () => {
    switch (variant) {
      case "warning":
        return "btn-warning";
      case "info":
        return "btn-primary";
      case "danger":
      default:
        return "btn-error";
    }
  };

  return (
    <PopWindow isOpen={isOpen} onClose={onClose}>
      <div className="rounded-xl shadow-xl p-6 max-w-md mx-4 border border-base-300">
        {/* 图标区域 */}
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full ${variant === "danger" ? "bg-error/20" : variant === "warning" ? "bg-warning/20" : "bg-primary/20"}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 ${variant === "danger" ? "text-error" : variant === "warning" ? "text-warning" : "text-primary"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* 标题和内容 */}
        <h2 className="text-xl font-bold text-center mb-3">{title}</h2>
        <p className="text-base-content/80 text-center mb-6 leading-relaxed">{message}</p>

        {/* 按钮区域 */}
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            className="btn btn-outline btn-sm flex-1 transition-all duration-200 hover:scale-[1.02]"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-1 transition-all duration-200 hover:scale-[1.02] ${getButtonClass()}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </PopWindow>
  );
};

export default ConfirmModal;
