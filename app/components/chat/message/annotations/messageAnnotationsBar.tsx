import type { AnnotationDefinition } from "@/components/chat/message/annotations/annotationCatalog";
import { buildAnnotationMap } from "@/components/chat/message/annotations/annotationCatalog";
import AnnotationChip from "@/components/chat/message/annotations/annotationChip";
import { normalizeAnnotations } from "@/types/messageAnnotations";

interface MessageAnnotationsBarProps {
  annotations?: string[];
  canEdit?: boolean;
  onToggle?: (id: string) => void;
  onOpenPicker?: () => void;
  showWhenEmpty?: boolean;
  alwaysShowAddButton?: boolean;
  className?: string;
  compact?: boolean;
}

const DEFAULT_ANNOTATIONS: string[] = [];

export default function MessageAnnotationsBar({
  annotations = DEFAULT_ANNOTATIONS,
  canEdit = false,
  onToggle,
  onOpenPicker,
  showWhenEmpty = false,
  alwaysShowAddButton = false,
  className,
  compact = false,
}: MessageAnnotationsBarProps) {
  const items = Array.from(new Set(normalizeAnnotations(annotations)));
  const annotationMap = buildAnnotationMap();

  if (!items.length && !(canEdit && showWhenEmpty))
    return null;

  return (
    <div className={`flex items-center ${compact ? "flex-nowrap gap-1 overflow-x-auto pb-0.5" : "flex-wrap gap-1.5"} ${className ?? "mt-2"}`}>
      {items.map((id) => {
        const annotation: AnnotationDefinition = annotationMap.get(id) ?? { id, label: id, tone: "neutral" };
        return (
          <AnnotationChip
            key={id}
            annotation={annotation}
            active={true}
            interactive={canEdit}
            compact={compact}
            onClick={canEdit ? () => onToggle?.(id) : undefined}
          />
        );
      })}
      {canEdit && (
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-full border border-dashed border-base-300 ${compact ? "px-1.5 py-0 text-[11px] h-6 min-h-6" : "px-2 py-0.5 text-xs"} text-base-content/70 transition-colors hover:border-primary hover:text-primary ${alwaysShowAddButton ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          onClick={onOpenPicker}
          title="添加标注"
        >
          +
        </button>
      )}
    </div>
  );
}
