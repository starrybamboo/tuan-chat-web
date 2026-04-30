import type { AnnotationDefinition, AnnotationTone } from "@/components/chat/message/annotations/annotationCatalog";

interface AnnotationChipProps {
  annotation: AnnotationDefinition;
  active?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  compact?: boolean;
  showActiveHighlight?: boolean;
}

// Use a frosted surface so chips stay legible even on image-heavy backgrounds.
const CHIP_SURFACE_CLASS = "shadow-sm supports-[backdrop-filter]:backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35";

const TONE_STYLES: Record<AnnotationTone, string> = {
  neutral: "border-base-300/55 bg-base-100/78 text-base-content/75 hover:border-base-200/75 hover:bg-base-100/88 hover:text-base-content",
  info: "border-info/40 bg-base-100/78 text-info hover:border-info/60 hover:bg-base-100/88",
  success: "border-success/40 bg-base-100/78 text-success hover:border-success/60 hover:bg-base-100/88",
  warning: "border-warning/40 bg-base-100/78 text-warning hover:border-warning/60 hover:bg-base-100/88",
  accent: "border-accent/40 bg-base-100/78 text-accent hover:border-accent/60 hover:bg-base-100/88",
  primary: "border-primary/40 bg-base-100/78 text-primary hover:border-primary/60 hover:bg-base-100/88",
};

function getToneClass(annotation: AnnotationDefinition) {
  const hasImage = Boolean(annotation.iconUrl);
  const isEffect = annotation.category === "特效" && hasImage;
  if (isEffect) {
    return "border-base-300/65 bg-base-100/64 text-base-content/75 hover:border-base-200/80 hover:bg-base-100/76";
  }
  return TONE_STYLES[annotation.tone ?? "neutral"] ?? TONE_STYLES.neutral;
}

export default function AnnotationChip({
  annotation,
  active = false,
  interactive = true,
  onClick,
  compact = false,
  showActiveHighlight = true,
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
  const activeClass = active && showActiveHighlight ? "ring-2 ring-primary/35 shadow-md" : "";

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center ${compact ? "h-7" : "h-9"} rounded-md border transition-all select-none ${CHIP_SURFACE_CLASS} ${sizeClass} ${interactiveClass} ${getToneClass(annotation)} ${activeClass}`}
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
