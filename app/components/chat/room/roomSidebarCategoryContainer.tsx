import type { DragEvent, ReactNode } from "react";

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
        <div className="pointer-events-none absolute left-3 right-3 top-0 -translate-y-1/2 h-0.5 bg-primary/60 rounded" />
      )}

      {isDocCopyDropTarget && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-lg border-2 border-primary/60 bg-primary/5 flex items-center justify-center">
          <div className="px-3 py-2 rounded bg-base-100/80 border border-primary/20 text-xs font-medium text-primary shadow-sm">
            {isSpaceOwner ? "\U93C9\U60E7\U7D11\U6FB6\U5D85\U57D7\U9352\U9881\U6676\U6748\U89C4\U722E" : "\U6D60\U5325P\U9359\UE21A\UE632\U9352\U8DFA\U57CC\U6E1A\U0446\U7ADF\U93CD?"}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
