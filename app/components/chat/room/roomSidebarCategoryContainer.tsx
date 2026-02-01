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
            {isSpaceOwner ? "鏉惧紑澶嶅埗鍒颁晶杈规爮" : "浠匥P鍙鍒跺埌渚ц竟鏍?"}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
