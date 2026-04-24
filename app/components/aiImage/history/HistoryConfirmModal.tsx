import type { ReactNode } from "react";
import { TrashSimpleIcon } from "@phosphor-icons/react";
import { useEffect } from "react";

import { SharpDownload, XMarkICon } from "@/icons";

function HistoryConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  icon,
  title,
  confirmLabel,
  cancelLabel = "No, keep it!",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  icon: ReactNode;
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
}) {
  useEffect(() => {
    if (!isOpen)
      return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape")
        onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen)
    return null;

  return (
    <dialog
      open={isOpen}
      className={`modal ${isOpen ? "modal-open" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box relative w-full max-w-[420px] overflow-hidden border border-base-300 bg-base-100 p-0 text-base-content shadow-xl">
        <div className="relative px-8 py-10 text-center">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-8 h-60 w-60 -translate-x-1/2 rounded-full border border-base-content/10" />
            <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full border border-base-content/5" />
            <div className="absolute -left-16 top-20 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-base-content/5 blur-3xl" />
          </div>

          <button
            type="button"
            className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full text-base-content/65 transition hover:bg-base-200 hover:text-base-content"
            aria-label="关闭确认弹窗"
            title="关闭确认弹窗"
            onClick={onClose}
          >
            <XMarkICon className="size-6" />
          </button>

          <div className="relative mx-auto flex size-32 items-center justify-center rounded-full border border-base-content/10 bg-base-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
            {icon}
          </div>

          <div className="relative mt-6 text-[18px] font-semibold leading-7 text-base-content">
            {title}
          </div>

          <button
            type="button"
            className="relative mt-8 w-full rounded-[10px] bg-[#f6f2b5] px-4 py-4 text-[16px] font-semibold text-[#10122f] transition hover:bg-[#fbf7c7]"
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </button>

          <button
            type="button"
            className="relative mt-4 text-[15px] font-medium text-base-content/65 transition hover:text-base-content"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>关闭</button>
      </form>
    </dialog>
  );
}

export function DeleteHistoryConfirmModal(props: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <HistoryConfirmModal
      {...props}
      icon={<TrashSimpleIcon className="size-14 text-primary" weight="regular" aria-hidden="true" />}
      title="删除这张图片？"
      confirmLabel="确认删除"
      cancelLabel="先保留"
    />
  );
}

export function DownloadHistoryConfirmModal(props: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <HistoryConfirmModal
      {...props}
      icon={<SharpDownload className="size-14 text-primary" aria-hidden="true" />}
      title="下载全部图片？"
      confirmLabel="开始下载"
      cancelLabel="暂不下载"
    />
  );
}

export function ClearHistoryConfirmModal(props: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <HistoryConfirmModal
      {...props}
      icon={<TrashSimpleIcon className="size-14 text-primary" weight="regular" aria-hidden="true" />}
      title="清空全部历史记录？"
      confirmLabel="确认清空"
      cancelLabel="先不清空"
    />
  );
}
