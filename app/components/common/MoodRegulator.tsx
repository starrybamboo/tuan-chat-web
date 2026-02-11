import { memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

export type MoodMap = Record<string, string>;
type MoodNumberMap = Record<string, number>;

interface MoodRegulatorProps {
  value?: MoodMap | null | undefined;
  defaultValue?: MoodMap;
  onChange?: (next: MoodMap) => void;
  disabled?: boolean;
  className?: string;
  // 步进，默认 0.01
  step?: number;
  // 可选：自定义情绪键集合；若不传，则优先使用 value/defaultValue 的键集合；再回退到默认的 8 个键
  labels?: string[];
  // 防抖时间（毫秒）：拖动或输入期间仅在间隔后触发 onChange，默认 400ms
  debounceMs?: number;
  // 编辑锁时间（毫秒）：编辑结束后多长时间内忽略外部受控值回写，默认 300ms
  lockMs?: number;
  // 可选：命令式控制句柄，避免通过 props 传值造成父组件重渲染
  controlRef?: React.Ref<MoodRegulatorHandle>;
  // 当没有 value/defaultValue/labels 时，是否回退到默认 8 项；默认 true
  fallbackDefaultLabels?: boolean;
}

export interface MoodRegulatorHandle {
  // 以字符串 map 形式设置当前值（不触发 onChange）
  setValue: (next: MoodMap) => void;
  // 获取当前字符串 map 值（会按当前 labels 导出）
  getValue: () => MoodMap;
}

const DEFAULT_LABELS: string[] = [
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

function normalizeToNumber(m: MoodMap | null | undefined, labels: string[]): MoodNumberMap {
  const out: MoodNumberMap = {};
  for (const k of labels) {
    const raw = m ? (m as any)[k] : undefined;
    const num = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : 0;
    out[k] = clamp01(Number.isFinite(num) ? num : 0);
  }
  return out;
}

function toApiMap(numMap: MoodNumberMap, labels: string[]): MoodMap {
  const out: MoodMap = {};
  for (const k of labels) {
    const v = numMap[k] ?? 0;
    out[k] = v.toString();
  }
  return out;
}

function MoodRegulator({ value, defaultValue, onChange, disabled, className, step = 0.01, labels, debounceMs = 400, lockMs = 300, controlRef, fallbackDefaultLabels = true }: MoodRegulatorProps) {
  // 计算初始情绪键集合
  const initialLabels = useMemo(() => {
    if (labels && labels.length > 0) {
      return labels;
    }
    const source = value ?? defaultValue;
    const keys = source ? Object.keys(source) : [];
    if (keys.length > 0) {
      return keys;
    }
    return fallbackDefaultLabels ? DEFAULT_LABELS : [];
  }, [labels, value, defaultValue, fallbackDefaultLabels]);

  // 允许在运行期通过 ref.setValue 动态变更 keys
  const [labelKeys, setLabelKeys] = useState<string[]>(initialLabels);

  const initialNumbers = useMemo(() => normalizeToNumber(value ?? defaultValue ?? null, labelKeys), [value, defaultValue, labelKeys]);
  const [inner, setInner] = useState<MoodNumberMap>(initialNumbers);
  // 编辑锁：在用户持续编辑期间，优先以内部 state 为准，忽略外部受控回写
  const editingRef = useRef<boolean>(false);
  const editingTimerRef = useRef<number | null>(null);
  // 防抖定时器与挂起的最新值
  const debounceTimerRef = useRef<number | null>(null);
  const pendingRef = useRef<MoodNumberMap>(initialNumbers);
  // 通过命令式 setValue 写入时，屏蔽下一次由 props 触发的同步覆盖
  const manualSetRef = useRef<boolean>(false);

  // 当 prop 驱动的键集合或受控值变化时，与之对齐（未处于编辑）
  useEffect(() => {
    if (labels && labels.length > 0) {
      setLabelKeys(labels);
    }
    else if (!labels) {
      const source = value ?? defaultValue;
      const keys = source ? Object.keys(source) : [];
      if (keys.length > 0) {
        setLabelKeys(keys);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels]);

  useEffect(() => {
    if (manualSetRef.current) {
      // 跳过一次由 setValue 后的 props 同步，避免覆盖手动写入的值
      manualSetRef.current = false;
      return;
    }
    if (value == null) {
      setInner(initialNumbers);
    }
    else if (!editingRef.current) {
      setInner(initialNumbers);
    }
  }, [initialNumbers, value]);

  // 卸载时清理定时器
  useEffect(() => () => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (editingTimerRef.current) {
      window.clearTimeout(editingTimerRef.current);
      editingTimerRef.current = null;
    }
  }, []);

  // 受控：以 value 为准；非受控：以内部 state 为准
  const effective = value && !editingRef.current ? normalizeToNumber(value, labelKeys) : inner;

  const handleChange = (key: string, next: number) => {
    const fixed = toFixedStep(next, step);
    const nextNumberMap: MoodNumberMap = { ...effective, [key]: fixed };

    setInner(nextNumberMap);
    pendingRef.current = nextNumberMap;

    editingRef.current = true;
    if (editingTimerRef.current) {
      window.clearTimeout(editingTimerRef.current);
      editingTimerRef.current = null;
    }
    editingTimerRef.current = window.setTimeout(() => {
      editingRef.current = false;
      editingTimerRef.current = null;
    }, lockMs);

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      onChange?.(toApiMap(pendingRef.current, labelKeys));
    }, debounceMs);
  };

  // 暴露命令式 API，避免通过 props 传值导致父变更引起重渲染
  useImperativeHandle(controlRef, () => ({
    setValue: (next: MoodMap) => {
      const keys = Object.keys(next ?? {});
      if (keys.length > 0) {
        setLabelKeys(keys);
      }
      const normalized = normalizeToNumber(next ?? null, keys.length > 0 ? keys : labelKeys);
      setInner(normalized);
      pendingRef.current = normalized;
      manualSetRef.current = true;
    },
    getValue: () => toApiMap(effective, labelKeys),
  }), [effective, labelKeys]);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4  bg-base-100 p-4 rounded-md">
        {labelKeys.map((k) => {
          const v = effective[k] ?? 0;
          return (
            <div key={k} className="px-4 py-2">
              <div className="flex items-center gap-3">
                <span className="font-medium w-8 inline-block text-center">{k}</span>
                <input
                  type="range"
                  className="range range-xs range-info flex-1"
                  min={0}
                  max={1}
                  step={step}
                  value={v}
                  disabled={disabled}
                  onChange={e => handleChange(k, Number(e.target.value))}
                />

                <input
                  type="number"
                  min={0}
                  max={1}
                  step={step}
                  value={v}
                  disabled={disabled}
                  onChange={e => handleChange(k, Number(e.target.value))}
                  onBlur={e => handleChange(k, Number(e.target.value))}
                  className="input input-sm bg-transparent w-auto rounded-md text-left focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 记忆以避免父级轻微变更导致不必要重渲染
export default memo(MoodRegulator);
