import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";

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
                className={`${className} border-none bg-transparent textarea w-max editable-textarea`}
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
