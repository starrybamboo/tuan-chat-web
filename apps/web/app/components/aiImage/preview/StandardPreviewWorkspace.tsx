import {
  ArrowRightIcon,
  ClipboardTextIcon,
  PushPinIcon as PhosphorPushPinIcon,
  PlantIcon,
  SelectionPlusIcon,
} from "@phosphor-icons/react";

import type { AiImagePreviewPaneProps } from "@/components/aiImage/preview/types";

import { MediaImage } from "@/components/common/mediaImage";
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
  onSelectCurrentResult,
  onOpenPreviewImage,
  onTogglePinnedPreview,
  onOpenInpaint,
  onCopySelectedPreviewImage,
  onDownloadCurrent,
  onApplySelectedPreviewSeed,
}: AiImagePreviewPaneProps) {
  const previewToolbarControlSurfaceClassName = "rounded-md border-0 bg-base-200 shadow-none";
  const previewToolbarIconButtonClassName = `inline-flex size-9 shrink-0 items-center justify-center ${previewToolbarControlSurfaceClassName} text-base-content/70 transition-colors hover:bg-base-300/85 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-50`;
  const previewToolbarPillClassName = `inline-flex h-9 items-center ${previewToolbarControlSurfaceClassName} px-3 text-xs font-medium text-base-content`;
  const previewToolbarActionButtonClassName = `inline-flex h-9 items-center gap-2 ${previewToolbarControlSurfaceClassName} px-3 text-xs text-base-content transition-colors hover:bg-base-300/85`;
  const previewToolbarSectionClassName = "inline-flex w-fit max-w-full min-w-0 flex-wrap items-center gap-1 rounded-md border border-base-300 bg-base-100 p-1 shadow-sm";
  const previewThumbnailImageClassName = "block h-24 w-24 object-contain";

  return (
    <>
      {results.length > 1
        ? (
            <div className="flex gap-2 overflow-x-auto overscroll-x-none">
              {results.map((item, index) => (
                <button
                  key={`${item.batchId}-${item.batchIndex}`}
                  type="button"
                  className={`
                    overflow-hidden rounded-md border bg-base-100
                    ${!selectedHistoryPreviewKey && selectedResultIndex === index ? `
                      border-info
                    ` : `border-base-300`}
                  `}
                  onClick={() => onSelectCurrentResult(index)}
                  aria-label={`选择第 ${index + 1} 张生成结果`}
                  aria-pressed={!selectedHistoryPreviewKey && selectedResultIndex === index}
                >
                  <MediaImage src={item.dataUrl} alt={`result-${index + 1}`} className={previewThumbnailImageClassName} />
                </button>
              ))}
            </div>
          )
        : null}

      <div className="
        flex min-h-[520px] flex-1 self-stretch flex-col overflow-hidden
        rounded-md border border-base-300 bg-base-100/85 shadow-sm
      ">
        {selectedPreviewResult
          ? (
              <div className="flex justify-center border-b border-base-300/70 px-3 py-2.5">
                <div className={previewToolbarSectionClassName}>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="Open Inpaint"
                    aria-label="Open Inpaint"
                    disabled={isBusy}
                    onClick={onOpenInpaint}
                  >
                    <SelectionPlusIcon className="size-[18px]" weight="regular" />
                  </button>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="Open Director Tools"
                    aria-label="Open Director Tools"
                    disabled={isBusy}
                    onClick={onToggleDirectorTools}
                  >
                    <ArrowRightIcon className="size-[18px]" weight="regular" />
                  </button>
                </div>
              </div>
            )
          : null}
        <div
          aria-busy={isGeneratingImage}
          className="
            relative flex min-h-0 flex-1 items-center justify-center
              overflow-hidden p-4
          "
        >
          {isGeneratingImage
            ? (
                <div className="
                  pointer-events-none absolute inset-x-0 top-0 z-10 h-px
                  animate-pulse bg-info/65 motion-reduce:animate-none
                " />
              )
            : null}
          <div
            className="
              relative z-[1] flex max-h-full max-w-full items-center
              justify-center
            "
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
                  <MediaImage
                    src={selectedPreviewResult.dataUrl}
                    className="max-h-full max-w-full rounded-md object-contain"
                    alt={previewMeta || "result"}
                  />
                )
              : null}
          </div>
        </div>

        {selectedPreviewResult
          ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-base-300/70 px-3 py-2.5">
                <div className={previewToolbarSectionClassName}>
                  <span className={previewToolbarPillClassName}>{`${selectedPreviewResult.width} × ${selectedPreviewResult.height}`}</span>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="Open current preview"
                    aria-label="Open current preview"
                    onClick={onOpenPreviewImage}
                  >
                    <ExpandCornersIcon className="size-[18px]" />
                  </button>
                </div>
                <div className={`
                  ${previewToolbarSectionClassName}
                  justify-start
                  sm:ml-auto sm:justify-end
                `}>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title={isSelectedPreviewPinned ? "Unpin current preview" : "Pin current preview"}
                    aria-label={isSelectedPreviewPinned ? "Unpin current preview" : "Pin current preview"}
                    onClick={onTogglePinnedPreview}
                  >
                    <PhosphorPushPinIcon className="size-[18px]" weight="regular" />
                  </button>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="Copy current image"
                    aria-label="Copy current image"
                    onClick={() => void onCopySelectedPreviewImage()}
                  >
                    <ClipboardTextIcon className="size-[18px]" weight="regular" />
                  </button>
                  <button
                    type="button"
                    className={previewToolbarIconButtonClassName}
                    title="Download current preview"
                    aria-label="Download current preview"
                    onClick={onDownloadCurrent}
                  >
                    <SharpDownload className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    className={previewToolbarActionButtonClassName}
                    title="Apply current preview seed"
                    aria-label="Apply current preview seed"
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
