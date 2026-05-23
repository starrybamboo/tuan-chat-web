import type { AnnotationDefinition, AnnotationTone } from "@/components/chat/message/annotations/annotationCatalog";

interface AnnotationChipProps {
  annotation: AnnotationDefinition;
  active?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  showActiveHighlight?: boolean;
  subtle?: boolean;
}

const CHIP_SURFACE_CLASS = "supports-[backdrop-filter]:backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35";
const CHIP_SURFACE_ELEVATED_CLASS = `${CHIP_SURFACE_CLASS} shadow-sm`;
const CHIP_SURFACE_SUBTLE_CLASS = `${CHIP_SURFACE_CLASS} shadow-none`;

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

function getSubtleToneClass(annotation: AnnotationDefinition) {
  const base = getToneClass(annotation);
  return base
    .replaceAll("border-base-300/55", "border-base-content/12")
    .replaceAll("border-base-300/65", "border-base-content/12")
    .replaceAll("border-info/40", "border-info/28")
    .replaceAll("border-success/40", "border-success/28")
    .replaceAll("border-warning/40", "border-warning/28")
    .replaceAll("border-accent/40", "border-accent/28")
    .replaceAll("border-primary/40", "border-primary/28")
    .replaceAll("bg-base-100/78", "bg-base-content/4")
    .replaceAll("bg-base-100/64", "bg-base-content/4")
    .replaceAll("hover:bg-base-100/88", "hover:bg-base-content/7")
    .replaceAll("hover:bg-base-100/76", "hover:bg-base-content/7");
}

export default function AnnotationChip({
  annotation,
  active = false,
  interactive = true,
  onClick,
  showActiveHighlight = true,
  subtle = false,
}: AnnotationChipProps) {
  const Icon = annotation.icon;
  const hasLabel = !annotation.hideLabel;
  const hasImage = Boolean(annotation.iconUrl);
  const isEffect = annotation.category === "特效" && hasImage;
  const isFigurePositionTag = annotation.id.startsWith("figure.pos.");
  const rendersText = !Icon && !hasImage && hasLabel;
  const sizeClass = rendersText
    ? (isFigurePositionTag ? "px-1 min-w-[26px]" : "px-1.5 min-w-[36px]")
    : "w-6";
  const interactiveClass = interactive ? "active:scale-95" : "";
  const activeClass = active && showActiveHighlight ? "ring-2 ring-primary/35 shadow-md" : "";
  const surfaceClass = subtle ? CHIP_SURFACE_SUBTLE_CLASS : CHIP_SURFACE_ELEVATED_CLASS;
  const toneClass = subtle ? getSubtleToneClass(annotation) : getToneClass(annotation);

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center h-6 rounded-md border transition-all select-none ${surfaceClass} ${sizeClass} ${interactiveClass} ${toneClass} ${activeClass}`}
      onClick={onClick}
      title={annotation.label}
    >
      {Icon
        ? (
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          )
        : hasImage
          ? (
              <img src={annotation.iconUrl} alt="" className={isEffect ? "w-5 h-5 object-contain" : "w-4 h-4 object-contain"} />
            )
          : hasLabel
            ? (
                <span className="text-[11px] font-semibold leading-none whitespace-nowrap">{annotation.label}</span>
              )
            : (
                <span className="sr-only">{annotation.label}</span>
              )}
    </button>
  );
}
