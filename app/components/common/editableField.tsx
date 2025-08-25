import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";

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
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(queryClient.getQueryData(["editing", fieldId]) as boolean || false);
  useEffect(() => {
    if (fieldId) {
      queryClient.setQueryData(["editing", fieldId], isEditing);
    }
  }, [fieldId, isEditing, queryClient]);

  const [editContent, setEditContent] = useState(content);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 2. 使用 useEffect 在内容变化时调整高度
  useEffect(() => {
    // 仅当处于编辑模式且 textarea 存在时执行
    if (isEditing && !usingInput && textareaRef.current) {
      const textarea = textareaRef.current;
      // 先重置高度，以正确计算缩小时的高度
      textarea.style.height = "auto";
      // 将高度设置为内容所需的实际高度
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing, usingInput, editContent]); // 依赖项包含 editContent，每次输入都会触发

  function handleDoubleClick() {
    if (canEdit) {
      setIsEditing(true);
    }
  }
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
