import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";

import { ArrowClockwise, CaretLeftIcon, FileArrowUpIcon, PencilSimpleLineIcon, SelectionPlusIcon, TrashIcon } from "@phosphor-icons/react";
import { clampRange, formatSliderValue } from "@/components/aiImage/helpers";
import { ChevronDown } from "@/icons";

const INFILL_APPEND_MIN_HEIGHT = 60;

function autoResizeInfillAppendTextarea(target: HTMLTextAreaElement) {
  target.style.height = `${INFILL_APPEND_MIN_HEIGHT}px`;
  target.style.height = `${Math.max(INFILL_APPEND_MIN_HEIGHT, target.scrollHeight)}px`;
}

function bindInfillAppendTextarea(node: HTMLTextAreaElement | null) {
  if (!node)
    return;
  autoResizeInfillAppendTextarea(node);
}

interface SharedBaseImageSectionProps {
  sourceImageDataUrl: string;
  infillMaskDataUrl: string;
  infillAppendPrompt: string;
  isBusy: boolean;
  isBaseImageToolsOpen: boolean;
  strength: number;
  baseImageHeaderClassName: string;
  baseImageControlGroupClassName: string;
  baseImageToggleButtonClassName: string;
  baseImageRangeClassName: string;
  infillAppendInputClassName: string;
  onOpenBaseImageInpaint: () => void | Promise<void>;
  onClearSourceImage: () => void;
  onReturnFromInfillSettings: () => void;
  onToggleBaseImageTools: () => void;
  onInfillAppendPromptChange: (value: string) => void;
  setStrength: (value: number) => void;
}

