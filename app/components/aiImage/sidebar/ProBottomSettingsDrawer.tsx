import { ArrowCounterClockwise, CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";

import {
  SAMPLER_LABELS,
  SCHEDULE_LABELS,
} from "@/components/aiImage/constants";
import {
  clampIntRange,
  clampRange,
  formatSliderValue,
} from "@/components/aiImage/helpers";

export function renderProBottomSettingsDrawerContent({
  uiMode,
  isProBottomSettingsOpen,
  steps,
  scale,
  seedIsRandom,
  seed,
  sampler,
  samplerOptions,
  subtleInputClassName,
  subtleSelectClassName,
  noiseScheduleOptions,
  noiseSchedule,
  isNAI4,
  isNAI3,
  cfgRescale,
  qualityToggle,
  smea,
  smeaDyn,
  onResetCurrentImageSettings,
  onOpenDrawer,
  onCloseDrawer,
  setSteps,
  setQualityToggle,
  setScale,
  setSeed,
  setSampler,
  setCfgRescale,
  setNoiseSchedule,
  setSmea,
  setSmeaDyn,
}: {
  uiMode: "simple" | "pro";
  isProBottomSettingsOpen: boolean;
  steps: number;
  scale: number;
  seedIsRandom: boolean;
  seed: number;
  sampler: string;
  samplerOptions: readonly string[];
  subtleInputClassName: string;
  subtleSelectClassName: string;
  noiseScheduleOptions: readonly string[];
  noiseSchedule: string;
  isNAI4: boolean;
  isNAI3: boolean;
  cfgRescale: number;
  qualityToggle: boolean;
  smea: boolean;
  smeaDyn: boolean;
  onResetCurrentImageSettings: () => void;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  setSteps: (value: number) => void;
  setQualityToggle: (value: boolean) => void;
  setScale: (value: number) => void;
  setSeed: (value: number) => void;
  setSampler: (value: string) => void;
  setCfgRescale: (value: number) => void;
  setNoiseSchedule: (value: string) => void;
  setSmea: (value: boolean) => void;
  setSmeaDyn: (value: boolean) => void;
}) {
  if (uiMode !== "pro")
    return null;

  return (
    <div className="relative h-14 shrink-0 bg-base-200 px-4 pb-3">
      {!isProBottomSettingsOpen
        ? (
            <button
              type="button"
              className="grid h-14 w-full -translate-y-1 grid-cols-[max-content_max-content_max-content_minmax(0,1fr)_auto] items-center gap-[10px] rounded-t-2xl border border-base-300 bg-base-100 px-3 text-left text-base-content transition hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-expanded={isProBottomSettingsOpen}
              onClick={onOpenDrawer}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="text-xs font-medium leading-none text-base-content/52">Steps</div>
                <div className="text-sm font-semibold leading-none text-base-content">{steps}</div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="text-xs font-medium leading-none text-base-content/52">Guidance</div>
                <div className="text-sm font-semibold leading-none text-base-content">{formatSliderValue(scale)}</div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="text-xs font-medium leading-none text-base-content/52">Seed</div>
                <div className="text-sm font-semibold leading-none text-base-content">{seedIsRandom ? "N/A" : seed}</div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                <div className="truncate text-xs font-medium leading-none text-base-content/52">Sampler</div>
                <div className="truncate text-sm font-semibold leading-none text-base-content">{SAMPLER_LABELS[sampler] || sampler}</div>
              </div>
              <div className="flex items-center justify-end">
                <CaretUpIcon className="size-4" weight="bold" />
              </div>
            </button>
          )
        : null}

      <div
        className={`absolute inset-x-4 bottom-0 z-20 origin-bottom overflow-hidden rounded-t-2xl border border-base-300 bg-base-100 text-base-content shadow-[0_-16px_36px_rgba(15,23,42,0.12)] transition-all duration-300 ease-out ${
          isProBottomSettingsOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-6 scale-[0.98] opacity-0"
        }`}
      >
        <div className="overflow-visible pb-4 pl-4 pr-0 pt-4">
          <div className="mb-4 flex items-center justify-between gap-3 pr-4">
            <div className="text-sm font-semibold text-base-content/92">AI Settings</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-md text-base-content/72 transition hover:bg-base-200 hover:text-base-content focus:outline-none"
                aria-label="重置绘图设置"
                title="重置绘图设置"
                onClick={onResetCurrentImageSettings}
              >
                <ArrowCounterClockwise className="size-4" weight="bold" />
              </button>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-md text-base-content/72 transition hover:bg-base-200 hover:text-base-content focus:outline-none"
                aria-label="收起 AI 设置"
                title="收起 AI 设置"
                onClick={onCloseDrawer}
              >
                <CaretDownIcon className="size-4" weight="bold" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between pr-4">
                <span className="text-sm font-semibold text-base-content dark:text-white">{`Steps: ${steps}`}</span>
              </div>
              <div className="pr-4">
                <input
                  className="range range-xs w-full"
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={steps}
                  onChange={e => setSteps(clampIntRange(Number(e.target.value), 1, 50, 50))}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 pr-4">
                <span className="text-sm font-semibold text-base-content dark:text-white">{`Prompt Guidance: ${scale}`}</span>
                <button
                  type="button"
                  className={`inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold transition focus:outline-none ${
                    qualityToggle
                    ? "border-transparent bg-primary/10 text-primary"
                      : "border-transparent bg-base-100 text-base-content/72 hover:bg-base-200 hover:text-primary"
                  }`}
                  aria-pressed={qualityToggle}
                  onClick={() => setQualityToggle(!qualityToggle)}
                >
                  Variety+
                </button>
              </div>
              <div className="pr-4">
                <input
                  className="range range-xs w-full"
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={scale}
                  onChange={e => setScale(clampRange(Number(e.target.value), 0, 10, 5))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pr-4">
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold text-base-content dark:text-white">Seed</div>
                <input
                  className={`${subtleInputClassName} border-base-300 bg-base-100 text-base-content placeholder:text-base-content/28 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  type="number"
                  value={seedIsRandom ? "" : seed}
                  placeholder="Enter a seed"
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    setSeed(value ? Number(value) : -1);
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold text-base-content dark:text-white">Sampler</div>
                <select className={`${subtleSelectClassName} border-base-300 bg-base-100 text-base-content`} value={sampler} onChange={e => setSampler(e.target.value)}>
                  {samplerOptions.map(s => <option key={s} value={s}>{SAMPLER_LABELS[s] || s}</option>)}
                </select>
              </div>
            </div>

            <details className="collapse collapse-arrow border-0 bg-transparent" open>
              <summary className="collapse-title min-h-0 px-0 py-0 pr-12 text-sm font-semibold text-base-content dark:text-white">
                Advanced Settings
              </summary>
              <div className="collapse-content space-y-4 px-0 pb-0 pr-4 pt-4">
                {isNAI4
                  ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-base-content dark:text-white">{`Prompt Guidance Rescale: ${cfgRescale}`}</span>
                        <div className="pr-4">
                          <input
                            className="range range-xs w-full"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={cfgRescale}
                            onChange={e => setCfgRescale(clampRange(Number(e.target.value), 0, 1, 0))}
                          />
                        </div>
                      </div>
                    )
                  : null}

                {noiseScheduleOptions.length
                  ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-base-content dark:text-white">Noise Schedule</span>
                        <select className={`${subtleSelectClassName} border-base-300 bg-base-100 text-base-content`} value={noiseSchedule} onChange={e => setNoiseSchedule(e.target.value)}>
                          {noiseScheduleOptions.map(s => <option key={s} value={s}>{SCHEDULE_LABELS[s] || s}</option>)}
                        </select>
                      </div>
                    )
                  : null}

                {isNAI3
                  ? (
                      <>
                        <label className="label cursor-pointer justify-start gap-3 px-0">
                          <input type="checkbox" className="toggle toggle-sm" checked={smea} onChange={e => setSmea(e.target.checked)} />
                          <span className="label-text text-base-content/78 dark:text-white/78">SMEA</span>
                        </label>
                        <label className="label cursor-pointer justify-start gap-3 px-0">
                          <input type="checkbox" className="toggle toggle-sm" checked={smeaDyn} onChange={e => setSmeaDyn(e.target.checked)} />
                          <span className="label-text text-base-content/78 dark:text-white/78">SMEA Dyn</span>
                        </label>
                      </>
                    )
                  : null}
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
