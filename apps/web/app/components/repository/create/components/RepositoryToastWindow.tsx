import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

export default function RepositoryToastWindow({
  modalOpen,
  setModalOpen,
  goToWorkSpace,
  repositoryName,
}: {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  goToWorkSpace: () => void;
  repositoryName?: string;
}) {
  const displayName = repositoryName?.trim() || "新仓库";

  return (
    <ToastWindow
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
    >
      <div className="flex w-[min(22rem,calc(100vw-2rem))] flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="break-words text-lg font-medium">
          仓库「{displayName}」已创建
        </p>
        <div className="join">
          <button
            className="btn btn-success join-item min-w-24 rounded-l-lg px-4"
            type="button"
            onClick={goToWorkSpace}
            aria-label={`编辑 ${displayName}`}
            title={`编辑 ${displayName}`}
          >
            编辑仓库
          </button>
          <button
            className="btn join-item min-w-24 rounded-r-lg px-4"
            type="button"
            onClick={() => setModalOpen(false)}
          >
            取消
          </button>
        </div>
      </div>
    </ToastWindow>
  );
}
