import type { AnnotationDefinition } from "@/components/chat/message/annotations/annotationCatalog";

import { buildAnnotationMap } from "@/components/chat/message/annotations/annotationCatalog";
import AnnotationChip from "@/components/chat/message/annotations/annotationChip";
import { normalizeAnnotations } from "@/types/messageAnnotations";

type MessageAnnotationsBarProps = {
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
  compactScroll?: boolean;
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
  compactScroll = true,
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
      ${compact ? `
        flex-nowrap gap-0.5
        ${compactScroll ? `overflow-x-auto pb-0.5` : `overflow-visible pb-0`}
      ` : `
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
              group/annotation-add relative -m-1.5 inline-flex items-center
              justify-center rounded-lg p-1.5 transition-opacity select-none
              motion-reduce:transition-none
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-info/35
              ${alwaysShowAddButton ? `opacity-100` : `
                opacity-0
                group-hover:opacity-100
              `}
            `}
            onClick={onOpenPicker}
            title="添加标注"
            aria-label="添加消息标注"
          >
            <span className="
              pointer-events-none inline-flex size-6 items-center justify-center
              rounded-md border border-base-content/12 bg-base-content/4
              text-[11px] text-base-content/60 shadow-none
              transition-[background-color,border-color,color]
              motion-reduce:transition-none
              supports-backdrop-filter:backdrop-blur-md
              group-hover/annotation-add:border-info/38
              group-hover/annotation-add:bg-base-content/7
              group-hover/annotation-add:text-info
            ">
              +
            </span>
          </button>
        </span>
      )}
    </div>
  );
}
