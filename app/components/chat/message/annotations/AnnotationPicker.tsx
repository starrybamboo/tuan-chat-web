import type { AnnotationDefinition, AnnotationTone } from "@/components/chat/message/annotations/annotationCatalog";
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

function getToneStyles(tone?: AnnotationTone, active?: boolean) {
  if (active) {
    return "bg-primary text-primary-content border-primary shadow-md";
  }
  switch (tone) {
    case "info": return "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800";
    case "success": return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
    case "warning": return "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    case "accent": return "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800";
    case "primary": return "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20";
    case "neutral":
    default: return "bg-base-200 text-base-content/80 border-base-300 hover:bg-base-300";
  }
}

const DEFAULT_SELECTED: string[] = [];

export default function AnnotationPicker({ initialSelected = DEFAULT_SELECTED, onChange, onClose }: AnnotationPickerProps) {
  const [catalog, setCatalog] = useState<AnnotationDefinition[]>([]);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [search, setSearch] = useState("");
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

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCatalog = useMemo(() => {
    if (!normalizedSearch)
      return catalog;
    return catalog.filter((item) => {
      const text = `${item.label} ${item.id} ${item.category ?? ""}`.toLowerCase();
      return text.includes(normalizedSearch);
    });
  }, [catalog, normalizedSearch]);

  const _frequentAnnotations = useMemo(() => {
    if (normalizedSearch)
      return [];
    return getFrequentAnnotations(catalog, usage);
  }, [catalog, normalizedSearch, usage]);

  const categorized = useMemo(() => {
    const grouped = new Map<string, AnnotationDefinition[]>();
    filteredCatalog.forEach((item) => {
      const key = item.category || "未分类";
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    });
    return Array.from(grouped.entries()).map(([category, items]) => ({ category, items }));
  }, [filteredCatalog]);

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

  const renderChip = useCallback((item: AnnotationDefinition) => {
    const isActive = selectedSet.has(item.id);
    const base = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 select-none";
    const styles = getToneStyles(item.tone, isActive);

    return (
      <button
        key={item.id}
        type="button"
        className={`${base} ${styles}`}
        onClick={() => handleToggle(item.id)}
        title={item.label}
      >
        {item.iconUrl && (
          <img src={item.iconUrl} alt="" className="w-3.5 h-3.5 rounded-sm object-cover" />
        )}
        <span className="truncate max-w-[120px]">{item.label}</span>
      </button>
    );
  }, [handleToggle, selectedSet]);

  return (
    <div className="w-[480px] max-w-[95vw] p-5 flex flex-col max-h-[85vh]">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold text-base-content">消息标注</div>
      </div>

      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          className="input input-bordered w-full pl-9 rounded-2xl bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          placeholder="搜索标注或分类"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-5 custom-scrollbar">
        {categorized.map(({ category, items }) => (
          <div key={category}>
            <div className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2.5">{category}</div>
            <div className="flex flex-wrap gap-2">
              {items.map(item => renderChip(item))}
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
