import { ArrowClockwise, CaretLeftIcon, FileArrowUpIcon, PencilSimpleLineIcon, SelectionPlusIcon, TrashIcon } from "@phosphor-icons/react";

import type { AiImageHistoryMode } from "@/utils/aiImageHistoryDb";
import { clampRange, formatSliderValue } from "@/components/aiImage/helpers";
import { ChevronDown } from "@/icons";

interface SharedBaseImageSectionProps {
  sourceImageDataUrl: string;
  infillMaskDataUrl: string;
  isBusy: boolean;
  isBaseImageToolsOpen: boolean;
  strength: number;
  baseImageHeaderClassName: string;
  baseImageControlGroupClassName: string;
  baseImageToggleButtonClassName: string;
  baseImageRangeClassName: string;
  onOpenBaseImageInpaint: () => void | Promise<void>;
  onClearSourceImage: () => void;
  onReturnFromInfillSettings: () => void;
  onToggleBaseImageTools: () => void;
  setStrength: (value: number) => void;
}

export function renderSimpleInfillSectionContent({
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
  onOpenBaseImageInpaint,
  onClearSourceImage,
  onReturnFromInfillSettings,
  onToggleBaseImageTools,
  setStrength,
}: SharedBaseImageSectionProps & {
  simpleBaseImageAttachmentClassName: string;
}) {
  if (!sourceImageDataUrl || !infillMaskDataUrl)
    return null;

  const infillActionButtonClassName = "inline-flex size-11 items-center justify-center bg-black/[0.03] text-base-content/70 transition hover:bg-black/[0.06] hover:text-base-content focus:outline-none focus-visible:bg-black/[0.06] focus-visible:text-base-content disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/[0.04] dark:text-white/80 dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:bg-white/[0.08] dark:focus-visible:text-white";

  return (
    <div className={simpleBaseImageAttachmentClassName}>
      <div className="px-4 py-4">
        <div className={baseImageHeaderClassName}>
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="mt-[1px] inline-flex size-9 items-center justify-center rounded-md text-base-content/70 transition hover:bg-base-200 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white/80 dark:hover:bg-white/6 dark:hover:text-white dark:focus:ring-white/15"
                aria-label="杩斿洖"
                title="杩斿洖"
                onClick={onReturnFromInfillSettings}
              >
                <CaretLeftIcon className="size-5" weight="bold" />
              </button>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold leading-6 text-base-content dark:text-white">Inpaint</div>
                <div className="mt-1 text-[13px] leading-5 text-base-content/58 dark:text-white/72">Change part of an image.</div>
              </div>
            </div>
          </div>
          <div className={baseImageControlGroupClassName}>
            <div className="flex overflow-hidden rounded-md border border-[#D6DCE3] bg-[#F3F5F7] dark:border-[#2A3138] dark:bg-[#161A1F]">
              <button
                type="button"
                className={infillActionButtonClassName}
                aria-label="缂栬緫钂欑増"
                title="缂栬緫钂欑増"
                disabled={isBusy}
                onClick={() => void onOpenBaseImageInpaint()}
              >
                <PencilSimpleLineIcon className="size-5" weight="bold" />
              </button>
              <span className="h-11 w-px bg-[#D6DCE3] dark:bg-[#2A3138]" aria-hidden="true" />
              <button
                type="button"
                className={infillActionButtonClassName}
                aria-label="娓呯┖"
                title="娓呯┖"
                disabled={isBusy}
                onClick={onClearSourceImage}
              >
                <TrashIcon className="size-5" weight="bold" />
              </button>
            </div>
            <button
              type="button"
              className={baseImageToggleButtonClassName}
              aria-label={isBaseImageToolsOpen ? "鏀惰捣" : "灞曞紑"}
              title={isBaseImageToolsOpen ? "鏀惰捣" : "灞曞紑"}
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
                  <div className="text-[13px] font-semibold leading-5 text-base-content dark:text-white">Mask</div>
                  <div className="mt-2 overflow-hidden rounded-md border border-[#D6DCE3] bg-[#F3F5F7] dark:border-[#2A3138] dark:bg-[#0B0D1B]">
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
                  <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-base-content dark:text-white">
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
  isBusy,
  isBaseImageToolsOpen,
  strength,
  baseImageHeaderClassName,
  baseImageControlGroupClassName,
  baseImageToggleButtonClassName,
  baseImageRangeClassName,
  onOpenBaseImageInpaint,
  onClearSourceImage,
  onReturnFromInfillSettings,
  onToggleBaseImageTools,
  setStrength,
}: SharedBaseImageSectionProps) {
  if (!sourceImageDataUrl || !infillMaskDataUrl)
    return null;

  const infillActionButtonClassName = "inline-flex size-11 items-center justify-center bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:bg-white/[0.08] focus-visible:text-white disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="-mx-3 -mb-3 mt-3 overflow-hidden border-t border-[#2A3138] bg-[#161A1F]">
      <div className="px-4 py-4">
        <div className={baseImageHeaderClassName}>
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="mt-[1px] inline-flex size-9 items-center justify-center rounded-md text-white/80 transition hover:bg-white/6 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
                aria-label="杩斿洖"
                title="杩斿洖"
                onClick={onReturnFromInfillSettings}
              >
                <CaretLeftIcon className="size-5" weight="bold" />
              </button>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold leading-6 text-white">Inpaint</div>
                <div className="mt-1 text-[13px] leading-5 text-white/72">Change part of an image.</div>
              </div>
            </div>
          </div>
          <div className={baseImageControlGroupClassName}>
            <div className="flex overflow-hidden rounded-md border border-[#2A3138] bg-[#161A1F]">
              <button
                type="button"
                className={infillActionButtonClassName}
                aria-label="缂栬緫钂欑増"
                title="缂栬緫钂欑増"
                disabled={isBusy}
                onClick={() => void onOpenBaseImageInpaint()}
              >
                <PencilSimpleLineIcon className="size-5" weight="bold" />
              </button>
              <span className="h-11 w-px bg-[#2A3138]" aria-hidden="true" />
              <button
                type="button"
                className={infillActionButtonClassName}
                aria-label="娓呯┖"
                title="娓呯┖"
                disabled={isBusy}
                onClick={onClearSourceImage}
              >
                <TrashIcon className="size-5" weight="bold" />
              </button>
            </div>
            <button
              type="button"
              className={baseImageToggleButtonClassName}
              aria-label={isBaseImageToolsOpen ? "鏀惰捣" : "灞曞紑"}
              title={isBaseImageToolsOpen ? "鏀惰捣" : "灞曞紑"}
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
                  <div className="text-[13px] font-semibold leading-5 text-white">Mask</div>
                  <div className="mt-2 overflow-hidden rounded-md border border-[#2A3138] bg-[#0B0D1B]">
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
                  <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-white">
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
  onOpenSourceImagePicker,
  onOpenBaseImageInpaint,
  onClearSourceImage,
  onReturnFromInfillSettings,
  onToggleBaseImageTools,
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
  onOpenSourceImagePicker: () => void;
  onOpenBaseImageInpaint: () => void | Promise<void>;
  onClearSourceImage: () => void;
  onReturnFromInfillSettings: () => void;
  onToggleBaseImageTools: () => void;
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
            aria-label="涓婁紶 Base Img"
            title="涓婁紶 Base Img"
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
      onOpenBaseImageInpaint,
      onClearSourceImage,
      onReturnFromInfillSettings,
      onToggleBaseImageTools,
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
          className="absolute inset-0 h-full w-full object-cover opacity-28"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,27,0.66)_0%,rgba(11,13,27,0.74)_100%)]" />
        <div className={baseImageHeaderClassName}>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold leading-6 text-white">Image2Image</div>
            <div className="mt-1 text-[13px] leading-5 text-white/72">Transform your image.</div>
          </div>
          <div className={baseImageControlGroupClassName}>
            <div className="flex overflow-hidden rounded-md border border-[#2A3138] bg-[#161A1F]">
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center text-white/80 transition hover:bg-white/6 hover:text-white focus:outline-none"
                aria-label="鏇存崲 Base Img"
                title="鏇存崲 Base Img"
                onClick={onOpenSourceImagePicker}
              >
                <ArrowClockwise className="size-5" weight="bold" />
              </button>
              <span className="h-11 w-px bg-[#2A3138]" aria-hidden="true" />
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center text-white/80 transition hover:bg-white/6 hover:text-white focus:outline-none"
                aria-label="绉婚櫎 Base Img"
                title="绉婚櫎 Base Img"
                onClick={onClearSourceImage}
              >
                <TrashIcon className="size-5" weight="bold" />
              </button>
            </div>
            <button
              type="button"
              className={baseImageToggleButtonClassName}
              aria-label={isBaseImageToolsOpen ? "鏀惰捣 Base Img 宸ュ叿" : "灞曞紑 Base Img 宸ュ叿"}
              title={isBaseImageToolsOpen ? "鏀惰捣 Base Img 宸ュ叿" : "灞曞紑 Base Img 宸ュ叿"}
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
                  <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-white">
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
                  <div className="flex items-center justify-between text-[13px] font-semibold leading-5 text-white">
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
