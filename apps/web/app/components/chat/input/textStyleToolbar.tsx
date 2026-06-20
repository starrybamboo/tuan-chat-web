import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";

import {
  CaretDownIcon,
  EraserIcon,
  GearSixIcon,
  HighlighterIcon,
  PaletteIcon,
  PlusIcon,
  TextAaIcon,
  TextBIcon,
  TextHOneIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useCallback, useState } from "react";

import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { FloatingSelectionToolbarPosition } from "@/components/common/floatingSelectionToolbar";

import { FloatingSelectionToolbar, useFloatingSelectionToolbar } from "@/components/common/floatingSelectionToolbar";
import toastWindow from "@/components/common/toastWindow/toastWindow";

import { buildTextStyleSyntax, clearTextStyleSyntax } from "./textStyleSyntax";

type SelectionTransform = (selectedText: string) => string;
type TextStyleInsertOptions = { transform?: SelectionTransform }
type ManagedTextStyleInsert = (text: string, selectedText: string, options?: TextStyleInsertOptions) => boolean | void;

type TextStyleToolbarProps = {
  /** 输入框的 ref，用于插入文本 */
  chatInputRef: RefObject<ChatInputAreaHandle | null>;
  /** 外部托管的原始字符串选区，例如文档编辑器的跨块选区 */
  externalSelection?: {
    position: FloatingSelectionToolbarPosition | null;
    text: string;
    visible?: boolean;
  };
  /** 外部选区的替换入口。未提供时仍使用聊天室输入框 DOM 选区。 */
  onInsertText?: ManagedTextStyleInsert;
  /** 是否显示工具栏 */
  visible?: boolean;
  /** 额外的 className */
  className?: string;
}

type ToolbarMenu = "backgroundColor" | "color" | "fontSize" | "heading" | null;

const DEFAULT_COLOR = "#E11D48";
const DEFAULT_BACKGROUND_COLOR = "#FEF3C7";
const DEFAULT_FONT_SIZE = "120%";
const COLOR_OPTIONS = [
  "#111827",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#16A34A",
  "#0284C7",
  "#4F46E5",
  "#9333EA",
  "#DB2777",
  "#64748B",
] as const;
const BACKGROUND_COLOR_OPTIONS = [
  "#FEF3C7",
  "#FDE68A",
  "#DCFCE7",
  "#CCFBF1",
  "#DBEAFE",
  "#EDE9FE",
  "#FCE7F3",
  "#FFE4E6",
  "#E5E7EB",
  "#F8FAFC",
] as const;
const FONT_SIZE_OPTIONS = ["80%", "90%", "100%", "110%", "120%", "150%", "200%"] as const;
const HEADING_OPTIONS = [
  { label: "一级标题", level: 1 },
  { label: "二级标题", level: 2 },
  { label: "三级标题", level: 3 },
] as const;
const LETTER_SPACING_OPTIONS = ["0.02em", "0.05em", "0.1em", "0.2em"] as const;
const OPACITY_OPTIONS = ["0.55", "0.7", "0.85", "1"] as const;
const FONT_WEIGHT_OPTIONS = ["100", "300", "400", "500", "600", "700", "900"] as const;
const FONT_FAMILY_OPTIONS = [
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
] as const;
const LINE_HEIGHT_OPTIONS = ["1", "1.2", "1.5", "1.75", "2"] as const;
const WORD_SPACING_OPTIONS = ["0.1em", "0.25em", "0.5em", "1em"] as const;
const TEXT_ALIGN_OPTIONS = ["left", "center", "right", "justify"] as const;
const TEXT_TRANSFORM_OPTIONS = ["none", "uppercase", "lowercase", "capitalize"] as const;
const TEXT_STROKE_OPTIONS = ["0.5px #000", "1px #000", "1px #fff", "2px #e11d48"] as const;
const FILTER_OPTIONS = ["blur(1px)", "drop-shadow(0 2px 4px #0008)", "brightness(1.3)", "contrast(1.4)", "grayscale(1)"] as const;
const TRANSFORM_OPTIONS = ["rotate(-6deg)", "rotate(6deg)", "skewX(-12deg)", "scale(1.15)"] as const;
const TEXT_SHADOW_OPTIONS = ["0 1px 2px #0009", "0 0 6px #fde68a", "1px 1px 0 #e11d48", "0 2px 8px #4f46e5"] as const;
const BORDER_OPTIONS = ["1px solid currentColor", "1px dashed #94a3b8", "2px solid #e11d48"] as const;
const BORDER_RADIUS_OPTIONS = ["2px", "4px", "8px", "9999px"] as const;
const SPACING_OPTIONS = ["0 2px", "0 4px", "2px 6px", "4px 8px"] as const;

