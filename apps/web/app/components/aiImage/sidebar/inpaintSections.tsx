import { CaretLeftIcon, PencilSimpleLineIcon, TrashIcon } from "@phosphor-icons/react";

import { clampRange, formatSliderValue } from "@/components/aiImage/helpers";
import { RangeInput, TextArea } from "@/components/common/FormField";
import { MediaImage } from "@/components/common/mediaImage";
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

type SharedInpaintSectionProps = {
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
  onEditInpaintMask: () => void | Promise<void>;
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
  simpleInfillAttachmentClassName,
  baseImageHeaderClassName,
  baseImageControlGroupClassName,
  baseImageToggleButtonClassName,
  baseImageRangeClassName,
  infillAppendInputClassName,
  onEditInpaintMask,
  onClearSourceImage,
  onReturnFromInfillSettings,
  onToggleBaseImageTools,
  onInfillAppendPromptChange,
  setStrength,
}: SharedInpaintSectionProps & {
  simpleInfillAttachmentClassName: string;
}) {
  if (!sourceImageDataUrl || !infillMaskDataUrl)
    return null;

  const infillActionButtonClassName = "inline-flex size-11 items-center justify-center bg-base-200 text-base-content/70 transition hover:bg-base-300 hover:text-base-content focus:outline-none focus-visible:bg-base-300 focus-visible:text-base-content focus:ring-2 focus:ring-info/30 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={simpleInfillAttachmentClassName}>
      <div className="px-4 py-4">
        <div className={baseImageHeaderClassName}>
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="
                  mt-[1px] inline-flex size-9 items-center justify-center
                  rounded-md text-base-content/70 transition
                  hover:bg-base-200 hover:text-base-content
                  focus:outline-none focus:ring-2 focus:ring-info/20
                "
                aria-label="返回"
                title="返回"
                onClick={onReturnFromInfillSettings}
              >
                <CaretLeftIcon className="size-5" weight="regular" />
              </button>
              <div className="min-w-0">
                <div className="
                  text-[15px] font-semibold leading-6 text-base-content
                ">Inpaint</div>
                <div className="mt-1 text-[13px] leading-5 text-base-content/58">Change part of an image.</div>
              </div>
            </div>
          </div>
          <div className={baseImageControlGroupClassName}>
            <div className="
              flex overflow-hidden rounded-md border border-base-300 bg-base-100
            ">
              <button
                type="button"
                className={infillActionButtonClassName}
                aria-label="编辑蒙版"
                title="编辑蒙版"
                disabled={isBusy}
                onClick={() => void onEditInpaintMask()}
              >
                <PencilSimpleLineIcon className="size-5" weight="regular" />
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
                <TrashIcon className="size-5" weight="regular" />
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
              <ChevronDown className={`
                size-5 shrink-0 transition-transform
                ${isBaseImageToolsOpen ? `rotate-180` : ""}
              `} />
            </button>
          </div>
        </div>

        {isBaseImageToolsOpen
          ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="
                    text-[13px] font-semibold leading-5 text-base-content
                  ">Mask</div>
                  <div className="
                    mt-2 overflow-hidden rounded-md border border-base-300
                    bg-base-200
                  ">
                    <div className="relative h-[220px] w-full">
                      <MediaImage
                        src={sourceImageDataUrl}
                        alt="Inpaint Mask"
                        className="
                          absolute inset-0 h-full w-full object-contain
                        "
                        draggable={false}
                      />
                      <MediaImage
                        src={infillMaskDataUrl}
                        alt="Mask Overlay"
                        className="
                          absolute inset-0 h-full w-full object-contain
                          opacity-55 mix-blend-screen
                        "
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>

                <label className="block w-full">
                  <div className="
                    flex items-center justify-between text-[13px] font-semibold
                    leading-5 text-base-content
                  ">
                    <span>Strength</span>
                    <span>{formatSliderValue(strength)}</span>
                  </div>
                  <RangeInput
                    density="compact"
                    min={0.01}
                    max={1}
                    step={0.01}
                    value={strength}
                    className={baseImageRangeClassName}
                    onChange={event => setStrength(clampRange(Number(event.target.value), 0.01, 1, 0.7))}
                  />
                </label>

                <label className="block w-full">
                  <div className="
                    mb-2 text-[13px] font-semibold leading-5 text-base-content
                  ">Append Tags</div>
                  <TextArea
                    appearance="bare"
                    density="compact"
                    className={infillAppendInputClassName}
                    rows={1}
                    autoComplete="off"
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
  onEditInpaintMask,
  onClearSourceImage,
  onReturnFromInfillSettings,
  onToggleBaseImageTools,
  onInfillAppendPromptChange,
  setStrength,
}: SharedInpaintSectionProps) {
  if (!sourceImageDataUrl || !infillMaskDataUrl)
    return null;

  const infillActionButtonClassName = "inline-flex size-11 items-center justify-center bg-base-200 text-base-content/70 transition hover:bg-base-300 hover:text-base-content focus:outline-none focus-visible:bg-base-300 focus-visible:text-base-content focus:ring-2 focus:ring-info/30 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="
      -mx-3 -mb-3 mt-3 overflow-hidden border-t border-base-300 bg-base-100
    ">
      <div className="px-4 py-4">
        <div className={baseImageHeaderClassName}>
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="
                  mt-[1px] inline-flex size-9 items-center justify-center
                  rounded-md text-base-content/70 transition
                  hover:bg-base-200 hover:text-base-content
                  focus:outline-none focus:ring-2 focus:ring-info/20
                "
                aria-label="返回"
                title="返回"
                onClick={onReturnFromInfillSettings}
              >
                <CaretLeftIcon className="size-5" weight="regular" />
              </button>
              <div className="min-w-0">
                <div className="
                  text-[15px] font-semibold leading-6 text-base-content
                ">Inpaint</div>
                <div className="mt-1 text-[13px] leading-5 text-base-content/58">Change part of an image.</div>
              </div>
            </div>
          </div>
          <div className={baseImageControlGroupClassName}>
            <div className="
              flex overflow-hidden rounded-md border border-base-300 bg-base-100
            ">
              <button
                type="button"
                className={infillActionButtonClassName}
                aria-label="编辑蒙版"
                title="编辑蒙版"
                disabled={isBusy}
                onClick={() => void onEditInpaintMask()}
              >
                <PencilSimpleLineIcon className="size-5" weight="regular" />
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
                <TrashIcon className="size-5" weight="regular" />
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
              <ChevronDown className={`
                size-5 shrink-0 transition-transform
                ${isBaseImageToolsOpen ? `rotate-180` : ""}
              `} />
            </button>
          </div>
        </div>

        {isBaseImageToolsOpen
          ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="
                    text-[13px] font-semibold leading-5 text-base-content
                  ">Mask</div>
                  <div className="
                    mt-2 overflow-hidden rounded-md border border-base-300
                    bg-base-200
                  ">
                    <div className="relative h-[220px] w-full">
                      <MediaImage
                        src={sourceImageDataUrl}
                        alt="Inpaint Mask"
                        className="
                          absolute inset-0 h-full w-full object-contain
                        "
                        draggable={false}
                      />
                      <MediaImage
                        src={infillMaskDataUrl}
                        alt="Mask Overlay"
                        className="
                          absolute inset-0 h-full w-full object-contain
                          opacity-55 mix-blend-screen
                        "
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>

                <label className="block">
                  <div className="
                    flex items-center justify-between text-[13px] font-semibold
                    leading-5 text-base-content
                  ">
                    <span>Strength</span>
                    <span>{formatSliderValue(strength)}</span>
                  </div>
                  <RangeInput
                    density="compact"
                    min={0.01}
                    max={1}
                    step={0.01}
                    value={strength}
                    className={baseImageRangeClassName}
                    onChange={event => setStrength(clampRange(Number(event.target.value), 0.01, 1, 0.7))}
                  />
                </label>

                <label className="block">
                  <div className="
                    mb-2 text-[13px] font-semibold leading-5 text-base-content
                  ">Append Tags</div>
                  <TextArea
                    appearance="bare"
                    density="compact"
                    className={infillAppendInputClassName}
                    rows={1}
                    autoComplete="off"
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
