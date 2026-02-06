import React, { memo } from "react";

interface DocRefDragOverlayProps {
  visible: boolean;
  className?: string;
}

const DocRefDragOverlay = memo(({ visible, className }: DocRefDragOverlayProps) => {
  if (!visible)
    return null;

  const insetClass = className ?? "inset-2";
  return (
    <div className={`pointer-events-none absolute ${insetClass} z-30 rounded-md border-2 border-primary/60 bg-primary/5 flex items-center justify-center`}>
      <div className="px-3 py-2 rounded bg-base-100/80 border border-primary/20 text-sm font-medium text-primary shadow-sm">
        松开发送文档卡片
      </div>
    </div>
  );
});

export default DocRefDragOverlay;
