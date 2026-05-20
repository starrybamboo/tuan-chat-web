import type { AnnotationDefinition } from "@/components/chat/message/annotations/annotationCatalog";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadAnnotationUsage,
  mergeAnnotationCatalog,
  recordAnnotationUsage,
} from "@/components/chat/message/annotations/annotationCatalog";
import AnnotationChip from "@/components/chat/message/annotations/annotationChip";
import { reactionPanelMotionProps } from "@/components/common/motion/chatMessageMotion";
import { normalizeAnnotations } from "@/types/messageAnnotations";

interface AnnotationPickerProps {
  initialSelected?: string[];
  onChange?: (next: string[]) => void;
  onClose?: () => void;
}

const DEFAULT_SELECTED: string[] = [];
const normalizeSelected = (list: string[] | undefined) => Array.from(new Set(normalizeAnnotations(list)));

export default function AnnotationPicker({ initialSelected = DEFAULT_SELECTED, onChange, onClose }: AnnotationPickerProps) {
  const [catalog, setCatalog] = useState<AnnotationDefinition[]>([]);
  const [selected, setSelected] = useState<string[]>(() => normalizeSelected(initialSelected));

  useEffect(() => {
    setCatalog(mergeAnnotationCatalog());
    void loadAnnotationUsage();
  }, []);

  useEffect(() => {
    setSelected(normalizeSelected(initialSelected));
  }, [initialSelected]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

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
      void loadAnnotationUsage();
    }
  }, [applySelection, selected, selectedSet]);

  return (
    <motion.div className="w-[640px] max-w-[95vw] p-5 flex flex-col max-h-[85vh] overflow-hidden" {...reactionPanelMotionProps}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold text-base-content">消息标注</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-2 -mr-2 space-y-5 custom-scrollbar">
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
    </motion.div>
  );
}
