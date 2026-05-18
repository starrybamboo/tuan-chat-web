import type { UserRole } from "../../../../api";
import React, { useImperativeHandle, useRef } from "react";
import { extractEditablePlainText } from "@/components/chat/input/chatInputPlainText";
import { getEditorRange } from "@/utils/getSelectionCoords";

// --- 外部接口 ---

/**
 * 这是暴露给父组件 (RoomWindow) 的句柄(Handle)类型。
 * 父组件将通过 ref.current.methodName() 来调用这些函数。
 */
export interface ChatInputAreaHandle {
  /**
   * 命令式地设置 contentEditable div 的内容 (HTML)。
   * 用于父组件清空输入框或设置文本。
   */
  setContent: (
    htmlContent: string,
    options?: {
      moveCursorToEnd?: boolean;
    },
  ) => void;
  /**
   * 让输入框获得焦点
   */
  focus: (options?: {
    moveCursorToEnd?: boolean;
  }) => void;
  /**
   * 在当前光标位置插入一个 DOM 节点或文本。
   * AI 补全和 @提及 功能需要用到此方法。
   */
  insertNodeAtCursor: (
    node: Node | string,
    options?: {
      replaceSelection?: boolean;
      moveCursorToEnd?: boolean;
    },
  ) => boolean;
  /**
   * 获取光标前后的纯文本内容。
   * AI 补全提示需要用到此方法。
   */
  getTextAroundCursor: () => { before: string; after: string };
  /**
   * 返回底层的 DOM 元素。
   * 父组件中的 selection/range 工具可能需要它。
   */
  getRawElement: () => HTMLDivElement | null;
  /**
   * 手动触发一次文本同步。
   * 当父组件（如 @提及）手动修改 DOM 后，需要调用此方法来更新父组件的状态。
   */
  triggerSync: () => void;
  /**
   * 获取纯文本内容。
   */
  getPlainText: () => string;
}

// --- 组件 Props ---

interface ChatInputAreaProps {
  /** 当输入框内容变化时，将解析后的纯文本和提及列表回调给父组件 */
  onInputSync: (plainText: string, textWithoutMentions: string, mentionedRoles: UserRole[]) => void;
  /** 将粘贴的文件回调给父组件 */
  onPasteFiles: (files: File[]) => void;
  /** 转发通用的按键事件，由父组件处理（如提交、AI、@弹窗导航） */
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onKeyUp: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;

  /** 转发 Composition（输入法）开始事件 */
  onCompositionStart: () => void;
  /** 转发 Composition（输入法）结束事件 */
  onCompositionEnd: () => void;
  /** 可选：处理失焦 */
  onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
  /** 可选：处理聚焦 */
  onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void;

  // 简单的状态 Props
  disabled: boolean;
  placeholder: string;

  /** 可选：用于外层自定义高度/滚动等样式 */
  className?: string;
  /** 输入框用途标记：用于区分主输入框和消息编辑框的快捷键行为 */
  inputScope?: "composer" | "message-edit";
}

/**
 * 这是一个封装了 contentEditable div 的受控组件。
 * 它通过 useImperativeHandle 暴露 API 来读写其内部 DOM，
 * 并通过 onInputSync 回调来将其状态（纯文本和提及）同步到父组件。
 */
