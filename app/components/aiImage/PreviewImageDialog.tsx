import type { GeneratedImageItem } from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

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
  onClose,
}: PreviewImageDialogProps) {
  if (!isOpen || !selectedPreviewResult)
    return null;

  return (
    <dialog
      open
      className="modal modal-open"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget)
          onClose();
      }}
    >
      <div className="modal-backdrop bg-base-200/75 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center p-4">
        <img
          src={selectedPreviewResult.dataUrl}
          alt="preview-expanded"
          className="max-h-[92vh] max-w-[94vw] rounded-2xl object-contain shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
        />
      </div>
    </dialog>
  );
}
