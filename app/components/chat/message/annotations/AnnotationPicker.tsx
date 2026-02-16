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
import AnnotationChip from "@/components/chat/message/annotations/annotationChip";
import { normalizeAnnotations } from "@/types/messageAnnotations";

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
const normalizeSelected = (list: string[] | undefined) => Array.from(new Set(normalizeAnnotations(list)));

export default function AnnotationPicker({ initialSelected = DEFAULT_SELECTED, onChange, onClose }: AnnotationPickerProps) {
  const [catalog, setCatalog] = useState<AnnotationDefinition[]>([]);
  const [selected, setSelected] = useState<string[]>(() => normalizeSelected(initialSelected));
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [customLabel, setCustomLabel] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  useEffect(() => {
    setCatalog(mergeAnnotationCatalog());
    setUsage(loadAnnotationUsage());
  }, []);

  useEffect(() => {
    setSelected(normalizeSelected(initialSelected));
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
    const normalized = normalizeSelected(next);
    setSelected(normalized);
    onChange?.(normalized);
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
              {items.map(item => (
                <AnnotationChip
                  key={item.id}
                  annotation={item}
                  active={selectedSet.has(item.id)}
                  onClick={() => handleToggle(item.id)}
                />
              ))}
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
