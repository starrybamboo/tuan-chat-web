import { useQueryState } from "@/components/common/customHooks/useQueryState";
import React, { useCallback, useEffect, useRef } from "react";

interface EditableFieldProps {
  /** 显示的内容 */
  content: string;
  /** 确认更新内容后的回调函数 */
  handleContentUpdate: (content: string) => void;
  className?: string;
  /** 是否允许编辑（设置为false时，和普通的<p>没有区别） @default true */
  canEdit?: boolean;
  /** 使用input元素替代textarea @default false */
  usingInput?: boolean;
  /** input元素的type属性（只有在usingInput为true时有效） @default "text" */
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  /** 可选的唯一标识符，填入后会把是否在编辑的状态保存到queryClient中。这主要是由于virtuoso不会保存内部组件的state。 */
  fieldId?: string;
}
export function EditableField({
  content,
  handleContentUpdate,
  className,
  canEdit = true,
  usingInput = false,
  type = "text",
  fieldId,
}: EditableFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isEditing, setIsEditing] = useQueryState<boolean>(["editingMessage", fieldId], false, !!fieldId);
  const [editContent, setEditContent] = useQueryState<string>(["editingMessageContent", fieldId], content, !!fieldId);
  const [cursorPosition, setCursorPosition] = useQueryState<number | null>(["editingMessageCursor", fieldId], null, !!fieldId);

  // 使用 ref 来避免在编辑时被外部 content 更新干扰
  const isEditingRef = useRef(isEditing);
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  // 只在开始编辑时同步外部 content 到 editContent
  useEffect(() => {
    if (isEditing && editContent !== content) {
      // 如果刚进入编辑模式,同步外部内容
      setEditContent(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]); // 只依赖 isEditing,避免在编辑过程中被外部 content 更新干扰

  useEffect(() => {
    if (isEditing && cursorPosition !== null) {
      const element = textareaRef?.current;
      if (!element) {
        return;
      }
      element?.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [isEditing, usingInput, cursorPosition]);

  const saveCursorPosition = (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCursorPosition(e.currentTarget.selectionStart);
  };

  // 使用回调函数来调整高度,避免在每次 editContent 变化时触发 effect
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  // 只在进入编辑模式时调整一次高度
  useEffect(() => {
    if (isEditing && !usingInput) {
      adjustTextareaHeight();
    }
  }, [isEditing, usingInput, adjustTextareaHeight]);

  function handleDoubleClick() {
    if (canEdit) {
      setIsEditing(true);
    }
  }

  // 处理内容变化,同时调整高度
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
    // 立即调整高度而不是通过 useEffect
    if (!usingInput) {
      adjustTextareaHeight();
    }
  };

  return isEditing
    ? (
        usingInput
          ? (
              <input
                className={`${className} input`}
                value={editContent}
                type={type}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
                    handleContentUpdate(editContent);
                  }
                }}
                onBlur={() => {
                  handleContentUpdate(editContent);
                  setIsEditing(false);
                }}
                autoFocus
              />
            )
          : (
              <textarea
                className={`${className} min-w-[18rem] sm:min-w-[26rem] bg-transparent p-2 border-0 border-base-300 rounded-[8px] w-full overflow-hidden resize-none`}
                ref={textareaRef}
                value={editContent}
                onChange={handleChange}
                onKeyUp={saveCursorPosition}
                onClick={saveCursorPosition}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
                    handleContentUpdate(editContent);
                  }
                }}
                onBlur={() => {
                  handleContentUpdate(editContent);
                  setIsEditing(false);
                }}
                autoFocus
              />
            )
      )
    : (
        <div
          className={`${className}`}
          onDoubleClick={handleDoubleClick}
        >
          {content}
        </div>
      );
}