export function renderSimpleInfillSectionContent({
  sourceImageDataUrl,
  infillMaskDataUrl,
  infillAppendPrompt,
  isBusy,
  isBaseImageToolsOpen,
  strength,
  simpleBaseImageAttachmentClassName,
  baseImageHeaderClassName,
  baseImageControlGroupClassName,
  baseImageToggleButtonClassName,
  baseImageRangeClassName,
  infillAppendInputClassName,
  onOpenBaseImageInpaint,
  onClearSourceImage,
  onReturnFromInfillSettings,
  onToggleBaseImageTools,
  onInfillAppendPromptChange,
  setStrength,
}: SharedBaseImageSectionProps & {
  simpleBaseImageAttachmentClassName: string;
}) {
  if (!sourceImageDataUrl || !infillMaskDataUrl)
    return null;

  const infillActionButtonClassName = "inline-flex size-11 items-center justify-center bg-base-200 text-base-content/70 transition hover:bg-base-300 hover:text-base-content focus:outline-none focus-visible:bg-base-300 focus-visible:text-base-content disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={simpleBaseImageAttachmentClassName}>
      <div className="px-4 py-4">
        <div className={baseImageHeaderClassName}>
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="mt-[1px] inline-flex size-9 items-center justify-center rounded-md text-base-content/70 transition hover:bg-base-200 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="返回"
                title="返回"
                onClick={onReturnFromInfillSettings}
              >
                <CaretLeftIcon className="size-5" weight="bold" />
              </button>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold leading-6 text-base-content">Inpaint</div>
                <div className="mt-1 text-[13px] leading-5 text-base-content/58">Change part of an image.</div>
              </div>
            </div>
          </div>
          <div className={baseImageControlGroupClassName}>
            <div className="flex overflow-hidden rounded-md border border-base-300 bg-base-100">
              <button
                type="button"
                className={infillActionButtonClassName}
                aria-label="编辑蒙版"
                title="编辑蒙版"
                disabled={isBusy}
                onClick={() => void onOpenBaseImageInpaint()}
              >
                <PencilSimpleLineIcon className="size-5" weight="bold" />
              </button>
              <span className="h-11 w-px bg-base-300" aria-hidden="true" />
              <button
                type="button"
                className={infillActionButtonClassName}
                aria-label="清空"
                title="清空"
                disabled={isBusy}
                onClick={onClearSourceImage}
              >
                <TrashIcon className="size-5" weight="bold" />
              </button>
            </div>
            <button
              type="button"
              className={baseImageToggleButtonClassName}
              aria-label={isBaseImageToolsOpen ? "收起" : "展开"}
              title={isBaseImageToolsOpen ? "收起" : "展开"}
              disabled={isBusy}
              onClick={onToggleBaseImageTools}
            >
              <ChevronDown className={`size-5 shrink-0 transition-transform ${isBaseImageToolsOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {isBaseImageToolsOpen
          ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-[13px] font-semibold leading-5 text-base-content">Mask</div>
                  <div className="mt-2 overflow-hidden rounded-md border border-base-300 bg-base-200">
                    <div className="relative h-[220px] w-full">
                      <img
                        src={sourceImageDataUrl}
                        alt="Inpaint Mask"
                        className="absolute inset-0 h-full w-full object-contain"
                        draggable={false}
                      />
                      <img
                        src={infillMaskDataUrl}
                        alt="Mask Overlay"
                        className="absolute inset-0 h-full w-full object-contain opacity-55 mix-blend-screen"
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>

                <label className="block w-full">
                  <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-base-content">
                    <span>Strength</span>
                    <span>{formatSliderValue(strength)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={1}
                    step={0.01}
                    value={strength}
                    className={baseImageRangeClassName}
                    onChange={event => setStrength(clampRange(Number(event.target.value), 0.01, 1, 0.7))}
                  />
                </label>

                <label className="block w-full">
                  <div className="mb-2 text-[13px] font-semibold leading-5 text-base-content">Append Tags</div>
                  <textarea
                    className={infillAppendInputClassName}
                    rows={1}
                    ref={bindInfillAppendTextarea}
                    value={infillAppendPrompt}
                    onChange={(event) => {
                      onInfillAppendPromptChange(event.target.value);
                      autoResizeInfillAppendTextarea(event.currentTarget);
                    }}
                  />
                </label>
              </div>
            )
          : null}
      </div>
    </div>
  );
}

export function renderProInfillSectionContent({
  sourceImageDataUrl,
  infillMaskDataUrl,
  infillAppendPrompt,
  isBusy,
  isBaseImageToolsOpen,
  strength,
  baseImageHeaderClassName,
  baseImageControlGroupClassName,
  baseImageToggleButtonClassName,
  baseImageRangeClassName,
  infillAppendInputClassName,
  onOpenBaseImageInpaint,
  onClearSourceImage,
  onReturnFromInfillSettings,
  onToggleBaseImageTools,
  onInfillAppendPromptChange,
  setStrength,
}: SharedBaseImageSectionProps) {
  if (!sourceImageDataUrl || !infillMaskDataUrl)
    return null;

  const infillActionButtonClassName = "inline-flex size-11 items-center justify-center bg-base-200 text-base-content/70 transition hover:bg-base-300 hover:text-base-content focus:outline-none focus-visible:bg-base-300 focus-visible:text-base-content disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="-mx-3 -mb-3 mt-3 overflow-hidden border-t border-base-300 bg-base-100">
      <div className="px-4 py-4">
        <div className={baseImageHeaderClassName}>
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="mt-[1px] inline-flex size-9 items-center justify-center rounded-md text-base-content/70 transition hover:bg-base-200 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="返回"
                title="返回"
                onClick={onReturnFromInfillSettings}
              >
                <CaretLeftIcon className="size-5" weight="bold" />
              </button>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold leading-6 text-base-content">Inpaint</div>
                <div className="mt-1 text-[13px] leading-5 text-base-content/58">Change part of an image.</div>
              </div>
            </div>
          </div>
          <div className={baseImageControlGroupClassName}>
            <div className="flex overflow-hidden rounded-md border border-base-300 bg-base-100">
              <button
                type="button"
                className={infillActionButtonClassName}
                aria-label="编辑蒙版"
                title="编辑蒙版"
                disabled={isBusy}
                onClick={() => void onOpenBaseImageInpaint()}
              >
                <PencilSimpleLineIcon className="size-5" weight="bold" />
              </button>
              <span className="h-11 w-px bg-base-300" aria-hidden="true" />
              <button
                type="button"
                className={infillActionButtonClassName}
                aria-label="清空"
                title="清空"
                disabled={isBusy}
                onClick={onClearSourceImage}
              >
                <TrashIcon className="size-5" weight="bold" />
              </button>
            </div>
            <button
              type="button"
              className={baseImageToggleButtonClassName}
              aria-label={isBaseImageToolsOpen ? "收起" : "展开"}
              title={isBaseImageToolsOpen ? "收起" : "展开"}
              disabled={isBusy}
              onClick={onToggleBaseImageTools}
            >
              <ChevronDown className={`size-5 shrink-0 transition-transform ${isBaseImageToolsOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {isBaseImageToolsOpen
          ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-[13px] font-semibold leading-5 text-base-content">Mask</div>
                  <div className="mt-2 overflow-hidden rounded-md border border-base-300 bg-base-200">
                    <div className="relative h-[220px] w-full">
                      <img
                        src={sourceImageDataUrl}
                        alt="Inpaint Mask"
                        className="absolute inset-0 h-full w-full object-contain"
                        draggable={false}
                      />
                      <img
                        src={infillMaskDataUrl}
                        alt="Mask Overlay"
                        className="absolute inset-0 h-full w-full object-contain opacity-55 mix-blend-screen"
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>

                <label className="block">
                  <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-base-content">
                    <span>Strength</span>
                    <span>{formatSliderValue(strength)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={1}
                    step={0.01}
                    value={strength}
                    className={baseImageRangeClassName}
                    onChange={event => setStrength(clampRange(Number(event.target.value), 0.01, 1, 0.7))}
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-[13px] font-semibold leading-5 text-base-content">Append Tags</div>
                  <textarea
                    className={infillAppendInputClassName}
                    rows={1}
                    ref={bindInfillAppendTextarea}
                    value={infillAppendPrompt}
                    onChange={(event) => {
                      onInfillAppendPromptChange(event.target.value);
                      autoResizeInfillAppendTextarea(event.currentTarget);
                    }}
                  />
                </label>
              </div>
            )
          : null}
      </div>
    </div>
  );
}

export function renderSimpleBaseImageSectionContent({
  sourceImageDataUrl,
  infillMaskDataUrl,
  mode,
  isBusy,
  isBaseImageToolsOpen,
  strength,
  noise,
  featureUploadActionClassName,
  simpleBaseImageAttachmentClassName,
  baseImagePanelClassName,
  baseImageHeaderClassName,
  baseImageControlGroupClassName,
  baseImageToggleButtonClassName,
  baseImageActionButtonClassName,
  baseImageRangeClassName,
  infillAppendInputClassName,
  onOpenSourceImagePicker,
  onOpenBaseImageInpaint,
  onClearSourceImage,
  onReturnFromInfillSettings,
  onToggleBaseImageTools,
  infillAppendPrompt,
  onInfillAppendPromptChange,
  setStrength,
  setNoise,
}: {
  sourceImageDataUrl: string;
  infillMaskDataUrl: string;
  mode: AiImageHistoryMode;
  isBusy: boolean;
  isBaseImageToolsOpen: boolean;
  strength: number;
  noise: number;
  featureUploadActionClassName: string;
  simpleBaseImageAttachmentClassName: string;
  baseImagePanelClassName: string;
  baseImageHeaderClassName: string;
  baseImageControlGroupClassName: string;
  baseImageToggleButtonClassName: string;
  baseImageActionButtonClassName: string;
  baseImageRangeClassName: string;
  infillAppendInputClassName: string;
  onOpenSourceImagePicker: () => void;
  onOpenBaseImageInpaint: () => void | Promise<void>;
  onClearSourceImage: () => void;
  onReturnFromInfillSettings: () => void;
  onToggleBaseImageTools: () => void;
  infillAppendPrompt: string;
  onInfillAppendPromptChange: (value: string) => void;
  setStrength: (value: number) => void;
  setNoise: (value: number) => void;
}) {
  if (!sourceImageDataUrl) {
    return (
      <div className={simpleBaseImageAttachmentClassName}>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="text-[15px] text-base-content/58">
            Add a Base Img (Optional)
          </div>
          <button
            type="button"
            className={featureUploadActionClassName}
            aria-label="上传 Base Img"
            title="上传 Base Img"
            onClick={onOpenSourceImagePicker}
          >
            <FileArrowUpIcon className="size-5" weight="bold" />
          </button>
        </div>
      </div>
    );
  }

  if (mode === "infill") {
    return renderSimpleInfillSectionContent({
      sourceImageDataUrl,
      infillMaskDataUrl,
      isBusy,
      isBaseImageToolsOpen,
      strength,
      simpleBaseImageAttachmentClassName,
      baseImageHeaderClassName,
      baseImageControlGroupClassName,
      baseImageToggleButtonClassName,
      baseImageRangeClassName,
      infillAppendInputClassName,
      onOpenBaseImageInpaint,
      onClearSourceImage,
      onReturnFromInfillSettings,
      onToggleBaseImageTools,
      infillAppendPrompt,
      onInfillAppendPromptChange,
      setStrength,
    });
  }

  if (mode !== "img2img")
    return null;

  return (
    <div className={simpleBaseImageAttachmentClassName}>
      <div className={baseImagePanelClassName}>
        <img
          src={sourceImageDataUrl}
          alt="Base Img"
          className="absolute inset-0 h-full w-full object-cover opacity-46 saturate-[1.1] contrast-110 brightness-[1.03] dark:opacity-30 dark:saturate-100 dark:contrast-100 dark:brightness-100"
        />
        <div className="absolute inset-0 bg-linear-to-b from-primary/12 via-base-100/72 to-base-100/92 dark:from-black/42 dark:via-base-100/58 dark:to-base-100/84" />
        <div className={baseImageHeaderClassName}>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold leading-6 text-base-content">Image2Image</div>
            <div className="mt-1 text-[13px] leading-5 text-base-content/58">Transform your image.</div>
          </div>
          <div className={baseImageControlGroupClassName}>
            <div className="flex overflow-hidden rounded-md border border-base-300 bg-base-100/86 backdrop-blur-sm">
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center text-base-content/70 transition hover:bg-base-200/85 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="更换 Base Img"
                title="更换 Base Img"
                onClick={onOpenSourceImagePicker}
              >
                <ArrowClockwise className="size-5" weight="bold" />
              </button>
              <span className="h-11 w-px bg-base-300" aria-hidden="true" />
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center text-base-content/70 transition hover:bg-base-200/85 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="移除 Base Img"
                title="移除 Base Img"
                onClick={onClearSourceImage}
              >
                <TrashIcon className="size-5" weight="bold" />
              </button>
            </div>
            <button
              type="button"
              className={baseImageToggleButtonClassName}
              aria-label={isBaseImageToolsOpen ? "收起 Base Img 工具" : "展开 Base Img 工具"}
              title={isBaseImageToolsOpen ? "收起 Base Img 工具" : "展开 Base Img 工具"}
              onClick={onToggleBaseImageTools}
            >
              <ChevronDown className={`size-5 shrink-0 transition-transform ${isBaseImageToolsOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
        {isBaseImageToolsOpen
          ? (
              <div className="relative z-10 mt-4 space-y-4">
                <label className="block">
                  <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-base-content">
                    <span>Strength</span>
                    <span>{formatSliderValue(strength)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={1}
                    step={0.01}
                    value={strength}
                    className={baseImageRangeClassName}
                    onChange={event => setStrength(clampRange(Number(event.target.value), 0.01, 1, 0.7))}
                  />
                </label>

                <label className="block">
                  <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-base-content">
                    <span>Noise</span>
                    <span>{formatSliderValue(noise)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.99}
                    step={0.01}
                    value={noise}
                    className={baseImageRangeClassName}
                    onChange={event => setNoise(clampRange(Number(event.target.value), 0, 0.99, 0.2))}
                  />
                </label>

                <button
                  type="button"
                  className={baseImageActionButtonClassName}
                  disabled={isBusy}
                  onClick={() => void onOpenBaseImageInpaint()}
                >
                  <SelectionPlusIcon className="size-5" weight="bold" />
                  <span>Inpaint Image</span>
                </button>
              </div>
            )
          : null}
      </div>
    </div>
  );
}
