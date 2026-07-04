import { memo } from "react";

type DocRefDragOverlayProps = {
  visible: boolean;
  label?: string;
  className?: string;
}

const DocRefDragOverlay = memo(({ visible, label = "松开发送文档卡片", className }: DocRefDragOverlayProps) => {
  if (!visible)
    return null;

  const insetClass = className ?? "inset-2";
  return (
    <div className={`
      pointer-events-none absolute
      ${insetClass}
      z-30 rounded-md border-2 border-info/60 bg-info/5 flex items-center
      justify-center
    `}>
      <div className="
        px-3 py-2 rounded bg-base-100/80 border border-info/20 text-sm
        font-medium text-info shadow-sm
      ">
        {label}
      </div>
    </div>
  );
});

export default DocRefDragOverlay;
