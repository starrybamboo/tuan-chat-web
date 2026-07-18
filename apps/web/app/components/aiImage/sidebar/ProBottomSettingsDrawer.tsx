import { ArrowCounterClockwise, CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";

import {
  NOVELAI_FREE_MAX_STEPS,
  SAMPLER_LABELS,
  SCHEDULE_LABELS,
} from "@/components/aiImage/constants";
import {
  clampIntRange,
  clampRange,
  formatSliderValue,
} from "@/components/aiImage/helpers";
import { Disclosure } from "@/components/common/Disclosure";
import { RangeInput, SelectInput, TextInput } from "@/components/common/FormField";

export function renderProBottomSettingsDrawerContent({
  uiMode,
  isProBottomSettingsOpen,
  steps,
  scale,
  seedIsRandom,
  seed,
  sampler,
  samplerOptions,
  noiseScheduleOptions,
  noiseSchedule,
  cfgRescale,
  cfgDelay,
  dynamicThresholding,
  onResetCurrentImageSettings,
  onOpenDrawer,
  onCloseDrawer,
  setSteps,
  setCfgDelay,
  setDynamicThresholding,
  setScale,
  setSeed,
  setSampler,
  setCfgRescale,
  setNoiseSchedule,
}: {
  uiMode: "simple" | "pro";
  isProBottomSettingsOpen: boolean;
  steps: number;
  scale: number;
  seedIsRandom: boolean;
  seed: number;
  sampler: string;
  samplerOptions: readonly string[];
  noiseScheduleOptions: readonly string[];
  noiseSchedule: string;
  cfgRescale: number;
  cfgDelay: boolean;
  dynamicThresholding: boolean;
  onResetCurrentImageSettings: () => void;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  setSteps: (value: number) => void;
  setCfgDelay: (value: boolean) => void;
  setDynamicThresholding: (value: boolean) => void;
  setScale: (value: number) => void;
  setSeed: (value: number) => void;
  setSampler: (value: string) => void;
  setCfgRescale: (value: number) => void;
  setNoiseSchedule: (value: string) => void;
}) {
  if (uiMode !== "pro")
    return null;

  return (
    <div className="relative h-14 shrink-0 bg-transparent px-4 pb-3">
      {!isProBottomSettingsOpen
        ? (
            <button
              type="button"
              className="
                grid h-14 w-full -translate-y-1
                grid-cols-[max-content_max-content_max-content_minmax(0,1fr)_auto]
                items-center gap-[10px] rounded-t-2xl border border-base-300
                bg-base-100 px-3 text-left text-base-content transition
                hover:bg-base-200
                focus:outline-none focus:ring-2 focus:ring-info/20
                dark:text-white
              "
              aria-expanded={isProBottomSettingsOpen}
              aria-controls="ai-image-pro-bottom-settings"
              aria-label={`展开 AI 设置，Steps ${steps}，Guidance ${formatSliderValue(scale)}，Seed ${seedIsRandom ? "随机" : seed}，Sampler ${SAMPLER_LABELS[sampler] || sampler}`}
              onClick={onOpenDrawer}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="
                  text-xs font-medium leading-none text-base-content/52
                  dark:text-white/52
                ">Steps</div>
                <div className="
                  text-sm font-semibold leading-none text-base-content
                  dark:text-white
                ">{steps}</div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="
                  text-xs font-medium leading-none text-base-content/52
                  dark:text-white/52
                ">Guidance</div>
                <div className="
                  text-sm font-semibold leading-none text-base-content
                  dark:text-white
                ">{formatSliderValue(scale)}</div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="
                  text-xs font-medium leading-none text-base-content/52
                  dark:text-white/52
                ">Seed</div>
                <div className="
                  text-sm font-semibold leading-none text-base-content
                  dark:text-white
                ">{seedIsRandom ? "N/A" : seed}</div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                <div className="
                  truncate text-xs font-medium leading-none text-base-content/52
                  dark:text-white/52
                ">Sampler</div>
                <div className="
                  truncate text-sm font-semibold leading-none text-base-content
                  dark:text-white
                ">{SAMPLER_LABELS[sampler] || sampler}</div>
              </div>
              <div className="flex items-center justify-end">
                <CaretUpIcon className="size-4" weight="regular" />
              </div>
            </button>
          )
        : null}

      <div
        id="ai-image-pro-bottom-settings"
        className={`
          absolute inset-x-4 bottom-0 z-20 origin-bottom overflow-hidden
          rounded-t-2xl border border-base-300 bg-base-200 text-base-content
          shadow-xl transition-all duration-300 motion-reduce:transition-none
          ease-out
            dark:text-white
          ${
          isProBottomSettingsOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-6 scale-[0.98] opacity-0"
        }
        `}
      >
        <div className="overflow-visible pb-4 pl-4 pr-0 pt-4">
          <div className="mb-4 flex items-center justify-between gap-3 pr-4">
            <div className="
              text-sm font-semibold text-base-content/92
              dark:text-white/92
            ">AI 设置</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="
                  inline-flex size-8 items-center justify-center rounded-md
                  text-base-content/72 transition
                  hover:bg-black/5 hover:text-base-content
                  focus:outline-none focus:ring-2 focus:ring-info/30
                  dark:text-white/72
                  dark:hover:bg-white/8 dark:hover:text-white
                "
                aria-label="重置绘图设置"
                title="重置绘图设置"
                onClick={onResetCurrentImageSettings}
              >
                <ArrowCounterClockwise className="size-4" weight="regular" />
              </button>
              <button
                type="button"
                className="
                  inline-flex size-8 items-center justify-center rounded-md
                  text-base-content/72 transition
                  hover:bg-black/5 hover:text-base-content
                  focus:outline-none focus:ring-2 focus:ring-info/30
                  dark:text-white/72
                  dark:hover:bg-white/8 dark:hover:text-white
                "
                aria-label="收起 AI 设置"
                title="收起 AI 设置"
                onClick={onCloseDrawer}
              >
                <CaretDownIcon className="size-4" weight="regular" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between pr-4">
                <span className="
                  text-sm font-semibold text-base-content
                  dark:text-white
                ">{`Steps: ${steps}`}</span>
              </div>
              <div className="pr-4">
                <RangeInput
                  aria-label="Steps"
                  density="compact"
                  min="1"
                  max={NOVELAI_FREE_MAX_STEPS}
                  step="1"
                  value={steps}
                  onChange={e => setSteps(clampIntRange(Number(e.target.value), 1, NOVELAI_FREE_MAX_STEPS, NOVELAI_FREE_MAX_STEPS))}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 pr-4">
                <span className="
                  text-sm font-semibold text-base-content
                  dark:text-white
                ">{`Prompt Guidance: ${scale}`}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className={`
                      inline-flex h-7 items-center rounded-md border px-2.5
                      text-xs font-semibold transition
                      focus:outline-none focus:ring-2 focus:ring-info/30
                      ${cfgDelay
                        ? "border-transparent bg-info/10 text-info"
                        : "border-transparent bg-base-200 text-base-content/72 hover:text-info dark:text-white/72 dark:hover:text-info"}
                    `}
                    aria-pressed={cfgDelay}
                    title="延后 CFG 介入，提高样本多样性与饱和度"
                    onClick={() => setCfgDelay(!cfgDelay)}
                  >
                    Variety+
                  </button>
                  <button
                    type="button"
                    className={`
                      inline-flex h-7 items-center rounded-md border px-2.5
                      text-xs font-semibold transition
                      focus:outline-none focus:ring-2 focus:ring-info/30
                      ${dynamicThresholding
                        ? "border-transparent bg-info/10 text-info"
                        : "border-transparent bg-base-200 text-base-content/72 hover:text-info dark:text-white/72 dark:hover:text-info"}
                    `}
                    aria-pressed={dynamicThresholding}
                    title="减少高 Guidance 产生的过锐和伪影"
                    onClick={() => setDynamicThresholding(!dynamicThresholding)}
                  >
                    Decrisp
                  </button>
                </div>
              </div>
              <div className="pr-4">
                <RangeInput
                  aria-label="Guidance"
                  density="compact"
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
                <div className="
                  text-sm font-semibold text-base-content
                  dark:text-white
                ">Seed</div>
                <TextInput
                  aria-label="Seed"
                  density="compact"
                  surface="muted"
                  className={`
                    placeholder:text-base-content/28
                    [-moz-appearance:textfield]
                    [&::-webkit-inner-spin-button]:appearance-none
                    [&::-webkit-outer-spin-button]:appearance-none
                      dark:text-white
                    dark:placeholder:text-white/28
                  `}
                  type="number"
                  value={seedIsRandom ? "" : seed}
                  placeholder="输入 seed"
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    setSeed(value ? Number(value) : -1);
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="
                  text-sm font-semibold text-base-content
                  dark:text-white
                ">Sampler</div>
                <SelectInput
                  aria-label="Sampler"
                  density="compact"
                  surface="muted"
                  className="dark:text-white"
                  value={sampler}
                  onChange={e => setSampler(e.target.value)}
                >
                  {samplerOptions.map(s => <option key={s} value={s}>{SAMPLER_LABELS[s] || s}</option>)}
                </SelectInput>
              </div>
            </div>

            <Disclosure
              defaultOpen
              title="Advanced Settings"
              className="border-0 bg-transparent"
              titleClassName="min-h-0 px-0 py-0 pr-12 text-sm font-semibold text-base-content dark:text-white"
              contentClassName="space-y-4 px-0 pb-0 pr-4 pt-4"
            >
                <div className="flex flex-col gap-2">
                  <span className="
                    text-sm font-semibold text-base-content
                    dark:text-white
                  ">{`Prompt Guidance Rescale: ${cfgRescale}`}</span>
                  <div className="pr-4">
                    <RangeInput
                      aria-label="Prompt Guidance Rescale"
                      density="compact"
                      min="0"
                      max="1"
                      step="0.01"
                      value={cfgRescale}
                      onChange={e => setCfgRescale(clampRange(Number(e.target.value), 0, 1, 0))}
                    />
                  </div>
                </div>

                {noiseScheduleOptions.length
                  ? (
                      <div className="flex flex-col gap-2">
                        <span className="
                          text-sm font-semibold text-base-content
                          dark:text-white
                        ">Noise Schedule</span>
                        <SelectInput
                          aria-label="Noise Schedule"
                          density="compact"
                          surface="muted"
                          className="dark:text-white"
                          value={noiseSchedule}
                          onChange={e => setNoiseSchedule(e.target.value)}
                        >
                          {noiseScheduleOptions.map(s => <option key={s} value={s}>{SCHEDULE_LABELS[s] || s}</option>)}
                        </SelectInput>
                      </div>
                    )
                  : null}

            </Disclosure>
          </div>
        </div>
      </div>
    </div>
  );
}
