import {
  ArrowRightIcon,
  ClipboardTextIcon,
  FrameCornersIcon,
  MagicWandIcon,
  PlantIcon,
  PushPinIcon as PhosphorPushPinIcon,
  SelectionPlusIcon,
} from "@phosphor-icons/react";

import type { AiImagePreviewPaneProps } from "@/components/aiImage/preview/types";
import { EmptyPreviewPlaceholder } from "@/components/aiImage/preview/EmptyPreviewPlaceholder";
import { ExpandCornersIcon, SharpDownload } from "@/icons";

export function StandardPreviewWorkspace({
  previewMeta,
  results,
  selectedPreviewResult,
  selectedResultIndex,
  selectedHistoryPreviewKey,
  isSelectedPreviewPinned,
  isBusy,
  isGeneratingImage,
  onToggleDirectorTools,
  onRunUpscale,
  onUseSelectedResultAsBaseImage,
  onSelectCurrentResult,
  onOpenPreviewImage,
  onTogglePinnedPreview,
  onOpenInpaint,
  onCopySelectedPreviewImage,
  onDownloadCurrent,
  onApplySelectedPreviewSeed,
}: AiImagePreviewPaneProps) {
  const previewToolbarControlSurfaceClassName = "!rounded-none border-0 bg-base-300/70 shadow-none";
  const previewToolbarIconButtonClassName = `inline-flex size-9 shrink-0 items-center justify-center ${previewToolbarControlSurfaceClassName} text-base-content/70 transition-colors hover:bg-base-300/85 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-50`;
  const previewToolbarPillClassName = `inline-flex h-9 items-center ${previewToolbarControlSurfaceClassName} px-3 text-xs font-medium text-base-content`;
  const previewToolbarActionButtonClassName = `inline-flex h-9 items-center gap-2 ${previewToolbarControlSurfaceClassName} px-3 text-xs text-base-content transition-colors hover:bg-base-300/85`;
  const previewToolbarSectionClassName = "inline-flex w-fit max-w-full min-w-0 flex-wrap items-center gap-0 rounded-none bg-white/22 p-px shadow-sm";
  const previewThumbnailImageClassName = "block h-24 w-24 object-contain";

  return (
    <>
      {results.length > 1
        ? (
            <div className="flex gap-2 overflow-x-auto">
              {results.map((item, index) => (
                <button
                  key={`${item.batchId}-${item.batchIndex}`}
                  type="button"
                  className={`overflow-hidden rounded-box border bg-base-100 ${!selectedHistoryPreviewKey && selectedResultIndex === index ? "border-primary" : "border-base-300"}`}
                  onClick={() => onSelectCurrentResult(index)}
                >
                  <img src={item.dataUrl} alt={`result-${index + 1}`} className={previewThumbnailImageClassName} />
                </button>
              ))}
            </div>
          )
        : null}

      <div className="flex min-h-[520px] flex-1 self-stretch flex-col overflow-hidden rounded-none border-y border-base-300 bg-base-100">
        {selectedPreviewResult
          ? (
              <div className="flex justify-center px-3 py-2.5">
                <div className={previewToolbarSectionClassName}>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="Upscale 宸茬鐢?"
                    aria-label="Upscale 宸茬鐢?"
                    disabled
                    onClick={() => void onRunUpscale()}
                  >
                    <FrameCornersIcon className="size-[18px]" weight="bold" />
                  </button>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="Use as Base Image"
                    aria-label="Use as Base Image"
                    disabled={isBusy}
                    onClick={onUseSelectedResultAsBaseImage}
                  >
                    <MagicWandIcon className="size-[18px]" weight="bold" />
                  </button>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="鎵撳紑 Inpaint"
                    aria-label="鎵撳紑 Inpaint"
                    disabled={isBusy}
                    onClick={onOpenInpaint}
                  >
                    <SelectionPlusIcon className="size-[18px]" weight="bold" />
                  </button>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="鎵撳紑 Director Tools"
                    aria-label="鎵撳紑 Director Tools"
                    disabled={isBusy}
                    onClick={onToggleDirectorTools}
                  >
                    <ArrowRightIcon className="size-[18px]" weight="bold" />
                  </button>
                </div>
              </div>
            )
          : null}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
          {isGeneratingImage
            ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px animate-pulse bg-primary/65" />
              )
            : null}
          <div
            className="relative z-[1] flex max-h-full max-w-full items-center justify-center"
            style={selectedPreviewResult
              ? {
                  width: `${selectedPreviewResult.width}px`,
                  height: `${selectedPreviewResult.height}px`,
                  maxWidth: "100%",
                  maxHeight: "100%",
                }
              : undefined}
          >
            {selectedPreviewResult
              ? (
                  <img
                    src={selectedPreviewResult.dataUrl}
                    className="max-h-full max-w-full rounded-box object-contain"
                    alt={previewMeta || "result"}
                  />
                )
              : <EmptyPreviewPlaceholder />}
          </div>
        </div>

        {selectedPreviewResult
          ? (
              <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className={previewToolbarSectionClassName}>
                  <span className={previewToolbarPillClassName}>{`${selectedPreviewResult.width} 脳 ${selectedPreviewResult.height}`}</span>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="鏌ョ湅褰撳墠棰勮"
                    aria-label="鏌ョ湅褰撳墠棰勮"
                    onClick={onOpenPreviewImage}
                  >
                    <ExpandCornersIcon className="size-[18px]" />
                  </button>
                </div>
                <div className={`${previewToolbarSectionClassName} justify-start sm:ml-auto sm:justify-end`}>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title={isSelectedPreviewPinned ? "鍙栨秷鍥哄畾褰撳墠棰勮" : "鍥哄畾褰撳墠棰勮"}
                    aria-label={isSelectedPreviewPinned ? "鍙栨秷鍥哄畾褰撳墠棰勮" : "鍥哄畾褰撳墠棰勮"}
                    onClick={onTogglePinnedPreview}
                  >
                    <PhosphorPushPinIcon className="size-[18px]" weight="regular" />
                  </button>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="澶嶅埗褰撳墠鍥剧墖"
                    aria-label="澶嶅埗褰撳墠鍥剧墖"
                    onClick={() => void onCopySelectedPreviewImage()}
                  >
                    <ClipboardTextIcon className="size-[18px]" weight="regular" />
                  </button>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="涓嬭浇褰撳墠棰勮"
                    aria-label="涓嬭浇褰撳墠棰勮"
                    onClick={onDownloadCurrent}
                  >
                    <SharpDownload className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    className={previewToolbarActionButtonClassName}
                    title="灏嗗綋鍓嶉瑙?seed 鍥炲～鍒拌缃?"
                    aria-label="灏嗗綋鍓嶉瑙?seed 鍥炲～鍒拌缃?"
                    onClick={onApplySelectedPreviewSeed}
                  >
                    <PlantIcon className="size-[18px]" weight="regular" />
                    <span className="font-mono text-[11px]">{selectedPreviewResult.seed}</span>
                  </button>
                </div>
              </div>
            )
          : null}
      </div>
    </>
  );
}
