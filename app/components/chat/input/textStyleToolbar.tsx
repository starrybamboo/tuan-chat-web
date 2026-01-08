import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import React, { useRef, useState } from "react";
import toastWindow from "@/components/common/toastWindow/toastWindow";

interface TextStyleToolbarProps {
  /** 输入框的 ref，用于插入文本 */
  chatInputRef: React.RefObject<ChatInputAreaHandle | null>;
  /** 是否显示工具栏 */
  visible?: boolean;
  /** 额外的 className */
  className?: string;
}

/**
 * 保存的选区信息
 */
interface SavedSelection {
  range: Range;
  text: string;
  isInEditor: boolean;
}

/**
 * 注音输入对话框
 */
function RubyInputDialog({ onConfirm, onClose, initialText }: {
  onConfirm: (text: string, ruby: string) => void;
  onClose: () => void;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText || "");
  const [ruby, setRuby] = useState("");

  return (
    <div className="flex flex-col gap-3 p-4 min-w-[280px]">
      <h3 className="text-lg font-medium">添加注音</h3>
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-70">文本</span>
          <input
            type="text"
            className="input input-bordered input-sm"
            placeholder="例如：笑顔"
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-70">注音</span>
          <input
            type="text"
            className="input input-bordered input-sm"
            placeholder="例如：えがお"
            value={ruby}
            onChange={e => setRuby(e.target.value)}
          />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>取消</button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!text.trim() || !ruby.trim()}
          onClick={() => {
            if (text.trim() && ruby.trim()) {
              onConfirm(text.trim(), ruby.trim());
            }
          }}
        >
          确认
        </button>
      </div>
      <div className="text-xs opacity-60 bg-base-200 rounded p-2">
        <div>预览效果：</div>
        {text && ruby
          ? (
              <ruby className="text-base">
                {text}
                <rp>(</rp>
                <rt>{ruby}</rt>
                <rp>)</rp>
              </ruby>
            )
          : <span className="opacity-50">请输入文本和注音</span>}
      </div>
    </div>
  );
}

/**
 * 彩色文本输入对话框
 */
