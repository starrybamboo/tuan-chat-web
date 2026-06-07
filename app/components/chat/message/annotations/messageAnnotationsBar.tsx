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
  showAddButton?: boolean;
  showNormalModeAnnotationsOnly?: boolean;
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
  showAddButton = true,
  showNormalModeAnnotationsOnly = false,
  className,
  compact = false,
}: MessageAnnotationsBarProps) {
  const items = Array.from(new Set(normalizeAnnotations(annotations)));
  const annotationMap = buildAnnotationMap();
  const renderedItems = items
    .map((id) => {
      const annotation: AnnotationDefinition = annotationMap.get(id) ?? {
        id,
        label: id,
        tone: "neutral",
        showInNormalMode: true,
      };
      return { id, annotation };
    })
    .filter(({ annotation }) => !showNormalModeAnnotationsOnly || annotation.showInNormalMode);
  const canShowAddButton = canEdit && showAddButton;

  if (!renderedItems.length && !(canShowAddButton && showWhenEmpty))
    return null;

  return (
    <div className={`
      flex items-center
      ${compact ? `flex-nowrap gap-0.5 overflow-x-auto pb-0.5` : `
        flex-wrap gap-0.5
      `}
      ${className ?? `mt-2`}
    `}>
      {renderedItems.map(({ id, annotation }) => {
        return (
          <span
            key={id}
            className="inline-flex"
          >
            <AnnotationChip
              annotation={annotation}
              active={true}
              interactive={canEdit}
              showActiveHighlight={false}
              subtle={true}
              onClick={canEdit ? () => onToggle?.(id) : undefined}
            />
          </span>
        );
      })}
      {canShowAddButton && (
        <span className="inline-flex">
          <button
            type="button"
            className={`
              inline-flex h-6 w-6 items-center justify-center rounded-md border
              text-[11px] transition-all select-none shadow-none
              supports-[backdrop-filter]:backdrop-blur-md
              border-base-content/12 bg-base-content/4 text-base-content/60
              hover:border-primary/38 hover:bg-base-content/7 hover:text-primary
              ${alwaysShowAddButton ? `opacity-100` : `
                opacity-0
                group-hover:opacity-100
              `}
            `}
            onClick={onOpenPicker}
            title="添加标注"
          >
            +
          </button>
        </span>
      )}
    </div>
  );
}
