import { useMemo, useState } from "react";

export type MoodKeys = "喜" | "怒" | "哀" | "惧" | "厌恶" | "低落" | "惊喜" | "平静";
export type MoodMap = Record<MoodKeys, number>;

export interface MoodRegulatorProps {
  value?: MoodMap | null | undefined;
  defaultValue?: MoodMap;
  onChange?: (next: MoodMap) => void;
  disabled?: boolean;
  className?: string;
  // 步进，默认 0.01
  step?: number;
}

const MOOD_LABELS: MoodKeys[] = [
  "喜",
  "怒",
  "哀",
  "惧",
  "厌恶",
  "低落",
  "惊喜",
  "平静",
];

function clamp01(v: number) {
  if (Number.isNaN(v)) {
    return 0;
  }
  return Math.max(0, Math.min(1, v));
}

function toFixedStep(v: number, step: number) {
  // 保障精度：按 step 量化，再限制到两位小数显示
  const q = Math.round(v / step) * step;
  const fixed = Number(q.toFixed(2));
  return clamp01(fixed);
}

function normalize(m?: MoodMap | null): MoodMap {
  const zero: MoodMap = {
    喜: 0,
    怒: 0,
    哀: 0,
    惧: 0,
    厌恶: 0,
    低落: 0,
    惊喜: 0,
    平静: 0,
  };
  if (!m) {
    return zero;
  }
  const out: Partial<MoodMap> = {};
  for (const k of MOOD_LABELS) {
    const raw = (m as any)[k];
    out[k] = clamp01(typeof raw === "number" ? raw : 0);
  }
  return out as MoodMap;
}

function MoodRegulator({ value, defaultValue, onChange, disabled, className, step = 0.01 }: MoodRegulatorProps) {
  const initial = useMemo(() => normalize(value ?? defaultValue ?? null), [value, defaultValue]);
  const [inner, setInner] = useState<MoodMap>(initial);

  // 受控：以 value 为准；非受控：以内部 state 为准
  const effective = value ? normalize(value) : inner;

  const handleChange = (key: MoodKeys, next: number) => {
    const fixed = toFixedStep(next, step);
    const nextMap: MoodMap = { ...effective, [key]: fixed } as MoodMap;
    if (value == null) {
      setInner(nextMap);
    }
    onChange?.(nextMap);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4">
        {MOOD_LABELS.map((k) => {
          const v = effective[k] ?? 0;
          return (
            <div key={k} className="card bg-base-200 shadow px-4 py-3">
              <div className="flex items-center justify-between mb-2 gap-3">
                <span className="font-medium">{k}</span>
                <div className="flex items-center gap-2">
                  <div className="badge badge-ghost hidden sm:flex">
                    {v.toFixed(2)}
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={step}
                    value={v}
                    disabled={disabled}
                    onChange={e => handleChange(k, Number(e.target.value))}
                    onBlur={e => handleChange(k, Number(e.target.value))}
                    className="input input-sm input-bordered w-20 text-left"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs opacity-60 select-none">0</span>
                <input
                  type="range"
                  className="range range-sm flex-1"
                  min={0}
                  max={1}
                  step={step}
                  value={v}
                  disabled={disabled}
                  onChange={e => handleChange(k, Number(e.target.value))}
                />
                <span className="text-xs opacity-60">1.0</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MoodRegulator;