function ChatInputArea({ ref, ...props }: ChatInputAreaProps & { ref?: React.RefObject<ChatInputAreaHandle | null> }) {
  const internalTextareaRef = useRef<HTMLDivElement>(null);

  // 🔧 修复无限循环：使用 ref 保存 props.onInputSync，避免依赖变化导致重新创建回调
  const onInputSyncRef = useRef(props.onInputSync);

  // 保持 ref 始终指向最新的 callback
  React.useEffect(() => {
    onInputSyncRef.current = props.onInputSync;
  }, [props.onInputSync]);

  /**
   * [内部] 从 DOM 提取 @提及 和纯文本
   */
  const extractMentionsAndTextInternal = (): { mentionedRoles: UserRole[]; textWithoutMentions: string } => {
    const editorDiv = internalTextareaRef.current;
    if (!editorDiv)
      return { mentionedRoles: [], textWithoutMentions: "" };

    const mentionedRoles: UserRole[] = [];
    const mentionSpans = editorDiv.querySelectorAll<HTMLSpanElement>("span[data-role]");

    mentionSpans.forEach((span) => {
      const roleData = span.dataset.role;
      if (roleData) {
        try {
          const role: UserRole = JSON.parse(roleData);
          if (!mentionedRoles.some(r => r.roleId === role.roleId)) {
            mentionedRoles.push(role);
          }
        }
        catch (e) {
          console.error("Failed to parse role data", e);
        }
      }
    });

    const text = extractEditablePlainText(editorDiv, { omitMentions: true });
    return { mentionedRoles, textWithoutMentions: text };
  };

  /**
   *  获取纯文本。
   */
  const getPlainText = (): string => {
    return extractEditablePlainText(internalTextareaRef.current);
  };

  /**
   * [内部 DOM 方法] 在光标处插入节点
   */
  const insertNodeAtCursorInternal = (
    node: Node | string,
    options?: {
      replaceSelection?: boolean;
      moveCursorToEnd?: boolean;
    },
  ): boolean => {
    const { moveCursorToEnd = false, replaceSelection = false } = options || {};
    const selectionInfo = getEditorRange(internalTextareaRef.current);
    const selection = selectionInfo?.selection;
    const range = selectionInfo?.range;
    if (!selection || !range || selection.rangeCount === 0)
      return false;

    const insertedNode = typeof node === "string" ? document.createTextNode(node) : node;
    if (replaceSelection) {
      range.deleteContents();
    }
    range.insertNode(insertedNode);

    if (moveCursorToEnd) {
      const newRange = document.createRange();
      newRange.selectNodeContents(insertedNode);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return true;
  };

  /**
   * [内部 DOM 方法] 获取光标前/后文本
   */
  const getTextAroundCursorInternal = (): { before: string; after: string } => {
    const editor = internalTextareaRef.current;
    if (!editor) {
      return { before: "", after: "" };
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { before: editor.textContent ?? "", after: "" };
    }

    const currentRange = selection.getRangeAt(0);
    const beforeRange = document.createRange();
    beforeRange.setStart(editor, 0);
    beforeRange.setEnd(currentRange.startContainer, currentRange.startOffset);

    const afterRange = document.createRange();
    afterRange.setStart(currentRange.endContainer, currentRange.endOffset);
    afterRange.setEnd(editor, editor.childNodes.length);

    return { before: beforeRange.toString(), after: afterRange.toString() };
  };

  const updateHasTextFlag = () => {
    const editor = internalTextareaRef.current;
    if (!editor)
      return;
    const text = editor.textContent ?? "";
    editor.dataset.hasText = text.trim().length > 0 ? "true" : "false";
  };

  const moveCaretToEnd = () => {
    const editor = internalTextareaRef.current;
    if (!editor) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const isVisuallyEmpty = (text: string) =>
    !text.replace(/[\s\u200B]/g, "");

  /**
   * 清理 contentEditable 中浏览器残留的空块元素，
   * 避免删除换行后高度无法收缩。
   */
  const normalizeTrailingEmptyBlocks = () => {
    const editor = internalTextareaRef.current;
    if (!editor)
      return;

    if (isVisuallyEmpty(editor.textContent ?? "")) {
      if (editor.innerHTML !== "") {
        editor.innerHTML = "";
      }
      return;
    }

    let lastChild = editor.lastChild;
    while (lastChild) {
      if (lastChild.nodeType === Node.TEXT_NODE) {
        if (isVisuallyEmpty(lastChild.textContent ?? "")) {
          const prev = lastChild.previousSibling;
          editor.removeChild(lastChild);
          lastChild = prev;
          continue;
        }
        break;
      }
      if (lastChild.nodeType !== Node.ELEMENT_NODE)
        break;
      const el = lastChild as HTMLElement;
      const tag = el.tagName;
      if (tag !== "DIV" && tag !== "P" && tag !== "BR")
        break;
      if (tag === "BR") {
        const prev = lastChild.previousSibling;
        editor.removeChild(lastChild);
        lastChild = prev;
        continue;
      }
      if (!isVisuallyEmpty(el.textContent ?? ""))
        break;
      const prev = lastChild.previousSibling;
      editor.removeChild(lastChild);
      lastChild = prev;
    }
  };

  /**
   * [事件] 处理输入。这是连接 DOM 和 React 状态的核心桥梁。
   */
  const handleInputInternal = () => {
    normalizeTrailingEmptyBlocks();

    // 移动端 WebKit 在 DOM 节点被移除后不一定重新计算高度，
    // 通过短暂切换 overflow 强制触发 reflow。
    const editor = internalTextareaRef.current;
    if (editor) {
      editor.style.overflow = "hidden";
      void editor.scrollHeight;
      editor.style.overflow = "";
    }

    const { textWithoutMentions, mentionedRoles } = extractMentionsAndTextInternal();
    props.onInputSync(getPlainText(), textWithoutMentions, mentionedRoles);
    updateHasTextFlag();
  };

  /**
   * [事件] 处理粘贴
   */
  const handlePasteInternal = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    if (items.length === 0)
      return;

    // 优先检查文件项：如果有文件（图片/音频/视频/其他），只处理文件并阻止默认，
    // 避免浏览器把 HTML/text 一并插入导致重复内容。
    const fileItems = items.filter(item => item.kind === "file");
    if (fileItems.length > 0) {
      e.preventDefault();
      const files: File[] = [];
      for (const item of fileItems) {
        const blob = item.getAsFile();
        if (blob) {
          const mime = blob.type || "application/octet-stream";
          const ext = (() => {
            const subType = mime.split("/")[1] || "bin";
            const normalized = subType.split(";")[0]?.trim() || "bin";
            return normalized.replace(/[^a-z0-9.+-]/gi, "") || "bin";
          })();
          const typePrefix = mime.startsWith("image/")
            ? "pasted-image"
            : mime.startsWith("audio/")
              ? "pasted-audio"
              : mime.startsWith("video/")
                ? "pasted-video"
                : "pasted-file";
          const file = new File([blob], `${typePrefix}-${Date.now()}.${ext}`, { type: mime });
          files.push(file);
        }
      }
      if (files.length > 0) {
        props.onPasteFiles(files);
      }
      return;
    }

    // 否则只处理纯文本（只插入一次），避免当 clipboard 同时包含 text/html 和 text/plain 时重复插入
    const plainText = e.clipboardData.getData("text/plain");
    if (plainText) {
      e.preventDefault();
      insertNodeAtCursorInternal(document.createTextNode(plainText), {
        replaceSelection: true,
        moveCursorToEnd: true,
      });
      // 手动触发同步更新状态
      handleInputInternal();
    }
    // 如果既没有图片也没有纯文本，允许默认行为（例如复杂 HTML 由浏览器处理）
  };

  React.useEffect(() => {
    updateHasTextFlag();
  }, []);

  // --- 暴露 Ref API ---
  useImperativeHandle(ref, () => ({
    /**
     * API: 设置内容
     */
    setContent: (htmlContent: string, options) => {
      if (internalTextareaRef.current) {
        internalTextareaRef.current.innerHTML = htmlContent;
        updateHasTextFlag();

        if (htmlContent && options?.moveCursorToEnd !== false) {
          moveCaretToEnd();
        }
      }
    },
    /**
     * API: 让输入框获得焦点并将光标移到末尾
     */
    focus: (options) => {
      const editor = internalTextareaRef.current;
      if (editor) {
        editor.focus();
        if (options?.moveCursorToEnd !== false) {
          moveCaretToEnd();
        }
      }
    },
    /**
     * API: 插入节点 (直接暴露内部函数)
     */
    insertNodeAtCursor: insertNodeAtCursorInternal,
    /**
     * API: 获取周围文本 (直接暴露内部函数)
     */
    getTextAroundCursor: getTextAroundCursorInternal,
    /**
     * API: 获取 DOM 元素
     */
    getRawElement: () => internalTextareaRef.current,
    /**
     * API: 手动触发同步
     */
    triggerSync: () => {
      handleInputInternal();
    },
    getPlainText,
  }));

  return (
    <div
      className={`w-full overflow-auto resize-none p-2 focus:outline-none div-textarea chatInputTextarea ${props.className ?? ""}`}
      ref={internalTextareaRef}
      onInput={handleInputInternal} // 使用内部的 input 处理器
      onKeyDown={props.onKeyDown} // 转发给父组件
      onKeyUp={props.onKeyUp} // 转发给父组件
      onMouseDown={props.onMouseDown} // 转发给父组件

      // *** 添加缺失的 Composition 事件处理器 ***
      onCompositionStart={props.onCompositionStart}
      onCompositionEnd={() => {
        // 将 onCompositionEnd 转发给父组件
        props.onCompositionEnd();
        // 修复某些输入法（如 macOS 拼音）结束时不触发 onInput 的 bug
        // 确保在 composition 结束后，状态总是同步的
        handleInputInternal();
      }}

      onPaste={handlePasteInternal} // 使用内部的 paste 处理器
      suppressContentEditableWarning={true}
      contentEditable={!props.disabled}
      data-placeholder={props.placeholder}
      data-chat-input-scope={props.inputScope}
      onBlur={props.onBlur}
      onFocus={props.onFocus}
    />
  );
}

export default ChatInputArea;
