import type { AnnotationDefinition, AnnotationTone } from "@/components/chat/message/annotations/annotationCatalog";

interface AnnotationChipProps {
  annotation: AnnotationDefinition;
  active?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  compact?: boolean;
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
  compact = false,
}: AnnotationChipProps) {
  const Icon = annotation.icon;
  const hasLabel = !annotation.hideLabel;
  const hasImage = Boolean(annotation.iconUrl);
  const isEffect = annotation.category === "特效" && hasImage;
  const isFigurePositionTag = annotation.id.startsWith("figure.pos.");
  const sizeClass = hasLabel
    ? (isFigurePositionTag ? (compact ? "px-1.5 min-w-[28px]" : "px-2 min-w-[36px]") : (compact ? "px-2 min-w-[40px]" : "px-3 min-w-[52px]"))
    : (compact ? "w-8" : "w-10");
  const interactiveClass = interactive ? "active:scale-95" : "";
  const activeClass = active ? "ring-2 ring-primary/30 shadow-sm" : "";

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center ${compact ? "h-7" : "h-9"} rounded-md border transition-all select-none ${sizeClass} ${interactiveClass} ${getToneClass(annotation)} ${activeClass}`}
      onClick={onClick}
      title={annotation.label}
    >
      {Icon
        ? (
            <Icon className={compact ? "w-4 h-4" : "w-5 h-5"} aria-hidden="true" />
          )
        : hasImage
          ? (
              <img src={annotation.iconUrl} alt="" className={isEffect ? (compact ? "w-6 h-6 object-contain" : "w-7 h-7 object-contain") : (compact ? "w-5 h-5 object-contain" : "w-6 h-6 object-contain")} />
            )
          : hasLabel
            ? (
                <span className={`${compact ? "text-[11px]" : "text-xs"} font-semibold leading-none whitespace-nowrap`}>{annotation.label}</span>
              )
            : (
                <span className="sr-only">{annotation.label}</span>
              )}
    </button>
  );
}
