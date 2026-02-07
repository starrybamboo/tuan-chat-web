import type { AnnotationDefinition } from "@/components/chat/message/annotations/annotationCatalog";
import {
  buildAnnotationMap,
  getAnnotationToneClass,
} from "@/components/chat/message/annotations/annotationCatalog";

interface MessageAnnotationsBarProps {
  annotations?: string[];
  canEdit?: boolean;
  onToggle?: (id: string) => void;
  onOpenPicker?: () => void;
  showWhenEmpty?: boolean;
  alwaysShowAddButton?: boolean;
  className?: string;
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
}: MessageAnnotationsBarProps) {
  const items = Array.isArray(annotations) ? annotations : DEFAULT_ANNOTATIONS;
  const annotationMap = buildAnnotationMap();
  const getToneClass = (def?: AnnotationDefinition) => getAnnotationToneClass(def?.tone ?? "neutral");

  if (!items.length && !(canEdit && showWhenEmpty))
    return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? "mt-2"}`}>
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
          className={`inline-flex items-center justify-center rounded-full border border-dashed border-base-300 px-2 py-0.5 text-xs text-base-content/70 transition-colors hover:border-primary hover:text-primary ${alwaysShowAddButton ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          onClick={onOpenPicker}
          title="添加标注"
        >
          +
        </button>
      )}
    </div>
  );
}
