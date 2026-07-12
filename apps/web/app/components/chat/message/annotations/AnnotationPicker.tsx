import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AnnotationDefinition } from "@/components/chat/message/annotations/annotationCatalog";

import {
  filterAnnotationsForMessageType,
  loadAnnotationUsage,
  mergeAnnotationCatalog,
  recordAnnotationUsage,
} from "@/components/chat/message/annotations/annotationCatalog";
import AnnotationChip from "@/components/chat/message/annotations/annotationChip";
import { buildAnnotationPickerSections } from "@/components/chat/message/annotations/annotationPickerLayout";
import { Button } from "@/components/common/Button";
import { reactionPanelMotionProps } from "@/components/common/motion/chatMessageMotion";
import PortalTooltip from "@/components/common/portalTooltip";
import { normalizeAnnotations } from "@/types/messageAnnotations";

type AnnotationPickerProps = {
  initialSelected?: string[];
  messageType?: number | null;
  onChange?: (next: string[]) => void;
  onClose?: () => void;
}

const DEFAULT_SELECTED: string[] = [];
const SECTION_TOOLTIP_DELAY_MS = 450;
const normalizeSelected = (list: string[] | undefined) => Array.from(new Set(normalizeAnnotations(list)));

function AnnotationPickerLabelTooltip({ label, description, className }: { label: string; description?: string; className?: string }) {
  if (!description) {
    return <>{label}</>;
  }
  return (
    <PortalTooltip
      label={description}
      placement="right"
      gap={10}
      delayMs={SECTION_TOOLTIP_DELAY_MS}
      className="
        portal-tooltip pointer-events-none z-[9999] max-w-[260px]
        rounded-lg border border-base-content/12 bg-base-100 px-2.5
        py-2 text-[11px] leading-4 text-base-content/78
        shadow-xl shadow-black/25
      "
    >
      <span
        className={className ?? `
          cursor-help decoration-dotted underline-offset-2
          hover:text-base-content/75 focus-visible:outline-none
          focus-visible:text-base-content/75 focus-visible:ring-2 focus-visible:ring-info/30
        `}
        tabIndex={0}
      >
        {label}
      </span>
    </PortalTooltip>
  );
}

export default function AnnotationPicker({ initialSelected = DEFAULT_SELECTED, messageType, onChange, onClose }: AnnotationPickerProps) {
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
  const visibleCatalog = useMemo(() => filterAnnotationsForMessageType(catalog, messageType), [catalog, messageType]);
  const sections = useMemo(() => buildAnnotationPickerSections(visibleCatalog, messageType), [messageType, visibleCatalog]);
  const sectionGroups = useMemo(() => {
    return sections.reduce<Array<{
      key: string;
      group: string;
      groupDescription?: string;
      sections: typeof sections;
    }>>((groups, section) => {
      const group = section.group ?? "其他";
      const previous = groups[groups.length - 1];
      if (previous?.group === group) {
        previous.sections.push(section);
        return groups;
      }
      groups.push({
        key: `${group}:${section.key}`,
        group,
        groupDescription: section.groupDescription,
        sections: [section],
      });
      return groups;
    }, []);
  }, [sections]);
  const annotationMap = useMemo(() => new Map(catalog.map(item => [item.id, item])), [catalog]);
  const selectedAnnotations = useMemo(() => selected.map((id) => {
    return annotationMap.get(id) ?? {
      id,
      label: id,
      tone: "neutral" as const,
      showInNormalMode: true,
    };
  }), [annotationMap, selected]);

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
    <motion.div className="
      w-[680px] max-w-[95vw] p-5 flex flex-col max-h-[85vh] overflow-hidden
    " {...reactionPanelMotionProps}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-bold text-base-content">消息标注</div>
        </div>
      </div>

      <div className="
        min-h-0 flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 custom-scrollbar
      ">
        {sectionGroups.map(group => (
          <section
            key={group.key}
            className="
              grid grid-cols-[40px_minmax(0,1fr)] gap-1.5
              sm:grid-cols-[42px_minmax(0,1fr)]
            "
          >
            <div className="flex items-start justify-end pt-1">
              <AnnotationPickerLabelTooltip
                label={group.group}
                description={group.groupDescription}
                className="
                  inline-flex min-w-9 justify-center rounded-md
                  border border-base-content/10 bg-base-content/5 px-1.5 py-1
                  text-[11px] font-semibold leading-none text-base-content/50
                  hover:border-base-content/18 hover:bg-base-content/8
                  hover:text-base-content/70 focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-info/35
                "
              />
            </div>

            <div className="space-y-1">
              {group.sections.map(section => (
                <div
                  key={section.key}
                  className="
                    grid grid-cols-[40px_minmax(0,1fr)] items-center gap-1.5
                    rounded-md bg-base-200/30 px-2 py-1.5
                    sm:grid-cols-[46px_minmax(0,1fr)]
                  "
                >
                  <div className="text-right text-[11px] font-semibold leading-5 text-base-content/52">
                    <AnnotationPickerLabelTooltip
                      label={section.title}
                      description={section.description}
                    />
                  </div>
                  <div className="flex min-h-6 flex-wrap items-center gap-1.5">
                    {section.items.map(item => (
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
            </div>
          </section>
        ))}

        {sections.length === 0 && (
            <div className="
              rounded-lg bg-base-200/38 py-8 text-center text-sm text-base-content/50
            ">
              没有匹配的标注
            </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-base-content/8 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 text-xs font-semibold text-base-content/50">当前</div>
          <div className="flex max-h-16 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {selectedAnnotations.length > 0
              ? selectedAnnotations.map(annotation => (
                  <AnnotationChip
                    key={annotation.id}
                    annotation={annotation}
                    active={true}
                    interactive={false}
                    subtle={true}
                    showActiveHighlight={false}
                  />
                ))
              : (
                  <span className="text-xs text-base-content/50">无</span>
                )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-w-[80px] rounded-xl border-base-300 px-6 text-base-content hover:border-base-content/30 hover:bg-base-200/60"
          onClick={onClose}
          aria-label="完成标注选择并关闭面板"
        >
          完成
        </Button>
      </div>
    </motion.div>
  );
}
