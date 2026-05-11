import { FloatingSelectionToolbar } from "@/components/common/floatingSelectionToolbar";

interface MessageEditorToolbarProps {
  onApplyBlockType: (blockType: "paragraph" | "heading1" | "heading2" | "heading3" | "intro") => void;
  onApplyColor: (color?: string) => void;
  onApplyInlineMark: (type: "bold" | "italic" | "code" | "highlight") => void;
  position: { x: number; y: number } | null;
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
}

const palette = ["#E11D48", "#F97316", "#EAB308", "#10B981", "#3B82F6", "#8B5CF6"];

function toolbarButtonClassName(active = false) {
  return [
    "rounded-md border px-2 py-1 text-xs font-medium transition",
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-base-300 bg-base-100 text-base-content/75 hover:border-primary/40 hover:text-base-content",
  ].join(" ");
}

/**
 * message editor 的浮动选区工具栏。
 */
export function MessageEditorToolbar({
  onApplyBlockType,
  onApplyColor,
  onApplyInlineMark,
  position,
  toolbarRef,
  visible,
}: MessageEditorToolbarProps) {
  return (
    <FloatingSelectionToolbar
      visible={visible}
      position={position}
      toolbarRef={toolbarRef}
      shellClassName="rounded-lg"
    >
      <div className="flex items-center gap-1">
        <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyInlineMark("bold")}>B</button>
        <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyInlineMark("italic")}>I</button>
        <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyInlineMark("code")}>{"</>"}</button>
        <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyInlineMark("highlight")}>HL</button>
        <div className="mx-1 h-5 w-px bg-base-300" />
        <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyBlockType("paragraph")}>P</button>
        <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyBlockType("heading1")}>H1</button>
        <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyBlockType("heading2")}>H2</button>
        <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyBlockType("heading3")}>H3</button>
        <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyBlockType("intro")}>黑</button>
        <div className="mx-1 h-5 w-px bg-base-300" />
        <div className="flex items-center gap-1">
          {palette.map(color => (
            <button
              key={color}
              type="button"
              className="size-5 rounded-full border border-base-300 transition hover:scale-105"
              style={{ backgroundColor: color }}
              onMouseDown={event => event.preventDefault()}
              onClick={() => onApplyColor(color)}
              aria-label={`color-${color}`}
              title={color}
            />
          ))}
          <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyColor(undefined)}>清</button>
        </div>
      </div>
    </FloatingSelectionToolbar>
  );
}
