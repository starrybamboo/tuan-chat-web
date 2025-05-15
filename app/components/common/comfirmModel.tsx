import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, title, message, onConfirm }) => {
  if (!isOpen)
    return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      >
      </div>

      {/* 原有内容容器 */}
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="bg-base-100 p-8 rounded-lg shadow-lg z-10 animate-fade-in-top duration-300">
          <h2 className="text-lg font-bold mb-4">{title}</h2>
          <p className="mb-6">{message}</p>
          <div className="flex justify-between">
            <button
              type="button"
              className="btn btn-secondary btn-sm mr-2 flex-1"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-error btn-sm flex-1"
              onClick={onConfirm}
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
