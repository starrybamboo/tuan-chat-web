import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useEscapeToClose } from "@/components/common/customHooks/useEscapeToClose";

type TutorialUpdatePromptModalProps = {
  open: boolean;
  mode: "missing" | "update" | null;
  latestCommitId?: number | null;
  currentCommitId?: number | null;
  isPulling: boolean;
  onClose: (suppressUntilUpdate?: boolean) => void;
  onConfirmPull: () => void;
}

export default function TutorialUpdatePromptModal({
  open,
  mode,
  latestCommitId,
  currentCommitId,
  isPulling,
  onClose,
  onConfirmPull,
}: TutorialUpdatePromptModalProps) {
  const [suppress, setSuppress] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => setSuppress(false));
    }
  }, [open]);

  const handleClose = () => {
    onClose(suppress);
  };

  useEscapeToClose({
    enabled: open,
    onClose: handleClose,
    containerRef: dialogRef,
  });

  if (!open) {
    return null;
  }
  if (typeof document === "undefined") {
    return null;
  }

  const isMissingMode = mode === "missing";
  const title = isMissingMode ? "还没有新手教程" : "新手教程有更新";
  const description = isMissingMode
    ? "检测到你当前还没有新手教程空间，是否现在克隆一份？"
    : "检测到新手教程已更新，是否拉取最新版本？拉取后会新建一份教程空间，并删除你当前的旧教程空间。";
  const confirmText = isMissingMode ? "立即克隆" : "立即拉取";

  return createPortal(
    <div className="
      fixed inset-0 z-10000 flex items-center justify-center bg-black/35 p-4
    ">
      <div className="
        w-full max-w-lg rounded-xl border border-base-300 bg-base-100 p-5
      shadow-xl
      "
        ref={dialogRef}
        data-modal-layer="true"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-2 text-sm/relaxed text-base-content/70">
          {description}
        </div>
        {!isMissingMode && (
          <div className="mt-3 rounded-lg bg-base-200 px-3 py-2 text-sm">
            <div>{`当前提交：${currentCommitId ?? "未知"}`}</div>
            <div className="mt-1">{`最新提交：${latestCommitId ?? "未知"}`}</div>
          </div>
        )}
        <div className="
          mt-5 flex flex-col-reverse justify-between gap-4
          sm:flex-row sm:items-center
        ">
          <label className="
            flex cursor-pointer items-center gap-2 text-xs text-base-content/70
            select-none
            hover:text-base-content/90
            transition-colors
          ">
            <input
              type="checkbox"
              className="
                checkbox checkbox-xs rounded-sm border-base-content/30
                checked:border-info
                [--chkbg:var(--color-info)]
                [--chkfg:var(--color-info-content)]
              "
              checked={suppress}
              onChange={e => setSuppress(e.target.checked)}
            />
            直到下次更新前不再提示
          </label>
          <div className="flex justify-end gap-2 text-sm">
            <button
              type="button"
              className="btn btn-ghost btn-sm font-normal"
              onClick={handleClose}
              disabled={isPulling}
            >
              稍后再说
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-2 font-normal"
              onClick={onConfirmPull}
              disabled={isPulling}
            >
              {isPulling && <span className="loading loading-spinner loading-xs"></span>}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
