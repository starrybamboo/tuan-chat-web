import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { FloatingSelectionToolbarPosition } from "@/components/common/floatingSelectionToolbar";

import {
  CaretDownIcon,
  EraserIcon,
  GearSixIcon,
  HighlighterIcon,
  PaletteIcon,
  TextAaIcon,
  TextBIcon,
  TextHOneIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";
import { useCallback, useState } from "react";

import { FloatingSelectionToolbar, useFloatingSelectionToolbar } from "@/components/common/floatingSelectionToolbar";
import toastWindow from "@/components/common/toastWindow/toastWindow";

import { buildTextStyleSyntax, clearTextStyleSyntax } from "./textStyleSyntax";

type SelectionTransform = (selectedText: string) => string;

interface TextStyleToolbarProps {
  /** 输入框的 ref，用于插入文本 */
  chatInputRef: RefObject<ChatInputAreaHandle | null>;
  /** 外部托管的原始字符串选区，例如文档编辑器的跨块选区 */
  externalSelection?: {
    position: FloatingSelectionToolbarPosition | null;
    text: string;
    visible?: boolean;
  };
  /** 外部选区的替换入口。未提供时仍使用聊天室输入框 DOM 选区。 */
  onInsertText?: (text: string, selectedText: string, options?: { transform?: SelectionTransform }) => void;
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

function preventSelectionLoss(event: ReactMouseEvent<HTMLElement>) {
  event.preventDefault();
}

function normalizeTextInput(value: string) {
  return String(value ?? "").trim();
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
        className="flex h-8 items-center gap-1.5 rounded-l-md px-2 text-sm text-base-content/80 transition hover:bg-base-200 hover:text-base-content"
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
        className="flex h-8 w-6 items-center justify-center rounded-r-md border-l border-base-300/70 text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
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
      className="absolute left-0 top-10 z-[41] min-w-48 rounded-md border border-base-300 bg-base-100 p-2.5 text-sm shadow-xl"
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
      <div className="mt-2 flex items-center gap-2 border-t border-base-300 pt-2">
        <input
          type="color"
          className="h-8 w-10 cursor-pointer rounded border border-base-300 bg-transparent"
          value={selectedColor}
          onChange={(event) => {
            onPickColor(event.target.value);
          }}
          title={`自定义${label}`}
          aria-label={`自定义${label}`}
        />
        <button
          type="button"
          className="h-8 rounded-md border border-base-300 px-2.5 text-sm transition hover:bg-base-200"
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
            className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-left transition hover:bg-base-200"
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
  const [ruby, setRuby] = useState("");
  const [letterSpacing, setLetterSpacing] = useState("");
  const [opacity, setOpacity] = useState("");
  const [textShadow, setTextShadow] = useState("");
  const [margin, setMargin] = useState("");
  const [padding, setPadding] = useState("");
  const [customStyle, setCustomStyle] = useState("");
  const [customStyleAllText, setCustomStyleAllText] = useState("");

  const previewStyle: CSSProperties = {
    ...(letterSpacing ? { letterSpacing } : {}),
    ...(opacity ? { opacity } : {}),
    ...(textShadow ? { textShadow } : {}),
    ...(margin ? { margin } : {}),
    ...(padding ? { padding } : {}),
  };

  return (
    <div className="flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3 p-4">
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

      <details className="rounded-md border border-base-300 px-2 py-2">
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

      <div className="rounded-md bg-base-200 px-2 py-2 text-sm">
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
        <button type="button" className="rounded-md px-3 py-1.5 text-sm hover:bg-base-200" onClick={onClose}>取消</button>
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
              customStyle,
              customStyleAllText,
              letterSpacing: letterSpacing || undefined,
              margin: normalizeTextInput(margin) || undefined,
              opacity: opacity || undefined,
              padding: normalizeTextInput(padding) || undefined,
              ruby: normalizeTextInput(ruby) || undefined,
              textShadow: normalizeTextInput(textShadow) || undefined,
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

  const restoreAndInsertText = useCallback((text: string, options?: { transform?: SelectionTransform }) => {
    if (externalSelectionActive && onInsertText) {
      onInsertText(text, externalSelection?.text ?? "", options);
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
  }, [chatInputRef, externalSelection?.text, externalSelectionActive, onInsertText, savedSelectionRef]);

  const applyStyle = useCallback((options: Parameters<typeof buildTextStyleSyntax>[1]) => {
    const selectedText = getSelectedText();
    if (!selectedText.trim()) {
      return;
    }
    restoreAndInsertText(buildTextStyleSyntax(selectedText, options));
    setActiveMenu(null);
  }, [getSelectedText, restoreAndInsertText]);

  const clearStyle = useCallback(() => {
    const selectedText = getSelectedText();
    if (!selectedText.trim()) {
      return;
    }
    restoreAndInsertText(clearTextStyleSyntax(selectedText), { transform: clearTextStyleSyntax });
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
          restoreAndInsertText(buildTextStyleSyntax(text, options));
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
        <span className="ml-1.5 size-3.5 rounded-full border border-base-content/20" style={{ backgroundColor: selectedBackgroundColor }} />
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
