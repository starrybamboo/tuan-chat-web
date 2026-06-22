import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";

import {
  ArrowsHorizontalIcon,
  BoundingBoxIcon,
  CaretDownIcon,
  EraserIcon,
  FilmSlateIcon,
  GearSixIcon,
  HighlighterIcon,
  PaletteIcon,
  PlusIcon,
  SparkleIcon,
  TextAaIcon,
  TextBIcon,
  TextHOneIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextTIcon,
  TextUnderlineIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useCallback, useState } from "react";

import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { FloatingSelectionToolbarPosition } from "@/components/common/floatingSelectionToolbar";

import { FloatingSelectionToolbar, useFloatingSelectionToolbar } from "@/components/common/floatingSelectionToolbar";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import "@/components/common/textEnhanceAnimations.css";

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
const ANIMATION_PRESETS = [
  { css: "", label: "无" },
  { css: "te-shake 0.5s ease-in-out infinite", label: "抖动" },
  { css: "te-bounce 0.8s ease infinite", label: "弹跳" },
  { css: "te-pulse 1.2s ease-in-out infinite", label: "脉冲" },
  { css: "te-flash 1s ease-in-out infinite", label: "闪烁" },
  { css: "te-float 2.5s ease-in-out infinite", label: "漂浮" },
  { css: "te-swing 1.2s ease-in-out infinite", label: "摇摆" },
  { css: "te-rainbow 3s linear infinite", label: "彩虹" },
  { css: "te-glow 1.6s ease-in-out infinite", label: "发光" },
  { css: "te-typing 2s steps(20) infinite", label: "打字" },
] as const;

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

