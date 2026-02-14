import type { AnnotationDefinition } from "@/components/chat/message/annotations/annotationCatalog";
import {
  buildAnnotationMap,
  getAnnotationToneClass,
} from "@/components/chat/message/annotations/annotationCatalog";
import { normalizeAnnotations } from "@/types/messageAnnotations";

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
  const items = Array.from(new Set(normalizeAnnotations(annotations)));
  const annotationMap = buildAnnotationMap();
  const getToneClass = (def?: AnnotationDefinition) => getAnnotationToneClass(def?.tone ?? "neutral");
  const getFigureToneClass = (def?: AnnotationDefinition) => {
    const tone = def?.tone ?? "neutral";
    const toneStyles: Record<string, string> = {
      neutral: "border-base-300/40 bg-base-200/70 text-base-content/70",
      info: "border-info/30 bg-info/15 text-info",
      success: "border-success/30 bg-success/15 text-success",
      warning: "border-warning/30 bg-warning/15 text-warning",
      accent: "border-accent/30 bg-accent/15 text-accent",
      primary: "border-primary/30 bg-primary/15 text-primary",
    };
    return toneStyles[tone] ?? toneStyles.neutral;
  };

  if (!items.length && !(canEdit && showWhenEmpty))
    return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? "mt-2"}`}>
      {items.map((id) => {
        const def = annotationMap.get(id);
        const label = def?.label ?? id;
        const Icon = def?.icon;
        const showLabel = !def?.hideLabel;
        const isFigure = def?.category === "立绘";
        const isAction = def?.category === "动作";
        const isFigureLike = isFigure || isAction;
        const isImage = def?.category === "图片";
        const isEffect = def?.category === "特效" && Boolean(def?.iconUrl);
        return (
          <button
            key={id}
            type="button"
            className={
              isFigureLike
                ? `inline-flex items-center justify-center w-10 h-9 rounded-md border transition-colors ${getFigureToneClass(def)}`
                : isImage
                  ? "inline-flex items-center gap-1 rounded-full border border-base-300 bg-transparent px-2 py-0.5 text-xs text-base-content/70 transition-colors hover:border-base-400"
                  : isEffect
                    ? "inline-flex items-center justify-center w-10 h-9 rounded-md border border-base-300 bg-transparent text-base-content/70 transition-colors hover:border-base-400"
                    : `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${getToneClass(def)}`
            }
            onClick={() => canEdit && onToggle?.(id)}
            title={label}
          >
            {Icon && (
              <Icon className={isFigureLike ? "w-5 h-5" : "w-3.5 h-3.5"} aria-hidden="true" />
            )}
            {!Icon && def?.iconUrl && (
              <img src={def.iconUrl} alt="" className={isEffect ? "w-6 h-6 object-contain" : "w-3.5 h-3.5 rounded-sm"} />
            )}
            {showLabel
              ? (
                  <span className={isFigure ? "text-xs font-semibold leading-none" : "truncate max-w-[120px]"}>
                    {label}
                  </span>
                )
              : (
                  <span className="sr-only">{label}</span>
                )}
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