function preventSelectionLoss(event: ReactMouseEvent<HTMLElement>) {
  event.preventDefault();
}

function normalizeTextInput(value: string) {
  return String(value ?? "").trim();
}

export function applyManagedTextStyleInsert({
  onInsertText,
  options,
  selectedText,
  text,
}: {
  onInsertText: ManagedTextStyleInsert | undefined;
  options?: TextStyleInsertOptions;
  selectedText: string;
  text: string;
}) {
  if (!onInsertText || !selectedText.trim()) {
    return false;
  }
  return onInsertText(text, selectedText, options) !== false;
}

function ToolbarButton({
  active = false,
  children,
  label,
  onMouseDown,
}: {
  active?: boolean;
  children: ReactNode;
  label: string;
  onMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className={[
        "flex h-8 min-w-8 items-center gap-1.5 rounded-md px-2 text-sm text-base-content/80 transition hover:bg-base-200 hover:text-base-content",
        active ? "bg-base-200 text-base-content" : "",
      ].join(" ")}
      onMouseDown={onMouseDown}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function SplitButton({
  children,
  menu,
  menuOpen,
  onApply,
  onToggleMenu,
  title,
}: {
  children: ReactNode;
  menu: ReactNode;
  menuOpen: boolean;
  onApply: () => void;
  onToggleMenu: () => void;
  title: string;
}) {
  return (
    <div className="relative flex items-center">
      <button
        type="button"
        className="
          flex h-8 items-center gap-1.5 rounded-l-md px-2 text-sm
          text-base-content/80 transition
          hover:bg-base-200 hover:text-base-content
        "
        onMouseDown={(event) => {
          preventSelectionLoss(event);
          onApply();
        }}
        title={title}
        aria-label={title}
      >
        {children}
      </button>
      <button
        type="button"
        className="
          flex h-8 w-6 items-center justify-center rounded-r-md border-l
          border-base-300/70 text-base-content/60 transition
          hover:bg-base-200 hover:text-base-content
        "
        onMouseDown={(event) => {
          preventSelectionLoss(event);
          onToggleMenu();
        }}
        title={`${title}选项`}
        aria-label={`${title}选项`}
      >
        <CaretDownIcon size={14} weight="bold" />
      </button>
      {menuOpen ? menu : null}
    </div>
  );
}

function DropdownPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        absolute left-0 top-10 z-41 min-w-48 rounded-md border border-base-300
        bg-base-100 p-2.5 text-sm shadow-xl
      "
      onMouseDown={event => event.stopPropagation()}
      role="presentation"
    >
      {children}
    </div>
  );
}

function SwatchMenu({
  label,
  options,
  selectedColor,
  onApplyColor,
  onPickColor,
}: {
  label: string;
  options: readonly string[];
  selectedColor: string;
  onApplyColor: (color: string) => void;
  onPickColor: (color: string) => void;
}) {
  return (
    <DropdownPanel>
      <div className="grid grid-cols-5 gap-1.5">
        {options.map(color => (
          <button
            key={color}
            type="button"
            className={[
              "size-7 rounded-md border transition hover:scale-105",
              selectedColor.toLowerCase() === color.toLowerCase() ? "border-base-content ring-2 ring-primary/25" : "border-base-300",
            ].join(" ")}
            style={{ backgroundColor: color }}
            onMouseDown={(event) => {
              preventSelectionLoss(event);
              onApplyColor(color);
            }}
            title={color}
            aria-label={`${label} ${color}`}
          />
        ))}
      </div>
      <div className="
        mt-2 flex items-center gap-2 border-t border-base-300 pt-2
      ">
        <input
          type="color"
          className="
            h-8 w-10 cursor-pointer rounded border border-base-300
            bg-transparent
          "
          value={selectedColor}
          onChange={(event) => {
            onPickColor(event.target.value);
          }}
          title={`自定义${label}`}
          aria-label={`自定义${label}`}
        />
        <button
          type="button"
          className="
            h-8 rounded-md border border-base-300 px-2.5 text-sm transition
            hover:bg-base-200
          "
          onMouseDown={(event) => {
            preventSelectionLoss(event);
            onApplyColor(selectedColor);
          }}
        >
          应用
        </button>
      </div>
    </DropdownPanel>
  );
}

