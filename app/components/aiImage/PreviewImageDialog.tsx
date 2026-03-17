import type { GeneratedImageItem } from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import { SharpDownload, XMarkICon } from "@/icons";

interface PreviewImageDialogProps {
  isOpen: boolean;
  selectedPreviewResult: GeneratedImageItem | null;
  selectedPreviewHistoryRow: AiImageHistoryRow | null;
  onClose: () => void;
  onDownloadCurrent: () => void;
}

export function PreviewImageDialog({
  isOpen,
  selectedPreviewResult,
  selectedPreviewHistoryRow,
  onClose,
  onDownloadCurrent,
}: PreviewImageDialogProps) {
  const previewMeta = selectedPreviewResult
    ? [
        selectedPreviewResult.toolLabel || selectedPreviewHistoryRow?.toolLabel || "",
        `seed: ${selectedPreviewResult.seed}`,
        `${selectedPreviewResult.width}×${selectedPreviewResult.height}`,
      ].filter(Boolean).join(" · ")
    : "暂无可查看的预览";

  return (
    <dialog
      open={isOpen}
      className={`modal ${isOpen ? "modal-open" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box relative flex max-h-[min(92vh,960px)] max-w-[min(94vw,1440px)] flex-col overflow-hidden border border-base-300 bg-base-100 p-0 text-base-content shadow-xl">
        <div className="flex items-center gap-3 border-b border-base-300 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold">查看预览</div>
            <div className="mt-1 truncate text-xs text-base-content/60">{previewMeta}</div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle border border-base-300 bg-base-200 text-base-content hover:bg-base-300"
            aria-label="关闭预览大图"
            title="关闭预览大图"
            onClick={onClose}
          >
            <XMarkICon className="size-5" />
          </button>
        </div>

        <div className="flex min-h-[60vh] items-center justify-center bg-base-200/50 p-4">
          {selectedPreviewResult
            ? (
                <img
                  src={selectedPreviewResult.dataUrl}
                  alt="preview-expanded"
                  className="max-h-[calc(92vh-12rem)] w-auto max-w-full rounded-2xl border border-base-300 bg-base-100 object-contain shadow-sm"
                />
              )
            : (
                <div className="text-sm text-base-content/60">暂无可查看的预览</div>
              )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-300 px-5 py-4">
          <div className="text-xs text-base-content/60">按 `Esc` 或点击右上角关闭。</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline gap-2"
              disabled={!selectedPreviewResult}
              onClick={onDownloadCurrent}
            >
              <SharpDownload className="size-4" />
              <span>下载当前</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!selectedPreviewResult}
              onClick={onClose}
            >
              完成
            </button>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
