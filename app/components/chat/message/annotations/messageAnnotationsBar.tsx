import type { AnnotationDefinition, AnnotationTone } from "@/components/chat/message/annotations/annotationCatalog";
import {

  buildAnnotationMap,
} from "@/components/chat/message/annotations/annotationCatalog";

interface MessageAnnotationsBarProps {
  annotations?: string[];
  canEdit?: boolean;
  onToggle?: (id: string) => void;
  onOpenPicker?: () => void;
}

const DEFAULT_ANNOTATIONS: string[] = [];

export default function MessageAnnotationsBar({
  annotations = DEFAULT_ANNOTATIONS,
  canEdit = false,
  onToggle,
  onOpenPicker,
}: MessageAnnotationsBarProps) {
  const items = Array.isArray(annotations) ? annotations : DEFAULT_ANNOTATIONS;
  const annotationMap = buildAnnotationMap();
  const toneStyles: Record<AnnotationTone, string> = {
    neutral: "border-base-300 bg-base-200/70 text-base-content/80 hover:bg-base-300",
    info: "border-info/30 bg-info/15 text-info hover:bg-info/20",
    success: "border-success/30 bg-success/15 text-success hover:bg-success/20",
    warning: "border-warning/30 bg-warning/15 text-warning hover:bg-warning/20",
    accent: "border-accent/30 bg-accent/15 text-accent hover:bg-accent/20",
    primary: "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20",
  };
  const getToneClass = (def?: AnnotationDefinition) => {
    const tone = def?.tone ?? "neutral";
    return toneStyles[tone] ?? toneStyles.neutral;
  };

  if (!items.length)
    return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {items.map((id) => {
        const def = annotationMap.get(id);
        const label = def?.label ?? id;
        return (
          <button
            key={id}
            type="button"
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${getToneClass(def)}`}
            onClick={() => canEdit && onToggle?.(id)}
            title={label}
          >
            {def?.iconUrl && (
              <img src={def.iconUrl} alt="" className="w-3.5 h-3.5 rounded-sm" />
            )}
            <span className="truncate max-w-[120px]">{label}</span>
          </button>
        );
      })}
      {canEdit && (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-dashed border-base-300 px-2 py-0.5 text-xs text-base-content/70 transition-colors hover:border-primary hover:text-primary opacity-0 group-hover:opacity-100"
          onClick={onOpenPicker}
          title="添加标注"
        >
          +
        </button>
      )}
    </div>
  );
}
