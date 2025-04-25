import React, { useState } from "react";

export function EditableField({ content, handleContentUpdate, className, canEdit = true }: { content: string; handleContentUpdate: (content: string) => void; className?: string; canEdit?: boolean }) {
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
