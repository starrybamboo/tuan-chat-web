import type { AnnotationDefinition, AnnotationTone } from "@/components/chat/message/annotations/annotationCatalog";

interface AnnotationChipProps {
  annotation: AnnotationDefinition;
  active?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}

const TONE_STYLES: Record<AnnotationTone, string> = {
  neutral: "border-base-300/40 bg-base-200/70 text-base-content/70 hover:bg-base-300/70 hover:text-base-content",
  info: "border-info/30 bg-info/15 text-info hover:bg-info/20",
  success: "border-success/30 bg-success/15 text-success hover:bg-success/20",
  warning: "border-warning/30 bg-warning/15 text-warning hover:bg-warning/20",
  accent: "border-accent/30 bg-accent/15 text-accent hover:bg-accent/20",
  primary: "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20",
};

function getToneClass(annotation: AnnotationDefinition) {
  const hasImage = Boolean(annotation.iconUrl);
  const isEffect = annotation.category === "特效" && hasImage;
  if (isEffect) {
    return "border-base-300/60 bg-transparent text-base-content/70 hover:border-base-400";
  }
  return TONE_STYLES[annotation.tone ?? "neutral"] ?? TONE_STYLES.neutral;
}

export default function AnnotationChip({
  annotation,
  active = false,
  interactive = true,
  onClick,
}: AnnotationChipProps) {
  const Icon = annotation.icon;
  const hasLabel = !annotation.hideLabel;
  const hasImage = Boolean(annotation.iconUrl);
  const isEffect = annotation.category === "特效" && hasImage;
  const sizeClass = hasLabel ? "px-3 min-w-[52px]" : "w-10";
  const interactiveClass = interactive ? "active:scale-95" : "";
  const activeClass = active ? "ring-2 ring-primary/30 shadow-sm" : "";

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center h-9 rounded-md border transition-all select-none ${sizeClass} ${interactiveClass} ${getToneClass(annotation)} ${activeClass}`}
      onClick={onClick}
      title={annotation.label}
    >
      {Icon
        ? (
            <Icon className="w-5 h-5" aria-hidden="true" />
          )
        : hasImage
          ? (
              <img src={annotation.iconUrl} alt="" className={isEffect ? "w-7 h-7 object-contain" : "w-6 h-6 object-contain"} />
            )
          : hasLabel
            ? (
                <span className="text-xs font-semibold leading-none whitespace-nowrap">{annotation.label}</span>
              )
            : (
                <span className="sr-only">{annotation.label}</span>
              )}
    </button>
  );
}