function ColorTextDialog({ onConfirm, onClose, initialText }: {
  onConfirm: (text: string, color: string) => void;
  onClose: () => void;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText || "");
  const [color, setColor] = useState("#FF0000");

  const presetColors = [
    "#FF0000", // 红
    "#FF6B00", // 橙
    "#FFD700", // 金
    "#00AA00", // 绿
    "#0088FF", // 蓝
    "#8B00FF", // 紫
    "#FF69B4", // 粉
    "#00CED1", // 青
  ];

  return (
    <div className="flex flex-col gap-3 p-4 min-w-[280px]">
      <h3 className="text-lg font-medium">彩色文字</h3>
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-70">文本</span>
          <input
            type="text"
            className="input input-bordered input-sm"
            placeholder="输入要着色的文字"
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-70">颜色</span>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              className="w-8 h-8 rounded cursor-pointer"
              value={color}
              onChange={e => setColor(e.target.value)}
            />
            <input
              type="text"
              className="input input-bordered input-sm flex-1"
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder="#FF0000"
            />
          </div>
        </label>
        <div className="flex gap-1 flex-wrap">
          {presetColors.map(c => (
            <button
              key={c}
              type="button"
              className={`w-6 h-6 rounded border-2 ${color === c ? "border-primary" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>取消</button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!text.trim()}
          onClick={() => {
            if (text.trim()) {
              onConfirm(text.trim(), color);
            }
          }}
        >
          确认
        </button>
      </div>
      <div className="text-xs opacity-60 bg-base-200 rounded p-2">
        <div>预览效果：</div>
        {text ? <span style={{ color }}>{text}</span> : <span className="opacity-50">请输入文本</span>}
      </div>
    </div>
  );
}

/**
 * 斜体文本输入对话框
 */
function ItalicTextDialog({ onConfirm, onClose, initialText }: {
  onConfirm: (text: string) => void;
  onClose: () => void;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText || "");

  return (
    <div className="flex flex-col gap-3 p-4 min-w-[280px]">
      <h3 className="text-lg font-medium">斜体文字</h3>
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-70">文本</span>
          <input
            type="text"
            className="input input-bordered input-sm"
            placeholder="输入斜体文字"
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>取消</button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!text.trim()}
          onClick={() => {
            if (text.trim()) {
              onConfirm(text.trim());
            }
          }}
        >
          确认
        </button>
      </div>
      <div className="text-xs opacity-60 bg-base-200 rounded p-2">
        <div>预览效果：</div>
        {text ? <span style={{ fontStyle: "italic" }}>{text}</span> : <span className="opacity-50">请输入文本</span>}
      </div>
    </div>
  );
}

/**
 * 高级样式输入对话框
 */
function AdvancedStyleDialog({ onConfirm, onClose, initialText }: {
  onConfirm: (text: string, options: { color?: string; italic?: boolean; fontSize?: string; ruby?: string }) => void;
  onClose: () => void;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText || "");
  const [color, setColor] = useState("#000000");
  const [useColor, setUseColor] = useState(false);
  const [italic, setItalic] = useState(false);
  const [fontSize, setFontSize] = useState("100%");
  const [useFontSize, setUseFontSize] = useState(false);
  const [ruby, setRuby] = useState("");

  const presetColors = [
    "#FF0000",
    "#FF6B00",
    "#FFD700",
    "#00AA00",
    "#0088FF",
    "#8B00FF",
    "#FF69B4",
    "#00CED1",
  ];

  const fontSizes = ["80%", "90%", "100%", "110%", "120%", "150%"];

  // 构建预览样式
  const previewStyle: React.CSSProperties = {};
  if (useColor)
    previewStyle.color = color;
  if (italic)
    previewStyle.fontStyle = "italic";
  if (useFontSize)
    previewStyle.fontSize = fontSize;

  return (
    <div className="flex flex-col gap-3 p-4 min-w-[320px] max-w-[400px]">
      <h3 className="text-lg font-medium">高级文本样式</h3>
      <div className="flex flex-col gap-3">
        {/* 文本输入 */}
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-70">文本 *</span>
          <input
            type="text"
            className="input input-bordered input-sm"
            placeholder="输入要设置样式的文字"
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
        </label>

        {/* 颜色 */}
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={useColor}
              onChange={e => setUseColor(e.target.checked)}
            />
            <span className="text-sm opacity-70">颜色</span>
          </label>
          {useColor && (
            <div className="flex gap-2 items-center ml-5">
              <input
                type="color"
                title="选择颜色"
                className="w-6 h-6 rounded cursor-pointer"
                value={color}
                onChange={e => setColor(e.target.value)}
              />
              <div className="flex gap-1 flex-wrap">
                {presetColors.map(c => (
                  <button
                    key={c}
                    type="button"
                    title={`选择颜色 ${c}`}
                    className={`w-5 h-5 rounded border ${color === c ? "border-primary border-2" : "border-base-300"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 斜体 */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={italic}
            onChange={e => setItalic(e.target.checked)}
          />
          <span className="text-sm opacity-70">斜体</span>
        </label>

        {/* 字体大小 */}
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={useFontSize}
              onChange={e => setUseFontSize(e.target.checked)}
            />
            <span className="text-sm opacity-70">字体大小</span>
          </label>
          {useFontSize && (
            <div className="flex gap-1 ml-5">
              {fontSizes.map(size => (
                <button
                  key={size}
                  type="button"
                  className={`btn btn-xs ${fontSize === size ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setFontSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 注音 */}
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-70">注音（可选）</span>
          <input
            type="text"
            className="input input-bordered input-sm"
            placeholder="例如：えがお"
            value={ruby}
            onChange={e => setRuby(e.target.value)}
          />
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>取消</button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!text.trim()}
          onClick={() => {
            if (text.trim()) {
              onConfirm(text.trim(), {
                color: useColor ? color : undefined,
                italic,
                fontSize: useFontSize ? fontSize : undefined,
                ruby: ruby.trim() || undefined,
              });
            }
          }}
        >
          确认
        </button>
      </div>

      {/* 预览 */}
      <div className="text-xs opacity-60 bg-base-200 rounded p-2">
        <div>预览效果：</div>
        {text
          ? (
              ruby
                ? (
                    <ruby style={previewStyle} className="text-base">
                      {text}
                      <rp>(</rp>
                      <rt>{ruby}</rt>
                      <rp>)</rp>
                    </ruby>
                  )
                : <span style={previewStyle} className="text-base">{text}</span>
            )
          : <span className="opacity-50">请输入文本</span>}
      </div>
    </div>
  );
}

/**
 * 文本样式工具栏
 * 提供快速插入 WebGAL 文本拓展语法的按钮
 */
export function TextStyleToolbar({ chatInputRef, visible = true, className = "" }: TextStyleToolbarProps) {
  // 保存选区信息的 ref
  const savedSelectionRef = useRef<SavedSelection | null>(null);

  if (!visible)
    return null;

  /**
   * 保存当前选区信息
   * 在打开对话框前调用，以便稍后恢复选区
   */
  const saveSelection = (): SavedSelection | null => {
    const editor = chatInputRef.current?.getRawElement();
    if (!editor)
      return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0)
      return null;

    const range = selection.getRangeAt(0);
    const isInEditor = editor.contains(range.commonAncestorContainer);
    const text = selection.toString();

    return {
      range: range.cloneRange(),
      text,
      isInEditor,
    };
  };

  /**
   * 恢复选区并插入文本（支持撤销）
   */
  const restoreAndInsertText = (text: string) => {
    const editor = chatInputRef.current?.getRawElement();
    if (!editor)
      return;

    const saved = savedSelectionRef.current;
    editor.focus();

    const selection = window.getSelection();
    if (!selection)
      return;

    // 如果有保存的选区且在编辑器内，恢复它
    if (saved && saved.isInEditor) {
      try {
        selection.removeAllRanges();
        selection.addRange(saved.range);
      }
      catch {
        // 选区可能已失效，移动到末尾
        const newRange = document.createRange();
        newRange.selectNodeContents(editor);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    else {
      // 没有有效选区，移动到末尾
      const newRange = document.createRange();
      newRange.selectNodeContents(editor);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    // 使用 execCommand 插入文本，支持撤销
    document.execCommand("insertText", false, text);
    chatInputRef.current?.triggerSync();

    // 清除保存的选区
    savedSelectionRef.current = null;
  };

  // 添加注音
  const handleAddRuby = () => {
    // 保存当前选区
    savedSelectionRef.current = saveSelection();
    const selectedText = savedSelectionRef.current?.text || "";

    toastWindow(onClose => (
      <RubyInputDialog
        onConfirm={(text, ruby) => {
          const syntax = `[${text}](${ruby})`;
          restoreAndInsertText(syntax);
          onClose();
        }}
        onClose={onClose}
        initialText={selectedText}
      />
    ));
  };

  // 添加彩色文字
  const handleAddColor = () => {
    // 保存当前选区
    savedSelectionRef.current = saveSelection();
    const selectedText = savedSelectionRef.current?.text || "";

    toastWindow(onClose => (
      <ColorTextDialog
        initialText={selectedText}
        onConfirm={(text, color) => {
          const syntax = `[${text}](style=color:${color})`;
          restoreAndInsertText(syntax);
          onClose();
        }}
        onClose={onClose}
      />
    ));
  };

  // 添加斜体
  const handleAddItalic = () => {
    // 保存当前选区
    savedSelectionRef.current = saveSelection();
    const selectedText = savedSelectionRef.current?.text || "";

    toastWindow(onClose => (
      <ItalicTextDialog
        initialText={selectedText}
        onConfirm={(text) => {
          const syntax = `[${text}](style=color:inherit style-alltext=font-style:italic\\;)`;
          restoreAndInsertText(syntax);
          onClose();
        }}
        onClose={onClose}
      />
    ));
  };

  // 高级样式
  const handleAdvancedStyle = () => {
    // 保存当前选区
    savedSelectionRef.current = saveSelection();
    const selectedText = savedSelectionRef.current?.text || "";

    toastWindow(onClose => (
      <AdvancedStyleDialog
        initialText={selectedText}
        onConfirm={(text, options) => {
          // 构建语法
          const params: string[] = [];

          // style-alltext 参数
          const allTextParts: string[] = [];
          if (options.italic)
            allTextParts.push("font-style:italic");
          if (options.fontSize)
            allTextParts.push(`font-size:${options.fontSize}`);
          if (allTextParts.length > 0) {
            params.push(`style-alltext=${allTextParts.join("\\;")}`);
          }

          // style 参数
          if (options.color) {
            params.push(`style=color:${options.color}`);
          }
          else if (allTextParts.length > 0) {
            // 如果有 style-alltext 但没有 color，需要添加 style=color:inherit 来触发增强语法
            params.push(`style=color:inherit`);
          }

          // ruby 参数
          if (options.ruby) {
            params.push(`ruby=${options.ruby}`);
          }

          const syntax = params.length > 0
            ? `[${text}](${params.join(" ")})`
            : text;

          restoreAndInsertText(syntax);
          onClose();
        }}
        onClose={onClose}
      />
    ));
  };

  return (
    <div className={`flex items-center gap-0.5 text-xs opacity-60 hover:opacity-100 transition-opacity ${className}`}>

      {/* 注音按钮 */}
      <button
        type="button"
        className="btn btn-ghost btn-xs px-1.5 gap-0.5 h-6 min-h-0"
        onClick={handleAddRuby}
        title="添加注音（振り仮名）"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <text x="4" y="20" fontSize="12" fill="currentColor" stroke="none">文</text>
          <text x="14" y="10" fontSize="6" fill="currentColor" stroke="none">あ</text>
        </svg>
        <span>注音</span>
      </button>

      {/* 彩色文字按钮 */}
      <button
        type="button"
        className="btn btn-ghost btn-xs px-1.5 gap-0.5 h-6 min-h-0"
        onClick={handleAddColor}
        title="添加彩色文字"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
          <circle cx="8" cy="8" r="4" fill="#FF0000" />
          <circle cx="16" cy="8" r="4" fill="#00AA00" />
          <circle cx="12" cy="14" r="4" fill="#0088FF" />
        </svg>
        <span>彩色</span>
      </button>

      {/* 斜体按钮 */}
      <button
        type="button"
        className="btn btn-ghost btn-xs px-1.5 gap-0.5 h-6 min-h-0"
        onClick={handleAddItalic}
        title="添加斜体文字"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 5v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V5h-8z" />
        </svg>
        <span>斜体</span>
      </button>

      {/* 高级样式按钮 */}
      <button
        type="button"
        className="btn btn-ghost btn-xs px-1.5 gap-0.5 h-6 min-h-0"
        onClick={handleAdvancedStyle}
        title="高级样式设置"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          <circle cx="12" cy="12" r="4" />
        </svg>
        <span>高级</span>
      </button>
    </div>
  );
}

export default TextStyleToolbar;
