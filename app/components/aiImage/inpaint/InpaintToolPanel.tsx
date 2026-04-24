import { PencilSimpleLineIcon } from "@phosphor-icons/react";

export function InpaintToolPanel({
  sharedPanelClassName,
  brushSize,
  isSquareBrush,
  onBrushSizeChange,
  onMaskDrawShapeChange,
  onToggleSquareBrush,
}: {
  sharedPanelClassName: string;
  brushSize: number;
  isSquareBrush: boolean;
  onBrushSizeChange: (value: number) => void;
  onMaskDrawShapeChange: (shape: "circle" | "square") => void;
  onToggleSquareBrush: () => void;
}) {
  return (
    <div
      className={`pointer-events-auto absolute left-4 top-4 z-20 w-[236px] ${sharedPanelClassName}`}
      onMouseDown={event => event.stopPropagation()}
    >
      <div className="flex h-full items-stretch">
        <div className="flex w-[92px] shrink-0 flex-col items-center justify-center gap-2 border-r border-white/10 px-2 text-[11px] font-medium whitespace-nowrap text-white/88">
          <span className="inline-flex size-6 items-center justify-center rounded-md border border-white/12 bg-white/[0.04] text-white/86">
            <PencilSimpleLineIcon className="size-[16px]" weight="bold" />
          </span>
          <span className="leading-none">Draw Mask</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-white/82">
            <span>Pen Size</span>
            <span>{brushSize}</span>
          </div>
          <input
            type="range"
            min={4}
            max={50}
            step={1}
            value={brushSize}
            className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/12 [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[#f6e6a5] [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(17,18,36,0.35)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/12 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#f6e6a5]"
            onChange={event => onBrushSizeChange(Number(event.target.value))}
          />
          <div className="mt-2 flex select-none items-center gap-2 text-[11px] font-medium text-white/82">
            <input
              type="checkbox"
              checked={isSquareBrush}
              className="size-3.5 rounded border border-white/14 bg-white/[0.04] accent-[#f6e6a5]"
              aria-label="鍚敤鏂瑰舰鐢诲埛"
              onChange={event => onMaskDrawShapeChange(event.target.checked ? "square" : "circle")}
            />
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-[11px] font-medium text-white/82"
              onClick={onToggleSquareBrush}
            >
              Square Brush
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