function DialogSection({
  title,
  hint,
  icon,
  className = "",
  children,
}: {
  title: string;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-3 rounded-xl border border-base-300/70 bg-base-200/30 p-4 ${className}`}>
      <div className="flex items-center gap-2">
        {icon ? <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span> : null}
        <span className="text-sm font-semibold tracking-wide text-base-content/80">{title}</span>
        {hint ? <span className="ml-auto text-[11px] text-base-content/40">{hint}</span> : null}
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
  disabled,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: readonly string[];
  disabled?: boolean;
  hint?: string;
  onChange: (value: string) => void;
}) {
  const listId = `suggest-${label}`;
  return (
    <label className="flex flex-col gap-1">
      <FieldLabel>{hint ? `${label} · ${hint}` : label}</FieldLabel>
      <input
        type="text"
        className={textInputClassName(disabled ? "opacity-50" : "")}
        placeholder={placeholder}
        value={value}
        list={listId}
        disabled={disabled}
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
  const text = initialText || "";
  const [color, setColor] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [fontSize, setFontSize] = useState("");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [strikethrough, setStrikethrough] = useState(false);
  const [headingLevel, setHeadingLevel] = useState<0 | 1 | 2 | 3>(0);
  const [ruby, setRuby] = useState("");
  const [fontWeight, setFontWeight] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [lineHeight, setLineHeight] = useState("");
  const [letterSpacing, setLetterSpacing] = useState("");
  const [wordSpacing, setWordSpacing] = useState("");
  const [textAlign, setTextAlign] = useState("");
  const [textTransform, setTextTransform] = useState("");
  const [opacity, setOpacity] = useState("");
  const [textShadow, setTextShadow] = useState("");
  const [textStroke, setTextStroke] = useState("");
  const [filter, setFilter] = useState("");
  const [transform, setTransform] = useState("");
  const [animation, setAnimation] = useState("");
  const [border, setBorder] = useState("");
  const [borderRadius, setBorderRadius] = useState("");
  const [margin, setMargin] = useState("");
  const [padding, setPadding] = useState("");
  const [customStyle, setCustomStyle] = useState("");
  const [customStyleAllText, setCustomStyleAllText] = useState("");
  const [cssRows, setCssRows] = useState<CssRow[]>([]);
  const [previewDark, setPreviewDark] = useState(false);

  const headingFontSize = headingLevel === 1 ? "200%" : headingLevel === 2 ? "150%" : headingLevel === 3 ? "125%" : undefined;
  const decorationLine = [underline ? "underline" : "", strikethrough ? "line-through" : ""].filter(Boolean).join(" ");
  const customRowStyle: CSSProperties = cssRows.reduce<Record<string, string>>((accumulator, row) => {
    const property = row.property.trim();
    const value = row.value.trim();
    if (property && value) {
      const camel = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
      accumulator[camel] = value;
    }
    return accumulator;
  }, {});
  const previewStyle: CSSProperties = {
    ...(color ? { color } : {}),
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(headingFontSize ? { fontSize: headingFontSize } : fontSize ? { fontSize } : {}),
    ...(headingLevel ? { fontWeight: "bold" } : fontWeight ? { fontWeight } : bold ? { fontWeight: "bold" } : {}),
    ...(italic ? { fontStyle: "italic" } : {}),
    ...(decorationLine ? { textDecoration: decorationLine } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(lineHeight ? { lineHeight } : {}),
    ...(letterSpacing ? { letterSpacing } : {}),
    ...(wordSpacing ? { wordSpacing } : {}),
    ...(textAlign ? { textAlign: textAlign as CSSProperties["textAlign"] } : {}),
    ...(textTransform ? { textTransform: textTransform as CSSProperties["textTransform"] } : {}),
    ...(opacity ? { opacity } : {}),
    ...(textShadow ? { textShadow } : {}),
    ...(textStroke ? { WebkitTextStroke: textStroke } : {}),
    ...(filter ? { filter } : {}),
    ...(transform ? { display: "inline-block", transform } : {}),
    ...(animation ? { display: "inline-block", animation } : {}),
    ...(border ? { border } : {}),
    ...(borderRadius ? { borderRadius } : {}),
    ...(margin ? { margin } : {}),
    ...(padding ? { padding } : {}),
    ...customRowStyle,
  };
  const composedCustomStyleAllText = [
    customStyleAllText.trim(),
    ...cssRows
      .map(row => (row.property.trim() && row.value.trim() ? `${row.property.trim()}:${row.value.trim()}` : ""))
      .filter(Boolean),
  ].filter(Boolean).join(";");

  return (
    <div className="flex max-h-[88vh] min-h-0 w-[56rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-base-300 px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GearSixIcon size={20} weight="bold" />
        </span>
        <div className="flex flex-col">
          <span className="text-base font-semibold leading-tight">高级文本样式</span>
          <span className="text-xs text-base-content/45">按字体、间距、效果、动画分层组合，贴近原生 CSS 的自由度</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        {/* 注音 + 预览：全宽置顶，随时看到效果 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
          <DialogSection title="注音" icon={<TextTIcon size={14} weight="bold" />}>
            <label className="flex flex-col gap-1">
              <FieldLabel>注音（ruby）</FieldLabel>
              <input
                type="text"
                className={textInputClassName()}
                placeholder="wen ben"
                value={ruby}
                onChange={event => setRuby(event.target.value)}
              />
            </label>
          </DialogSection>

          <DialogSection
            title="实时预览"
            icon={<SparkleIcon size={14} weight="bold" />}
            hint={(
              <button
                type="button"
                className="rounded-md border border-base-300 px-2 py-0.5 text-[11px] text-base-content/60 transition hover:bg-base-200"
                onClick={() => setPreviewDark(previous => !previous)}
              >
                {previewDark ? "浅色背景" : "深色背景"}
              </button>
            )}
          >
            <div className={[
              "flex min-h-24 flex-1 items-center justify-center rounded-lg border border-base-300 p-4 text-lg",
              previewDark ? "bg-neutral-800 text-neutral-100" : "bg-base-100",
            ].join(" ")}>
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
                : <span className="text-sm text-base-content/45">请输入文本</span>}
            </div>
          </DialogSection>
        </div>

        {/* 控制项：两列网格，按抽象层级分组 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DialogSection title="字体" icon={<TextAaIcon size={14} weight="bold" />} hint="字形与字号">
            <div className="flex flex-wrap items-center gap-1.5">
              <DialogToggle active={bold} label="粗体" onToggle={() => setBold(previous => !previous)}>
                <TextBIcon size={16} weight="bold" />
              </DialogToggle>
              <DialogToggle active={italic} label="斜体" onToggle={() => setItalic(previous => !previous)}>
                <TextItalicIcon size={16} weight="bold" />
              </DialogToggle>
              <DialogToggle active={underline} label="下划线" onToggle={() => setUnderline(previous => !previous)}>
                <TextUnderlineIcon size={16} weight="bold" />
              </DialogToggle>
              <DialogToggle active={strikethrough} label="删除线" onToggle={() => setStrikethrough(previous => !previous)}>
                <TextStrikethroughIcon size={16} weight="bold" />
              </DialogToggle>
              <span className="mx-1 h-5 w-px bg-base-300" />
              {HEADING_OPTIONS.map(option => (
                <DialogToggle
                  key={option.level}
                  active={headingLevel === option.level}
                  label={option.label}
                  onToggle={() => setHeadingLevel(previous => previous === option.level ? 0 : option.level)}
                >
                  <HeadingIcon level={option.level as 1 | 2 | 3} />
                </DialogToggle>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="字号"
                value={fontSize}
                options={FONT_SIZE_OPTIONS}
                disabled={headingLevel !== 0}
                onChange={setFontSize}
              />
              <SuggestField label="字重" value={fontWeight} placeholder="如 600 / bold" options={FONT_WEIGHT_OPTIONS} onChange={setFontWeight} />
              <SuggestField label="字体" value={fontFamily} placeholder="如 serif" options={FONT_FAMILY_OPTIONS} onChange={setFontFamily} />
              <SelectField label="大小写" value={textTransform} options={TEXT_TRANSFORM_OPTIONS} onChange={setTextTransform} />
            </div>
          </DialogSection>

          <DialogSection title="间距与对齐" icon={<ArrowsHorizontalIcon size={14} weight="bold" />} hint="行高 / 字距 / 对齐">
            <div className="grid grid-cols-2 gap-2">
              <SuggestField label="行高" value={lineHeight} placeholder="如 1.5" options={LINE_HEIGHT_OPTIONS} onChange={setLineHeight} />
              <SelectField label="对齐" value={textAlign} options={TEXT_ALIGN_OPTIONS} onChange={setTextAlign} />
              <SuggestField label="字距" value={letterSpacing} placeholder="如 0.1em" options={LETTER_SPACING_OPTIONS} onChange={setLetterSpacing} />
              <SuggestField label="词距" value={wordSpacing} placeholder="如 0.25em" options={WORD_SPACING_OPTIONS} onChange={setWordSpacing} />
            </div>
          </DialogSection>

          <DialogSection title="颜色" icon={<PaletteIcon size={14} weight="bold" />}>
            <div className="grid grid-cols-2 gap-2">
              <ColorField label="文字颜色" value={color} fallback="#E11D48" onChange={setColor} />
              <ColorField label="背景色" value={backgroundColor} fallback="#FEF3C7" onChange={setBackgroundColor} />
            </div>
            <SuggestField label="描边" value={textStroke} placeholder="如 1px #000" options={TEXT_STROKE_OPTIONS} onChange={setTextStroke} />
          </DialogSection>

          <DialogSection title="效果" icon={<SparkleIcon size={14} weight="bold" />} hint="阴影 / 滤镜 / 变形">
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="透明度" value={opacity} options={OPACITY_OPTIONS} onChange={setOpacity} />
              <SuggestField label="变形" value={transform} placeholder="如 rotate(-6deg)" options={TRANSFORM_OPTIONS} onChange={setTransform} />
              <SuggestField label="文字阴影" value={textShadow} placeholder="0 1px 2px #000" options={TEXT_SHADOW_OPTIONS} onChange={setTextShadow} />
              <SuggestField label="滤镜" value={filter} placeholder="如 blur(1px)" options={FILTER_OPTIONS} onChange={setFilter} />
            </div>
          </DialogSection>

          <DialogSection title="动画" icon={<FilmSlateIcon size={14} weight="bold" />} hint="预设或自定义 keyframes" className="lg:col-span-2">
            <div className="flex flex-wrap gap-1.5">
              {ANIMATION_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  className={[
                    "rounded-md border px-2.5 py-1 text-xs transition hover:bg-base-200",
                    animation === preset.css
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-base-300 text-base-content/75",
                  ].join(" ")}
                  onClick={() => setAnimation(preset.css)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1">
              <FieldLabel>animation（CSS 简写，可自定义时长 / 缓动 / 次数）</FieldLabel>
              <input
                type="text"
                className={textInputClassName()}
                placeholder="如 te-shake 0.6s ease-in-out infinite"
                value={animation}
                onChange={event => setAnimation(event.target.value)}
              />
            </label>
          </DialogSection>

          <DialogSection title="盒模型" icon={<BoundingBoxIcon size={14} weight="bold" />} hint="边框 / 圆角 / 间距" className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <SuggestField label="边框" value={border} placeholder="1px solid #000" options={BORDER_OPTIONS} onChange={setBorder} />
              <SuggestField label="圆角" value={borderRadius} placeholder="如 4px" options={BORDER_RADIUS_OPTIONS} onChange={setBorderRadius} />
              <SuggestField label="外边距" value={margin} placeholder="如 0 2px" options={SPACING_OPTIONS} onChange={setMargin} />
              <SuggestField label="内边距" value={padding} placeholder="如 0 2px" options={SPACING_OPTIONS} onChange={setPadding} />
            </div>
          </DialogSection>

          <DialogSection title="自定义 CSS" icon={<PlusIcon size={14} weight="bold" />} hint="任意属性，最贴近原生" className="lg:col-span-2">
            <CssPropertyRepeater rows={cssRows} onChange={setCssRows} />
            <details className="mt-1 rounded-md border border-base-300/70 p-2">
              <summary className="cursor-pointer text-xs text-base-content/70">原始 style / style-alltext</summary>
              <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <FieldLabel>style（作用于文字本身）</FieldLabel>
                  <input
                    type="text"
                    className={textInputClassName()}
                    placeholder="color:#66327C"
                    value={customStyle}
                    onChange={event => setCustomStyle(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <FieldLabel>style-alltext（作用于整体）</FieldLabel>
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
          </DialogSection>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-base-300 px-4 py-3">
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-sm hover:bg-base-200"
          onClick={onClose}
        >
          取消
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-content disabled:opacity-50"
          disabled={!normalizeTextInput(text)}
          onClick={() => {
            const normalizedText = normalizeTextInput(text);
            if (!normalizedText) {
              return;
            }
            onConfirm(normalizedText, {
              animation: normalizeTextInput(animation) || undefined,
              backgroundColor: backgroundColor || undefined,
              bold: bold || undefined,
              border: normalizeTextInput(border) || undefined,
              borderRadius: normalizeTextInput(borderRadius) || undefined,
              color: color || undefined,
              customStyle,
              customStyleAllText: composedCustomStyleAllText,
              filter: normalizeTextInput(filter) || undefined,
              fontFamily: normalizeTextInput(fontFamily) || undefined,
              fontSize: headingLevel === 0 ? (normalizeTextInput(fontSize) || undefined) : undefined,
              fontWeight: headingLevel === 0 ? (normalizeTextInput(fontWeight) || undefined) : undefined,
              headingLevel: headingLevel === 0 ? undefined : headingLevel,
              italic: italic || undefined,
              letterSpacing: normalizeTextInput(letterSpacing) || undefined,
              lineHeight: normalizeTextInput(lineHeight) || undefined,
              margin: normalizeTextInput(margin) || undefined,
              opacity: opacity || undefined,
              padding: normalizeTextInput(padding) || undefined,
              ruby: normalizeTextInput(ruby) || undefined,
              strikethrough: strikethrough || undefined,
              textAlign: textAlign || undefined,
              textShadow: normalizeTextInput(textShadow) || undefined,
              textStroke: normalizeTextInput(textStroke) || undefined,
              textTransform: textTransform || undefined,
              transform: normalizeTextInput(transform) || undefined,
              underline: underline || undefined,
              wordSpacing: normalizeTextInput(wordSpacing) || undefined,
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
    toastWindow(
      onClose => (
        <AdvancedStyleDialog
          initialText={selectedText}
          onClose={onClose}
          onConfirm={(text, options) => {
            restoreAndInsertText(buildTextStyleSyntax(text, options), selectedText);
            onClose();
          }}
        />
      ),
      { disableScroll: true },
    );
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
