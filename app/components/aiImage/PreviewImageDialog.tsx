import type { GeneratedImageItem } from "@/components/aiImage/types";
import { useEffect } from "react";

interface PreviewImageDialogProps {
  isOpen: boolean;
  selectedPreviewResult: GeneratedImageItem | null;
  onClose: () => void;
}

export function PreviewImageDialog({
  isOpen,
  selectedPreviewResult,
  onClose,
}: PreviewImageDialogProps) {
  useEffect(() => {
    if (!isOpen)
      return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape")
        onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !selectedPreviewResult)
    return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-200/75 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget)
          onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="预览图片"
    >
      <img
        src={selectedPreviewResult.dataUrl}
        alt="preview-expanded"
        className="max-h-[92vh] max-w-[94vw] rounded-2xl object-contain shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
      />
    </div>
  );
}
