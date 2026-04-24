import type {
  DragEvent,
  MouseEvent,
} from "react";

import { XMarkICon } from "@/icons";

export const HISTORY_THUMBNAIL_IMAGE_CLASS_NAME = "block h-full w-full object-contain";

interface HistoryImageTileProps {
  active: boolean;
  alt: string;
  dataUrl: string;
  draggable?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onDelete?: (event: MouseEvent<HTMLButtonElement>) => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  title: string;
}

export function HistoryImageTile({
  active,
  alt,
  dataUrl,
  draggable = false,
  onClick,
  onDelete,
  onDragStart,
  title,
}: HistoryImageTileProps) {
  return (
    <div className={`group relative w-[100px] overflow-hidden rounded-xl border bg-base-100 shadow-sm transition-colors ${active ? "border-primary shadow-[0_0_0_1px_rgba(99,102,241,0.35)]" : "border-base-300 hover:border-primary/45"}`}>
      <button
        type="button"
        className="relative block h-[100px] w-[100px] cursor-grab overflow-hidden text-left active:cursor-grabbing"
        draggable={draggable}
        title={title}
        onClick={onClick}
        onDragStart={onDragStart}
      >
        <img src={dataUrl} className={`${HISTORY_THUMBNAIL_IMAGE_CLASS_NAME} transition duration-200 group-hover:scale-[1.02]`} alt={alt} />
      </button>

      {onDelete
        ? (
            <button
              type="button"
              className="absolute right-0 top-0 flex size-7 items-center justify-center rounded-md bg-transparent text-base-content/82 opacity-0 shadow-none transition hover:bg-transparent hover:text-error group-focus-within:opacity-100 group-hover:opacity-100"
              aria-label="删除绘图记录"
              onClick={onDelete}
            >
              <XMarkICon className="size-4.5" />
            </button>
          )
        : null}
    </div>
  );
}
