import type { UserRole } from "../../../../api";
import { getEditorRange } from "@/utils/getSelectionCoords";
import React, { useImperativeHandle, useRef } from "react";

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
  setContent: (htmlContent: string) => void;
  /**
   * 让输入框获得焦点
   */
  focus: () => void;
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

  // 简单的状态 Props
  disabled: boolean;
  placeholder: string;
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

    const clone = editorDiv.cloneNode(true) as HTMLDivElement;
    const mentionedRoles: UserRole[] = [];
    const mentionSpans = clone.querySelectorAll<HTMLSpanElement>("span[data-role]");

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
      span.parentNode?.removeChild(span);
    });

    const text = (clone.textContent ?? "").replace(/\u00A0/g, " "); // 将提及 span 留下的非断行空格转换回普通空格
    return { mentionedRoles, textWithoutMentions: text };
  };

  /**
   *  获取纯文本。
   */
  const getPlainText = (): string => {
    return internalTextareaRef.current?.textContent || "";
    // return content
    //   .replace(/<br\s*\/?>/gi, "\n")
    //   .replace(/&nbsp;/g, " ")
    //   .replace(/<[^>]+(>|$)/g, ""); // 移除所有其他 HTML
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
    const { moveCursorToEnd = false } = options || {};
    const selectionInfo = getEditorRange(internalTextareaRef.current);
    const selection = selectionInfo?.selection;
    const range = selectionInfo?.range;
    if (!selection || !range || selection.rangeCount === 0)
      return false;

    const insertedNode = typeof node === "string" ? document.createTextNode(node) : node;
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
   * [内部 DOM 方法] 获取光标周围的文本
   */
  const getTextAroundCursorInternal = (): { before: string; after: string } => {
    const editor = internalTextareaRef.current;
    if (!editor)
      return { before: "", after: "" };

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

  /**
   * [事件] 处理输入。这是连接 DOM 和 React 状态的核心桥梁。
   */
  const handleInputInternal = () => {
    // 解析内容并将纯文本和提及列表发送给父组件
    const { textWithoutMentions, mentionedRoles } = extractMentionsAndTextInternal();
    props.onInputSync(getPlainText(), textWithoutMentions, mentionedRoles);
  };

  /**
   * [事件] 处理粘贴
   */
  const handlePasteInternal = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    if (items.length === 0)
      return;

    // 优先检查是否含图片：如果有图片，则只处理图片（并阻止默认），避免文本/HTML 同时被插入多次
    const imageItems = items.filter(i => i.type.startsWith("image/"));
    if (imageItems.length > 0) {
      e.preventDefault();
      const files: File[] = [];
      for (const item of imageItems) {
        const blob = item.getAsFile();
        if (blob) {
          const file = new File([blob], `pasted-image-${Date.now()}`, { type: blob.type });
          files.push(file);
        }
      }
      if (files.length > 0)
        props.onPasteFiles(files);
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

  // --- 暴露 Ref API ---
  useImperativeHandle(ref, () => ({
    /**
     * API: 设置内容
     */
    setContent: (htmlContent: string) => {
      if (internalTextareaRef.current) {
        internalTextareaRef.current.innerHTML = htmlContent;

        // 将光标移动到末尾
        if (htmlContent) {
          const range = document.createRange();
          range.selectNodeContents(internalTextareaRef.current);
          range.collapse(false);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
    },
    /**
     * API: 让输入框获得焦点并将光标移到末尾
     */
    focus: () => {
      const editor = internalTextareaRef.current;
      if (editor) {
        editor.focus();
        // 将光标移到末尾
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
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
      className="w-full overflow-auto resize-none p-2 focus:outline-none div-textarea chatInputTextarea"
      style={{
        wordBreak: "break-all",
        wordWrap: "break-word",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
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
    />
  );
}

export default ChatInputArea;
