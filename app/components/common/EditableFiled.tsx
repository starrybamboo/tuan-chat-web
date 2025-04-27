import React, { useState } from "react";

export function EditableField({ content, handleContentUpdate, className, canEdit = true }: {
  content: string; // 显示的内容
  handleContentUpdate: (content: string) => void; // 确认更新内容后的回调函数
  className?: string; // 容器的类名
  canEdit?: boolean; // 是否允许编辑（设置为false时，和普通的<p>没有区别）
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
        <textarea
          className={`${className} border-none bg-transparent textarea w-full`}
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          onKeyPress={e => e.key === "Enter" && handleContentUpdate(editContent)}
          onBlur={() => {
            handleContentUpdate(editContent);
            setIsEditing(false);
          }}
          autoFocus
        />
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
