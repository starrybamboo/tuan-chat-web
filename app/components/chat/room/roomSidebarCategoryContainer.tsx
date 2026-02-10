import type { DragEvent, ReactNode } from "react";

import RoomSidebarInsertLine from "@/components/chat/room/roomSidebarInsertLine";

interface RoomSidebarCategoryContainerProps {
  categoryId: string;
  isSpaceOwner: boolean;
  docCopyDropCategoryId: string | null;
  showCategoryInsertLine: boolean;
  handleDocCopyCategoryDragOver: (e: DragEvent, categoryId: string) => void;
  handleDocCopyCategoryDragLeave: (categoryId: string) => void;
  handleDocCopyCategoryDrop: (e: DragEvent, categoryId: string) => void;
  children: ReactNode;
}

export default function RoomSidebarCategoryContainer({
  categoryId,
  isSpaceOwner,
  docCopyDropCategoryId,
  showCategoryInsertLine,
  handleDocCopyCategoryDragOver,
  handleDocCopyCategoryDragLeave,
  handleDocCopyCategoryDrop,
  children,
}: RoomSidebarCategoryContainerProps) {
  const isDocCopyDropTarget = docCopyDropCategoryId === categoryId;

  return (
    <div
      data-tc-sidebar-category={categoryId}
      className={`px-1 relative ${isDocCopyDropTarget ? "outline outline-2 outline-primary/50 rounded-lg" : ""}`}
      onDragOver={e => handleDocCopyCategoryDragOver(e, categoryId)}
      onDragLeave={() => handleDocCopyCategoryDragLeave(categoryId)}
      onDrop={e => handleDocCopyCategoryDrop(e, categoryId)}
    >
      {showCategoryInsertLine && (
        <RoomSidebarInsertLine className="top-0 -translate-y-1/2" />
      )}

      {isDocCopyDropTarget && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-lg border-2 border-primary/60 bg-primary/5 flex items-center justify-center">
          <div className="px-3 py-2 rounded bg-base-100/80 border border-primary/20 text-xs font-medium text-primary shadow-sm">
            {isSpaceOwner ? "松开复制到侧边栏" : "仅KP可复制到空间侧边栏"}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
