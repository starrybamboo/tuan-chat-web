import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  EraserIcon,
  PaletteIcon,
  PencilSimpleLineIcon,
  TrashIcon,
} from "@phosphor-icons/react";

import { ZoomInIcon as AppZoomInIcon, ZoomOutIcon as AppZoomOutIcon } from "@/icons";
import { MASK_COLOR_OPTIONS } from "@/components/aiImage/inpaintMaskUtils";

export function InpaintBottomBar({
  sharedPanelClassName,
  zoomPanelButtonClassName,
  zoomPanelLabelClassName,
  bottomToolButtonClassName,
  boardButtonClassName,
  boardPanelClassName,
  zoomLabel,
  tool,
  isBoardPanelOpen,
  maskColor,
  maskOpacity,
  showMaskBorder,
  hasMask,
  canUndo,
  canRedo,
  onZoomOut,
  onResetZoom,
  onZoomIn,
  onSetTool,
  onToggleBoardPanel,
  onSetMaskColor,
  onSetMaskOpacity,
  onSetShowMaskBorder,
  onClearMask,
  onUndo,
  onRedo,
}: {
  sharedPanelClassName: string;
  zoomPanelButtonClassName: string;
  zoomPanelLabelClassName: string;
  bottomToolButtonClassName: string;
  boardButtonClassName: string;
  boardPanelClassName: string;
  zoomLabel: string;
  tool: "paint" | "erase";
  isBoardPanelOpen: boolean;
  maskColor: (typeof MASK_COLOR_OPTIONS)[number];
  maskOpacity: number;
  showMaskBorder: boolean;
  hasMask: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onSetTool: (tool: "paint" | "erase") => void;
  onToggleBoardPanel: () => void;
  onSetMaskColor: (color: (typeof MASK_COLOR_OPTIONS)[number]) => void;
  onSetMaskOpacity: (value: number) => void;
  onSetShowMaskBorder: (value: boolean) => void;
  onClearMask: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <>
      <div className="pointer-events-none absolute bottom-16 right-4 z-20">
        <div className={`pointer-events-auto flex items-center gap-1.5 px-2 ${sharedPanelClassName}`}>
          <button
            type="button"
            className={zoomPanelButtonClassName}
            aria-label="缩小画布"
            title="缩小"
            onClick={onZoomOut}
          >
            <span className="inline-flex size-[18px] items-center justify-center" aria-hidden="true">
              <AppZoomOutIcon />
            </span>
          </button>
          <button
            type="button"
            className={zoomPanelLabelClassName}
            aria-label="重置缩放"
            title="重置缩放（滚轮缩放，中键拖动画布）"
            onClick={onResetZoom}
          >
            {zoomLabel}
          </button>
          <button
            type="button"
            className={zoomPanelButtonClassName}
            aria-label="放大画布"
            title="放大"
            onClick={onZoomIn}
          >
            <span className="inline-flex size-[18px] items-center justify-center" aria-hidden="true">
              <AppZoomInIcon />
            </span>
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 w-[830px] max-w-[calc(100vw-6rem)] -translate-x-1/2">
        <div className={`pointer-events-auto flex h-[50px] items-stretch justify-between gap-0 px-2 ${sharedPanelClassName}`}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={`${bottomToolButtonClassName} ${tool === "paint" ? "bg-base-300 text-base-content" : ""}`}
              aria-label="绘制蒙版"
              title="绘制蒙版"
              onClick={() => onSetTool("paint")}
            >
              <PencilSimpleLineIcon className="size-[18px]" weight="bold" />
            </button>
            <button
              type="button"
              className={`${bottomToolButtonClassName} ${tool === "erase" ? "bg-base-300 text-base-content" : ""}`}
              aria-label="擦除蒙版"
              title="擦除蒙版"
              onClick={() => onSetTool("erase")}
            >
              <EraserIcon className="size-[18px]" weight="bold" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative flex items-center">
              <button
                type="button"
                className={boardButtonClassName}
                aria-label="打开调色板"
                title="调色板"
                onClick={onToggleBoardPanel}
              >
                <PaletteIcon className="size-[18px]" weight="bold" />
              </button>
              {isBoardPanelOpen
                ? (
                    <div className={boardPanelClassName}>
                      <div className="mb-3 text-[11px] font-medium text-base-content/55">Mask Color</div>
                      <div className="flex flex-wrap gap-2">
                        {MASK_COLOR_OPTIONS.map(color => (
                          <button
                            key={color}
                            type="button"
                            className={`inline-flex size-6 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                              maskColor === color ? "border-base-content/85 ring-2 ring-primary/20" : "border-base-300"
                            }`}
                            aria-label={`选择蒙版颜色 ${color}`}
                            onClick={() => onSetMaskColor(color)}
                          >
                            <span className="size-4 rounded-full" style={{ backgroundColor: color }} />
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 text-sm font-medium text-base-content">
                        <span>Mask Opacity</span>
                        <span>{maskOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={1}
                        value={maskOpacity}
                        className="mt-2 h-1.5 w-full cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-base-content/10 [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-base-content [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(17,18,36,0.18)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-base-content/10 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-base-content"
                        onChange={event => onSetMaskOpacity(Number(event.target.value))}
                      />

                      <label className="mt-4 flex items-center gap-2 text-[11px] font-medium text-base-content">
                        <input
                          type="checkbox"
                          checked={showMaskBorder}
                          className="size-3.5 rounded border border-base-300 bg-base-100 accent-primary"
                          onChange={event => onSetShowMaskBorder(event.target.checked)}
                        />
                        <span>Border</span>
                      </label>
                    </div>
                  )
                : null}
            </div>
            <button
              type="button"
              className={bottomToolButtonClassName}
              aria-label="清空蒙版"
              title="清空蒙版"
              disabled={!hasMask}
              onClick={onClearMask}
            >
              <TrashIcon className="size-[18px]" weight="bold" />
            </button>
            <button
              type="button"
              className={bottomToolButtonClassName}
              aria-label="撤销"
              title="撤销"
              disabled={!canUndo}
              onClick={onUndo}
            >
              <ArrowCounterClockwiseIcon className="size-[18px]" weight="bold" />
            </button>
            <button
              type="button"
              className={bottomToolButtonClassName}
              aria-label="重做"
              title="重做"
              disabled={!canRedo}
              onClick={onRedo}
            >
              <ArrowClockwiseIcon className="size-[18px]" weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
