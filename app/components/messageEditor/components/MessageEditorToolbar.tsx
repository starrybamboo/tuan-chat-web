import { FloatingSelectionToolbar } from "@/components/common/floatingSelectionToolbar";

interface MessageEditorToolbarProps {
  onApplyBlockType: (blockType: "paragraph" | "heading1" | "heading2" | "heading3" | "intro") => void;
  position: { x: number; y: number } | null;
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
}

interface MessageEditorBlockTypeToolbarButtonsProps {
  onApplyBlockType: MessageEditorToolbarProps["onApplyBlockType"];
}

function toolbarButtonClassName(active = false) {
  return [
    "rounded-md border px-2 py-1 text-xs font-medium transition",
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-base-300 bg-base-100 text-base-content/75 hover:border-primary/40 hover:text-base-content",
  ].join(" ");
}

export function MessageEditorBlockTypeToolbarButtons({ onApplyBlockType }: MessageEditorBlockTypeToolbarButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyBlockType("paragraph")}>P</button>
      <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyBlockType("heading1")}>H1</button>
      <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyBlockType("heading2")}>H2</button>
      <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyBlockType("heading3")}>H3</button>
      <button type="button" className={toolbarButtonClassName()} onMouseDown={event => event.preventDefault()} onClick={() => onApplyBlockType("intro")}>黑</button>
    </div>
  );
}

/**
 * message editor 的浮动选区工具栏。
 */
export function MessageEditorToolbar({
  onApplyBlockType,
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
      <MessageEditorBlockTypeToolbarButtons onApplyBlockType={onApplyBlockType} />
    </FloatingSelectionToolbar>
  );
}
