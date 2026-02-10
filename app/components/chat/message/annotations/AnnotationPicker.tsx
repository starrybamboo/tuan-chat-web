import type { AnnotationDefinition } from "@/components/chat/message/annotations/annotationCatalog";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  buildCustomAnnotationId,
  getFrequentAnnotations,
  loadAnnotationUsage,
  loadCustomAnnotations,
  mergeAnnotationCatalog,
  recordAnnotationUsage,
  saveCustomAnnotations,
} from "@/components/chat/message/annotations/annotationCatalog";

interface AnnotationPickerProps {
  initialSelected?: string[];
  onChange?: (next: string[]) => void;
  onClose?: () => void;
}

function existsByLabel(catalog: AnnotationDefinition[], label: string, category?: string) {
  const target = label.trim();
  if (!target)
    return true;
  return catalog.some(item => item.label === target && (item.category ?? "") === (category ?? ""));
}

const DEFAULT_SELECTED: string[] = [];

export default function AnnotationPicker({ initialSelected = DEFAULT_SELECTED, onChange, onClose }: AnnotationPickerProps) {
  const [catalog, setCatalog] = useState<AnnotationDefinition[]>([]);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [customLabel, setCustomLabel] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  useEffect(() => {
    setCatalog(mergeAnnotationCatalog());
    setUsage(loadAnnotationUsage());
  }, []);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const _frequentAnnotations = useMemo(() => {
    return getFrequentAnnotations(catalog, usage);
  }, [catalog, usage]);

  const categorized = useMemo(() => {
    const grouped = new Map<string, AnnotationDefinition[]>();
    catalog.forEach((item) => {
      const key = item.category || "未分类";
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    });
    return Array.from(grouped.entries()).map(([category, items]) => ({ category, items }));
  }, [catalog]);

  const applySelection = useCallback((next: string[]) => {
    setSelected(next);
    onChange?.(next);
  }, [onChange]);

  const handleToggle = useCallback((id: string) => {
    const has = selectedSet.has(id);
    const next = has ? selected.filter(item => item !== id) : [...selected, id];
    applySelection(next);
    if (!has) {
      recordAnnotationUsage(id);
      setUsage(loadAnnotationUsage());
    }
  }, [applySelection, selected, selectedSet]);

  const _handleAddCustom = useCallback(() => {
    const label = customLabel.trim();
    if (!label) {
      toast.error("请输入标注名称");
      return;
    }
    const category = customCategory.trim() || "自定义";
    if (existsByLabel(catalog, label, category)) {
      toast.error("标注已存在");
      return;
    }
    const existingIds = new Set(catalog.map(item => item.id));
    const id = buildCustomAnnotationId(label, existingIds);
    const newItem: AnnotationDefinition = {
      id,
      label,
      category,
      source: "custom",
    };
    const nextCustom = [...loadCustomAnnotations(), newItem];
    saveCustomAnnotations(nextCustom);
    const nextCatalog = mergeAnnotationCatalog(nextCustom);
    setCatalog(nextCatalog);
    setCustomLabel("");
    setCustomCategory("");
    const nextSelected = selectedSet.has(id) ? selected : [...selected, id];
    applySelection(nextSelected);
    recordAnnotationUsage(id);
    setUsage(loadAnnotationUsage());
  }, [applySelection, catalog, customCategory, customLabel, selected, selectedSet]);

  const renderTableChip = useCallback((item: AnnotationDefinition) => {
    const isActive = selectedSet.has(item.id);
    const Icon = item.icon;
    const hasLabel = !item.hideLabel;
    const hasImage = Boolean(item.iconUrl);
    const isEffect = item.category === "特效" && hasImage;
    const sizeClass = hasLabel ? "px-3 min-w-[52px]" : "w-10";
    const base = `inline-flex items-center justify-center h-9 rounded-md border transition-all active:scale-95 select-none ${sizeClass}`;
    const tone = item.tone ?? "neutral";
    const toneStyles: Record<string, string> = {
      neutral: "border-base-300/40 bg-base-200/70 text-base-content/70 hover:bg-base-300/70 hover:text-base-content",
      info: "border-info/30 bg-info/15 text-info hover:bg-info/20",
      success: "border-success/30 bg-success/15 text-success hover:bg-success/20",
      warning: "border-warning/30 bg-warning/15 text-warning hover:bg-warning/20",
      accent: "border-accent/30 bg-accent/15 text-accent hover:bg-accent/20",
      primary: "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20",
    };
    const activeStyle = isActive
      ? "ring-2 ring-primary/30 shadow-sm"
      : "";
    const toneStyle = isEffect
      ? "border-base-300/60 bg-transparent text-base-content/70 hover:border-base-400"
      : (toneStyles[tone] ?? toneStyles.neutral);
    return (
      <button
        key={item.id}
        type="button"
        className={`${base} ${toneStyle} ${activeStyle}`}
        onClick={() => handleToggle(item.id)}
        title={item.label}
      >
        {Icon
          ? (
              <Icon className="w-5 h-5" aria-hidden="true" />
            )
          : hasImage
            ? (
                <img src={item.iconUrl} alt="" className={isEffect ? "w-7 h-7 object-contain" : "w-6 h-6 object-contain"} />
              )
            : hasLabel
              ? (
                  <span className="text-xs font-semibold leading-none whitespace-nowrap">{item.label}</span>
                )
              : (
                  <span className="sr-only">{item.label}</span>
                )}
      </button>
    );
  }, [handleToggle, selectedSet]);

  return (
    <div className="w-[640px] max-w-[95vw] p-5 flex flex-col max-h-[85vh]">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold text-base-content">消息标注</div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-5 custom-scrollbar">
        {categorized.map(({ category, items }) => (
          <div key={category}>
            <div className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2.5">{category}</div>
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-base-200/60 p-2">
              {items.map(item => renderTableChip(item))}
            </div>
          </div>
        ))}

        {categorized.length === 0 && (
          <div className="py-8 text-center text-sm text-base-content/40">
            没有匹配的标注
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="btn btn-neutral rounded-xl px-6 min-w-[80px]"
          onClick={onClose}
        >
          完成
        </button>
      </div>
    </div>
  );
}
