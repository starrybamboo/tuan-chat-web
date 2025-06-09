import React, { useState } from "react";

export function EditableField({ content, handleContentUpdate, className, canEdit = true, usingInput = false, type = "text" }: {
  content: string; // 显示的内容
  handleContentUpdate: (content: string) => void; // 确认更新内容后的回调函数
  className?: string; // 容器的类名
  canEdit?: boolean; // 是否允许编辑（设置为false时，和普通的<p>没有区别）
  usingInput?: boolean;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"]; // 只有在勾选usingInput为true时，该选项才有用
}) {
  const [isEditing, setIsEditing] = useState(false);
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