function HeadingIcon({ level }: { level: 1 | 2 | 3 }) {
  if (level === 1) {
    return <TextHOneIcon size={15} weight="bold" />;
  }
  if (level === 2) {
    return <TextHTwoIcon size={15} weight="bold" />;
  }
  return <TextHThreeIcon size={15} weight="bold" />;
}

function FontSizeMenu({
  selectedFontSize,
  onApplyFontSize,
}: {
  selectedFontSize: string;
  onApplyFontSize: (size: string) => void;
}) {
  return (
    <DropdownPanel>
      <div className="grid grid-cols-2 gap-1">
        {FONT_SIZE_OPTIONS.map(size => (
          <button
            key={size}
            type="button"
            className={[
              "h-8 rounded-md px-2.5 text-left transition hover:bg-base-200",
              selectedFontSize === size ? "bg-primary/10 text-primary" : "text-base-content/80",
            ].join(" ")}
            onMouseDown={(event) => {
              preventSelectionLoss(event);
              onApplyFontSize(size);
            }}
          >
            {size}
          </button>
        ))}
      </div>
    </DropdownPanel>
  );
}

function HeadingMenu({
  onApplyHeading,
}: {
  onApplyHeading: (level: 1 | 2 | 3) => void;
}) {
  return (
    <DropdownPanel>
      <div className="flex min-w-28 flex-col gap-1">
        {HEADING_OPTIONS.map(option => (
          <button
            key={option.level}
            type="button"
            className="
              flex h-8 items-center gap-2.5 rounded-md px-2.5 text-left
              transition
              hover:bg-base-200
            "
            onMouseDown={(event) => {
              preventSelectionLoss(event);
              onApplyHeading(option.level);
            }}
          >
            <HeadingIcon level={option.level} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </DropdownPanel>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs text-base-content/60">{children}</span>;
}

function textInputClassName(extra = "") {
  return `h-8 rounded-md border border-base-300 bg-base-100 px-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${extra}`;
}

function DialogColorPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={[
            "flex h-7 items-center rounded-md border px-2 text-xs transition hover:bg-base-200",
            value ? "border-base-300 text-base-content/70" : "border-base-content text-base-content",
          ].join(" ")}
          onClick={() => onChange("")}
        >
          无
        </button>
        {options.map(color => (
          <button
            key={color}
            type="button"
            className={[
              "size-7 rounded-md border transition hover:scale-105",
              value.toLowerCase() === color.toLowerCase() ? "border-base-content ring-2 ring-primary/25" : "border-base-300",
            ].join(" ")}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            title={color}
            aria-label={`${label} ${color}`}
          />
        ))}
        <input
          type="color"
          className="h-7 w-9 cursor-pointer rounded border border-base-300 bg-transparent"
          value={value || "#000000"}
          onChange={event => onChange(event.target.value)}
          title={`自定义${label}`}
          aria-label={`自定义${label}`}
        />
      </div>
    </div>
  );
}

function DialogToggle({
  active,
  children,
  label,
  onToggle,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border px-2 text-sm transition",
        active ? "border-primary bg-primary/10 text-primary" : "border-base-300 text-base-content/75 hover:bg-base-200",
      ].join(" ")}
      onClick={onToggle}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function DialogSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-base-300/70 bg-base-200/30 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium tracking-wide text-base-content/70">{title}</span>
        {hint ? <span className="text-[11px] text-base-content/40">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** 文本输入 + datalist 建议：既能从预设里挑，也能写任意 CSS 值。 */
function SuggestField({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const listId = `suggest-${label}`;
  return (
    <label className="flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        className={textInputClassName()}
        placeholder={placeholder}
        value={value}
        list={listId}
        onChange={event => onChange(event.target.value)}
      />
      <datalist id={listId}>
        {options.map(option => <option key={option} value={option} />)}
      </datalist>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  emptyLabel = "不设置",
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  emptyLabel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      <select
        className={textInputClassName(disabled ? "opacity-50" : "")}
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-base-300 bg-transparent"
          value={value || fallback}
          onChange={event => onChange(event.target.value)}
          title={label}
          aria-label={label}
        />
        <input
          type="text"
          className={textInputClassName("min-w-0 flex-1")}
          placeholder={fallback}
          value={value}
          onChange={event => onChange(event.target.value)}
        />
        <button
          type="button"
          className="h-8 shrink-0 rounded-md border border-base-300 px-2 text-xs transition hover:bg-base-200 disabled:opacity-40"
          disabled={!value}
          onClick={() => onChange("")}
        >
          清除
        </button>
      </div>
    </label>
  );
}

type CssRow = { id: number; property: string; value: string };

const CSS_PROPERTY_SUGGESTIONS = [
  "background",
  "background-clip",
  "-webkit-background-clip",
  "-webkit-text-fill-color",
  "writing-mode",
  "text-orientation",
  "white-space",
  "word-break",
  "text-indent",
  "vertical-align",
  "mix-blend-mode",
  "backdrop-filter",
  "clip-path",
  "animation",
  "transition",
  "box-shadow",
  "outline",
] as const;

let cssRowSeq = 0;
function createCssRow(): CssRow {
  cssRowSeq += 1;
  return { id: cssRowSeq, property: "", value: "" };
}

function CssPropertyRepeater({
  rows,
  onChange,
}: {
  rows: CssRow[];
  onChange: (rows: CssRow[]) => void;
}) {
  const updateRow = (id: number, patch: Partial<CssRow>) => {
    onChange(rows.map(row => (row.id === id ? { ...row, ...patch } : row)));
  };
  const removeRow = (id: number) => {
    onChange(rows.filter(row => row.id !== id));
  };
  return (
    <div className="flex flex-col gap-2">
      {rows.map(row => (
        <div key={row.id} className="flex items-center gap-1.5">
          <input
            type="text"
            className={textInputClassName("min-w-0 flex-1")}
            placeholder="属性，如 writing-mode"
            value={row.property}
            list="css-property-suggestions"
            onChange={event => updateRow(row.id, { property: event.target.value })}
          />
          <span className="text-base-content/40">:</span>
          <input
            type="text"
            className={textInputClassName("min-w-0 flex-1")}
            placeholder="值，如 vertical-rl"
            value={row.value}
            onChange={event => updateRow(row.id, { value: event.target.value })}
          />
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-base-300 text-base-content/60 transition hover:bg-base-200 hover:text-error"
            onClick={() => removeRow(row.id)}
            title="删除"
            aria-label="删除该属性"
          >
            <TrashIcon size={15} />
          </button>
        </div>
      ))}
      <datalist id="css-property-suggestions">
        {CSS_PROPERTY_SUGGESTIONS.map(property => <option key={property} value={property} />)}
      </datalist>
      <button
        type="button"
        className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-dashed border-base-300 text-sm text-base-content/70 transition hover:border-primary hover:text-primary"
        onClick={() => onChange([...rows, createCssRow()])}
      >
        <PlusIcon size={15} weight="bold" />
        添加 CSS 属性
      </button>
    </div>
  );
}

function AdvancedStyleDialog({
  initialText,
  onClose,
  onConfirm,
}: {
  initialText?: string;
  onClose: () => void;
  onConfirm: (text: string, options: Parameters<typeof buildTextStyleSyntax>[1]) => void;
}) {
  const [text, setText] = useState(initialText || "");
  const [color, setColor] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [fontSize, setFontSize] = useState("");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [headingLevel, setHeadingLevel] = useState<0 | 1 | 2 | 3>(0);
  const [ruby, setRuby] = useState("");
  const [letterSpacing, setLetterSpacing] = useState("");
  const [opacity, setOpacity] = useState("");
  const [textShadow, setTextShadow] = useState("");
  const [margin, setMargin] = useState("");
  const [padding, setPadding] = useState("");
  const [customStyle, setCustomStyle] = useState("");
  const [customStyleAllText, setCustomStyleAllText] = useState("");

  const headingFontSize = headingLevel === 1 ? "200%" : headingLevel === 2 ? "150%" : headingLevel === 3 ? "125%" : undefined;
  const previewStyle: CSSProperties = {
    ...(color ? { color } : {}),
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(headingFontSize ? { fontSize: headingFontSize } : fontSize ? { fontSize } : {}),
    ...(headingLevel || bold ? { fontWeight: "bold" } : {}),
    ...(italic ? { fontStyle: "italic" } : {}),
    ...(underline ? { textDecoration: "underline" } : {}),
    ...(letterSpacing ? { letterSpacing } : {}),
    ...(opacity ? { opacity } : {}),
    ...(textShadow ? { textShadow } : {}),
    ...(margin ? { margin } : {}),
    ...(padding ? { padding } : {}),
  };

  return (
    <div className="flex w-90 max-w-[calc(100vw-2rem)] flex-col gap-3 p-4">
      <div className="text-base font-medium">高级文本样式</div>
      <label className="flex flex-col gap-1">
        <FieldLabel>文本</FieldLabel>
        <input
          type="text"
          className={textInputClassName()}
          placeholder="输入要设置样式的文字"
          value={text}
          onChange={event => setText(event.target.value)}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>样式</FieldLabel>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={[
              "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition hover:bg-base-200",
              bold ? "border-primary bg-primary/10 text-primary" : "border-base-300 text-base-content/80",
            ].join(" ")}
            onClick={() => setBold(previous => !previous)}
            title="粗体"
            aria-label="粗体"
          >
            <TextBIcon size={16} weight="bold" />
          </button>
          <button
            type="button"
            className={[
              "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition hover:bg-base-200",
              italic ? "border-primary bg-primary/10 text-primary" : "border-base-300 text-base-content/80",
            ].join(" ")}
            onClick={() => setItalic(previous => !previous)}
            title="斜体"
            aria-label="斜体"
          >
            <TextItalicIcon size={16} weight="bold" />
          </button>
          <button
            type="button"
            className={[
              "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition hover:bg-base-200",
              underline ? "border-primary bg-primary/10 text-primary" : "border-base-300 text-base-content/80",
            ].join(" ")}
            onClick={() => setUnderline(previous => !previous)}
            title="下划线"
            aria-label="下划线"
          >
            <TextUnderlineIcon size={16} weight="bold" />
          </button>
          {HEADING_OPTIONS.map(option => (
            <button
              key={option.level}
              type="button"
              className={[
                "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition hover:bg-base-200",
                headingLevel === option.level ? "border-primary bg-primary/10 text-primary" : "border-base-300 text-base-content/80",
              ].join(" ")}
              onClick={() => setHeadingLevel(previous => previous === option.level ? 0 : option.level)}
              title={option.label}
              aria-label={option.label}
            >
              <HeadingIcon level={option.level} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <FieldLabel>文字颜色</FieldLabel>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              className="h-8 w-10 cursor-pointer rounded border border-base-300 bg-transparent"
              value={color || "#E11D48"}
              onChange={event => setColor(event.target.value)}
              title="文字颜色"
              aria-label="文字颜色"
            />
            <button
              type="button"
              className="h-8 rounded-md border border-base-300 px-2 text-xs transition hover:bg-base-200 disabled:opacity-40"
              disabled={!color}
              onClick={() => setColor("")}
            >
              清除
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>背景色</FieldLabel>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              className="h-8 w-10 cursor-pointer rounded border border-base-300 bg-transparent"
              value={backgroundColor || "#FEF3C7"}
              onChange={event => setBackgroundColor(event.target.value)}
              title="背景色"
              aria-label="背景色"
            />
            <button
              type="button"
              className="h-8 rounded-md border border-base-300 px-2 text-xs transition hover:bg-base-200 disabled:opacity-40"
              disabled={!backgroundColor}
              onClick={() => setBackgroundColor("")}
            >
              清除
            </button>
          </div>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <FieldLabel>字号</FieldLabel>
        <select
          className={textInputClassName()}
          value={fontSize}
          onChange={event => setFontSize(event.target.value)}
          disabled={headingLevel !== 0}
          title={headingLevel !== 0 ? "标题已设定字号" : undefined}
        >
          <option value="">不设置</option>
          {FONT_SIZE_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <FieldLabel>注音</FieldLabel>
        <input
          type="text"
          className={textInputClassName()}
          placeholder="wen ben"
          value={ruby}
          onChange={event => setRuby(event.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <FieldLabel>字距</FieldLabel>
          <select
            className={textInputClassName()}
            value={letterSpacing}
            onChange={event => setLetterSpacing(event.target.value)}
          >
            <option value="">不设置</option>
            {LETTER_SPACING_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>透明度</FieldLabel>
          <select
            className={textInputClassName()}
            value={opacity}
            onChange={event => setOpacity(event.target.value)}
          >
            <option value="">不设置</option>
            {OPACITY_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <FieldLabel>阴影</FieldLabel>
          <input
            type="text"
            className={textInputClassName()}
            placeholder="0 1px 2px #000"
            value={textShadow}
            onChange={event => setTextShadow(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>外边距</FieldLabel>
          <input
            type="text"
            className={textInputClassName()}
            placeholder="0 2px"
            value={margin}
            onChange={event => setMargin(event.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <FieldLabel>内边距</FieldLabel>
        <input
          type="text"
          className={textInputClassName()}
          placeholder="0 2px"
          value={padding}
          onChange={event => setPadding(event.target.value)}
        />
      </label>

      <details className="rounded-md border border-base-300 p-2">
        <summary className="cursor-pointer text-sm text-base-content/75">自定义 CSS</summary>
        <div className="mt-2 flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <FieldLabel>style</FieldLabel>
            <input
              type="text"
              className={textInputClassName()}
              placeholder="color:#66327C"
              value={customStyle}
              onChange={event => setCustomStyle(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>style-alltext</FieldLabel>
            <input
              type="text"
              className={textInputClassName()}
              placeholder="letter-spacing:0.05em"
              value={customStyleAllText}
              onChange={event => setCustomStyleAllText(event.target.value)}
            />
          </label>
        </div>
      </details>

      <div className="rounded-md bg-base-200 p-2 text-sm">
        {text
          ? (
              ruby
                ? (
                    <ruby style={previewStyle}>
                      {text}
                      <rp>(</rp>
                      <rt>{ruby}</rt>
                      <rp>)</rp>
                    </ruby>
                  )
                : <span style={previewStyle}>{text}</span>
            )
          : <span className="text-base-content/45">请输入文本</span>}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="
          rounded-md px-3 py-1.5 text-sm
          hover:bg-base-200
        " onClick={onClose}>取消</button>
        <button
          type="button"
          className="
            rounded-md bg-primary px-3 py-1.5 text-sm text-primary-content
            disabled:opacity-50
          "
          disabled={!normalizeTextInput(text)}
          onClick={() => {
            const normalizedText = normalizeTextInput(text);
            if (!normalizedText) {
              return;
            }
            onConfirm(normalizedText, {
              backgroundColor: backgroundColor || undefined,
              bold: bold || undefined,
              color: color || undefined,
              customStyle,
              customStyleAllText,
              fontSize: headingLevel === 0 ? (fontSize || undefined) : undefined,
              headingLevel: headingLevel === 0 ? undefined : headingLevel,
              italic: italic || undefined,
              letterSpacing: letterSpacing || undefined,
              margin: normalizeTextInput(margin) || undefined,
              opacity: opacity || undefined,
              padding: normalizeTextInput(padding) || undefined,
              ruby: normalizeTextInput(ruby) || undefined,
              textShadow: normalizeTextInput(textShadow) || undefined,
              underline: underline || undefined,
            });
          }}
        >
          确认
        </button>
      </div>
    </div>
  );
}

/**
 * 文本样式工具栏。
 */
function TextStyleToolbar({ chatInputRef, externalSelection, onInsertText, visible = true, className = "" }: TextStyleToolbarProps) {
  const [activeMenu, setActiveMenu] = useState<ToolbarMenu>(null);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState(DEFAULT_BACKGROUND_COLOR);
  const [selectedFontSize, setSelectedFontSize] = useState(DEFAULT_FONT_SIZE);
  const externalSelectionActive = Boolean(
    visible
    && externalSelection?.visible !== false
    && externalSelection?.position
    && externalSelection.text.trim(),
  );

  const resolveEditorElement = useCallback((range: Range) => {
    const editor = chatInputRef.current?.getRawElement();
    if (!editor || !editor.contains(range.commonAncestorContainer)) {
      return null;
    }
    return editor;
  }, [chatInputRef]);
  const {
    toolbarRef,
    isFloatingVisible,
    toolbarPos,
    savedSelectionRef,
    saveSelection,
  } = useFloatingSelectionToolbar({
    visible: visible && !externalSelectionActive,
    resolveEditorElement,
  });
  const getSelectedText = useCallback(() => {
    if (externalSelectionActive) {
      return externalSelection?.text ?? "";
    }
    if (!savedSelectionRef.current) {
      savedSelectionRef.current = saveSelection();
    }
    return savedSelectionRef.current?.text || "";
  }, [externalSelection?.text, externalSelectionActive, saveSelection, savedSelectionRef]);

  const restoreAndInsertText = useCallback((text: string, selectedText: string, options?: TextStyleInsertOptions) => {
    if (applyManagedTextStyleInsert({
      onInsertText,
      options,
      selectedText,
      text,
    })) {
      savedSelectionRef.current = null;
      return;
    }

    const editor = chatInputRef.current?.getRawElement();
    if (!editor) {
      return;
    }

    const saved = savedSelectionRef.current;
    editor.focus();

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    if (saved && saved.editor === editor) {
      try {
        selection.removeAllRanges();
        selection.addRange(saved.range);
      }
      catch {
        const newRange = document.createRange();
        newRange.selectNodeContents(editor);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    else {
      const newRange = document.createRange();
      newRange.selectNodeContents(editor);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    document.execCommand("insertText", false, text);
    chatInputRef.current?.triggerSync();
    savedSelectionRef.current = null;
  }, [chatInputRef, onInsertText, savedSelectionRef]);

  const applyStyle = useCallback((options: Parameters<typeof buildTextStyleSyntax>[1]) => {
    const selectedText = getSelectedText();
    if (!selectedText.trim()) {
      return;
    }
    restoreAndInsertText(buildTextStyleSyntax(selectedText, options), selectedText);
    setActiveMenu(null);
  }, [getSelectedText, restoreAndInsertText]);

  const clearStyle = useCallback(() => {
    const selectedText = getSelectedText();
    if (!selectedText.trim()) {
      return;
    }
    restoreAndInsertText(clearTextStyleSyntax(selectedText), selectedText, { transform: clearTextStyleSyntax });
    setActiveMenu(null);
  }, [getSelectedText, restoreAndInsertText]);

  const toggleMenu = useCallback((menu: Exclude<ToolbarMenu, null>) => {
    setActiveMenu(previous => previous === menu ? null : menu);
  }, []);

  const openAdvancedStyle = useCallback(() => {
    const selectedText = getSelectedText();
    if (!selectedText.trim()) {
      return;
    }
    setActiveMenu(null);
    toastWindow(onClose => (
      <AdvancedStyleDialog
        initialText={selectedText}
        onClose={onClose}
        onConfirm={(text, options) => {
          restoreAndInsertText(buildTextStyleSyntax(text, options), selectedText);
          onClose();
        }}
      />
    ));
  }, [getSelectedText, restoreAndInsertText]);

  return (
    <FloatingSelectionToolbar
      visible={visible && (externalSelectionActive || isFloatingVisible)}
      position={externalSelectionActive ? externalSelection?.position ?? null : toolbarPos}
      toolbarRef={toolbarRef}
      className={className}
      shellClassName="max-w-[calc(100vw-1rem)] flex-wrap gap-1 rounded-xl px-2 py-1.5 text-sm"
    >
      <SplitButton
        title="标题"
        menuOpen={activeMenu === "heading"}
        onApply={() => applyStyle({ headingLevel: 1 })}
        onToggleMenu={() => toggleMenu("heading")}
        menu={(
          <HeadingMenu
            onApplyHeading={headingLevel => applyStyle({ headingLevel })}
          />
        )}
      >
        <TextHOneIcon size={18} weight="bold" />
      </SplitButton>

      <ToolbarButton
        label="粗体"
        onMouseDown={(event) => {
          preventSelectionLoss(event);
          applyStyle({ bold: true });
        }}
      >
        <TextBIcon size={18} weight="bold" />
      </ToolbarButton>

      <ToolbarButton
        label="斜体"
        onMouseDown={(event) => {
          preventSelectionLoss(event);
          applyStyle({ italic: true });
        }}
      >
        <TextItalicIcon size={18} weight="bold" />
      </ToolbarButton>

      <ToolbarButton
        label="下划线"
        onMouseDown={(event) => {
          preventSelectionLoss(event);
          applyStyle({ underline: true });
        }}
      >
        <TextUnderlineIcon size={18} weight="bold" />
      </ToolbarButton>

      <SplitButton
        title="文字颜色"
        menuOpen={activeMenu === "color"}
        onApply={() => applyStyle({ color: selectedColor })}
        onToggleMenu={() => toggleMenu("color")}
        menu={(
          <SwatchMenu
            label="文字颜色"
            options={COLOR_OPTIONS}
            selectedColor={selectedColor}
            onPickColor={setSelectedColor}
            onApplyColor={(color) => {
              setSelectedColor(color);
              applyStyle({ color });
            }}
          />
        )}
      >
        <PaletteIcon size={18} weight="fill" />
        <span className="ml-1.5 size-3.5 rounded-full" style={{ backgroundColor: selectedColor }} />
      </SplitButton>

      <SplitButton
        title="背景色"
        menuOpen={activeMenu === "backgroundColor"}
        onApply={() => applyStyle({ backgroundColor: selectedBackgroundColor })}
        onToggleMenu={() => toggleMenu("backgroundColor")}
        menu={(
          <SwatchMenu
            label="背景色"
            options={BACKGROUND_COLOR_OPTIONS}
            selectedColor={selectedBackgroundColor}
            onPickColor={setSelectedBackgroundColor}
            onApplyColor={(backgroundColor) => {
              setSelectedBackgroundColor(backgroundColor);
              applyStyle({ backgroundColor });
            }}
          />
        )}
      >
        <HighlighterIcon size={18} weight="fill" />
        <span className="
          ml-1.5 size-3.5 rounded-full border border-base-content/20
        " style={{ backgroundColor: selectedBackgroundColor }} />
      </SplitButton>

      <SplitButton
        title="字号"
        menuOpen={activeMenu === "fontSize"}
        onApply={() => applyStyle({ fontSize: selectedFontSize })}
        onToggleMenu={() => toggleMenu("fontSize")}
        menu={(
          <FontSizeMenu
            selectedFontSize={selectedFontSize}
            onApplyFontSize={(fontSize) => {
              setSelectedFontSize(fontSize);
              applyStyle({ fontSize });
            }}
          />
        )}
      >
        <TextAaIcon size={18} weight="bold" />
        <span>{selectedFontSize}</span>
      </SplitButton>

      <ToolbarButton
        label="清除标记"
        onMouseDown={(event) => {
          preventSelectionLoss(event);
          clearStyle();
        }}
      >
        <EraserIcon size={18} weight="bold" />
      </ToolbarButton>

      <ToolbarButton
        label="高级样式"
        onMouseDown={(event) => {
          preventSelectionLoss(event);
          openAdvancedStyle();
        }}
      >
        <GearSixIcon size={18} weight="bold" />
        <span>高级</span>
      </ToolbarButton>
    </FloatingSelectionToolbar>
  );
}

export default TextStyleToolbar;
