import type {
  DragEvent,
  MouseEvent,
} from "react";

import { SelectionPlusIcon } from "@phosphor-icons/react";

import { MediaFrame } from "@/components/common/MediaFrame";
import { MediaImage } from "@/components/common/mediaImage";
import { XMarkICon } from "@/icons";

export const HISTORY_THUMBNAIL_IMAGE_CLASS_NAME = "block h-full w-full object-contain";

type HistoryImageTileProps = {
  active: boolean;
  alt: string;
  dataUrl: string;
  draggable?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onDelete?: (event: MouseEvent<HTMLButtonElement>) => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  showInpaintBadge?: boolean;
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
  showInpaintBadge = false,
  title,
}: HistoryImageTileProps) {
  return (
    <div className={`
      group relative w-[100px] overflow-hidden rounded-md bg-base-100
      shadow-sm
    `}>
      <button
        type="button"
        className="
          relative block h-[100px] w-[100px] cursor-grab overflow-hidden
          text-left
          active:cursor-grabbing
        "
        draggable={draggable}
        aria-label={title}
        title={draggable ? `可拖拽为参考图` : title}
        onClick={onClick}
        onDragStart={onDragStart}
      >
        <MediaFrame aspect="square" selected={active} className="size-full">
          <MediaImage src={dataUrl} className={`
            ${HISTORY_THUMBNAIL_IMAGE_CLASS_NAME}
            transition duration-200
            group-hover:scale-[1.02]
            motion-reduce:transform-none motion-reduce:transition-none
          `} alt={alt} />
          {showInpaintBadge
            ? (
                <div className="
                  pointer-events-none absolute bottom-1.5 right-1.5 flex size-6
                  items-center justify-center rounded-md bg-base-content/65
                  text-base-100 backdrop-blur-sm
                ">
                  <SelectionPlusIcon className="size-3.5" weight="regular" />
                </div>
              )
            : null}
        </MediaFrame>
      </button>

      {onDelete
        ? (
            <button
              type="button"
              className="
                absolute right-0 top-0 flex size-7 items-center justify-center
                rounded-md bg-transparent text-base-content/82 opacity-0
                shadow-none transition
                hover:bg-transparent hover:text-error
                group-focus-within:opacity-100
                group-hover:opacity-100
              "
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
