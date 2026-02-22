interface TutorialUpdatePromptModalProps {
  open: boolean;
  mode: "missing" | "update" | null;
  latestCommitId?: number | null;
  currentCommitId?: number | null;
  isPulling: boolean;
  onClose: () => void;
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
  if (!open) {
    return null;
  }

  const isMissingMode = mode === "missing";
  const title = isMissingMode ? "还没有新手教程" : "新手教程有更新";
  const description = isMissingMode
    ? "检测到你当前还没有新手教程空间，是否现在克隆一份？"
    : "检测到新手教程已更新，是否拉取最新版本？拉取后会新建一份教程空间，并删除你当前的旧教程空间。";
  const confirmText = isMissingMode ? "立即克隆" : "立即拉取";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-lg rounded-xl border border-base-300 bg-base-100 p-5 shadow-xl">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-2 text-sm text-base-content/70 leading-relaxed">
          {description}
        </div>
        {!isMissingMode && (
          <div className="mt-3 rounded-lg bg-base-200 px-3 py-2 text-sm">
            <div>{`当前提交：${currentCommitId ?? "未知"}`}</div>
            <div className="mt-1">{`最新提交：${latestCommitId ?? "未知"}`}</div>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={isPulling}
          >
            稍后再说
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm gap-2"
            onClick={onConfirmPull}
            disabled={isPulling}
          >
            {isPulling && <span className="loading loading-spinner loading-xs"></span>}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
