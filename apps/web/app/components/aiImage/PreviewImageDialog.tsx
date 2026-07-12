import type { GeneratedImageItem } from "@/components/aiImage/types";

import { DialogFrame } from "@/components/common/DialogFrame";
import { MediaImage } from "@/components/common/mediaImage";

type PreviewImageDialogProps = {
  isOpen: boolean;
  selectedPreviewResult: GeneratedImageItem | null;
  onClose: () => void;
}

export function PreviewImageDialog({
  isOpen,
  selectedPreviewResult,
  onClose,
}: PreviewImageDialogProps) {
  if (!selectedPreviewResult)
    return null;

  return (
    <DialogFrame
      open={isOpen}
      mode="inline"
      onClose={onClose}
      ariaLabel="预览图片"
      closeButtonLabel="关闭图片预览"
      rootClassName="z-50 bg-base-200/75 backdrop-blur-[2px]"
      panelClassName="bg-transparent p-0 shadow-none"
    >
      <MediaImage
        src={selectedPreviewResult.dataUrl}
        alt="preview-expanded"
        className="
          max-h-[92vh] max-w-[94vw] rounded-2xl object-contain
          shadow-xl
        "
      />
    </DialogFrame>
  );
}
