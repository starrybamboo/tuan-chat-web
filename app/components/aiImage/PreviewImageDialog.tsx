import type { GeneratedImageItem } from "@/components/aiImage/types";
import { useEffect, useState } from "react";

const PREVIEW_IMAGE_DIALOG_TRANSITION_MS = 180;

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
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => setShouldRender(true));
      const raf = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => window.cancelAnimationFrame(raf);
    }

    queueMicrotask(() => setIsVisible(false));
    const timer = window.setTimeout(() => {
      setShouldRender(false);
    }, PREVIEW_IMAGE_DIALOG_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

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

  if (!shouldRender || !selectedPreviewResult)
    return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-base-200/75 backdrop-blur-[2px] transition-opacity duration-200 ease-out ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={(event) => {
        if (event.target === event.currentTarget)
          onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="预览图片"
    >
      <div
        className={`transform-gpu transition-all duration-200 ease-out ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.985] opacity-0"
        }`}
      >
        <img
          src={selectedPreviewResult.dataUrl}
          alt="preview-expanded"
          className="max-h-[92vh] max-w-[94vw] rounded-2xl object-contain shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
        />
      </div>
    </div>
  );
}
