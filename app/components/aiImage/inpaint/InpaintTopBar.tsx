import {
  DownloadSimpleIcon,
  FloppyDiskIcon,
  XIcon,
} from "@phosphor-icons/react";

export function InpaintTopBar({
  hasMask,
  isSubmitting,
  onDownloadSource,
  onSubmit,
  onClose,
  topIconActionButtonClassName,
  topActionButtonClassName,
}: {
  hasMask: boolean;
  isSubmitting: boolean;
  onDownloadSource: () => void;
  onSubmit: () => void | Promise<void>;
  onClose: () => void;
  topIconActionButtonClassName: string;
  topActionButtonClassName: string;
}) {
  return (
    <div className="absolute right-4 top-4 z-20 flex items-stretch overflow-hidden border border-base-300 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
      <button
        type="button"
        className={topIconActionButtonClassName}
        aria-label="下载原图"
        title="下载原图"
        disabled={isSubmitting}
        onClick={onDownloadSource}
      >
        <DownloadSimpleIcon className="size-[18px]" weight="bold" />
      </button>
      <button
        type="button"
        className={`${topActionButtonClassName} border-l border-base-300 bg-primary text-primary-content hover:bg-primary/90`}
        disabled={!hasMask || isSubmitting}
        onClick={() => void onSubmit()}
      >
        <FloppyDiskIcon className="mr-2 size-[18px]" weight="bold" />
        {isSubmitting ? "保存中..." : "保存并关闭"}
      </button>
      <button
        type="button"
        className={`${topIconActionButtonClassName} border-l border-base-300`}
        aria-label="关闭 Inpaint"
        title="关闭 Inpaint"
        disabled={isSubmitting}
        onClick={onClose}
      >
        <XIcon className="size-[18px]" weight="bold" />
      </button>
    </div>
  );
}
