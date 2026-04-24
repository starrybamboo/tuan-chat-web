import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";

import type { InpaintDialogSource } from "@/components/aiImage/types";
import type { InpaintViewportTransform } from "@/components/aiImage/inpaint/inpaintViewportUtils";

type BrushCursorPoint = {
  x: number;
  y: number;
};

type BrushCursorOverlay = {
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  pixelOutline: {
    segments: Array<{
      orientation: "horizontal" | "vertical";
      left: number;
      top: number;
      length: number;
    }>;
    pixelWidth: number;
    pixelHeight: number;
  } | null;
} | null;

interface InpaintCanvasStageProps {
  canvasViewportRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  source: InpaintDialogSource;
  isViewportPanning: boolean;
  viewportTransform: InpaintViewportTransform;
  viewportScale: number;
  onViewportMouseDownCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onViewportAuxClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerEnter: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: () => void;
  brushCursorPoint: BrushCursorPoint | null;
  activeBrushCursorOverlay: BrushCursorOverlay;
  isSquareBrush: boolean;
  brushCursorStrokeWidth: number;
  brushCursorCrossCanvasSize: number;
  brushCursorStrokeColor: string;
}

export function InpaintCanvasStage({
  canvasViewportRef,
  canvasRef,
  source,
  isViewportPanning,
  viewportTransform,
  viewportScale,
  onViewportMouseDownCapture,
  onViewportAuxClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerEnter,
  onPointerLeave,
  brushCursorPoint,
  activeBrushCursorOverlay,
  isSquareBrush,
  brushCursorStrokeWidth,
  brushCursorCrossCanvasSize,
  brushCursorStrokeColor,
}: InpaintCanvasStageProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="min-h-0 flex-1 px-5 pb-14 pt-16">
        <div
          ref={canvasViewportRef}
          className="relative h-full w-full overflow-hidden overscroll-none"
          onMouseDownCapture={onViewportMouseDownCapture}
          onAuxClick={onViewportAuxClick}
          style={{
            cursor: isViewportPanning ? "grabbing" : "default",
            overscrollBehavior: "none",
          }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: `${source.width}px`,
              height: `${source.height}px`,
              transform: `translate(${viewportTransform.panX}px, ${viewportTransform.panY}px) scale(${viewportScale})`,
            }}
          >
            <img
              src={source.dataUrl}
              alt="inpaint-source"
              className="block h-full w-full select-none object-contain shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full cursor-none touch-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
            />
            {brushCursorPoint
              ? (
                  <div
                    className="pointer-events-none absolute z-10 drop-shadow-[0_0_2px_rgba(5,6,12,0.35)]"
                    style={{
                      left: `${activeBrushCursorOverlay?.rect.left ?? brushCursorPoint.x}px`,
                      top: `${activeBrushCursorOverlay?.rect.top ?? brushCursorPoint.y}px`,
                    }}
                  >
                    <div
                      className="relative block"
                      style={{
                        width: `${activeBrushCursorOverlay?.rect.width ?? 0}px`,
                        height: `${activeBrushCursorOverlay?.rect.height ?? 0}px`,
                      }}
                    >
                      {isSquareBrush
                        ? (
                            <span
                              className="absolute inset-0 border"
                              style={{
                                borderColor: brushCursorStrokeColor,
                                borderWidth: `${brushCursorStrokeWidth}px`,
                                boxSizing: "border-box",
                              }}
                            />
                          )
                        : activeBrushCursorOverlay?.pixelOutline?.segments.map(pixel => (
                            <span
                              key={`${pixel.orientation}:${pixel.left}:${pixel.top}`}
                              className="absolute block"
                              style={{
                                left: `${pixel.orientation === "vertical"
                                  ? pixel.left * (activeBrushCursorOverlay.pixelOutline?.pixelWidth ?? 0) - brushCursorStrokeWidth / 2
                                  : pixel.left * (activeBrushCursorOverlay.pixelOutline?.pixelWidth ?? 0)}px`,
                                top: `${pixel.orientation === "horizontal"
                                  ? pixel.top * (activeBrushCursorOverlay.pixelOutline?.pixelHeight ?? 0) - brushCursorStrokeWidth / 2
                                  : pixel.top * (activeBrushCursorOverlay.pixelOutline?.pixelHeight ?? 0)}px`,
                                width: `${pixel.orientation === "horizontal"
                                  ? pixel.length * (activeBrushCursorOverlay.pixelOutline?.pixelWidth ?? 0)
                                  : brushCursorStrokeWidth}px`,
                                height: `${pixel.orientation === "vertical"
                                  ? pixel.length * (activeBrushCursorOverlay.pixelOutline?.pixelHeight ?? 0)
                                  : brushCursorStrokeWidth}px`,
                                backgroundColor: brushCursorStrokeColor,
                              }}
                            />
                          ))}
                      <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{
                          width: `${brushCursorCrossCanvasSize}px`,
                          height: `${brushCursorStrokeWidth}px`,
                          backgroundColor: brushCursorStrokeColor,
                        }}
                      />
                      <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{
                          width: `${brushCursorStrokeWidth}px`,
                          height: `${brushCursorCrossCanvasSize}px`,
                          backgroundColor: brushCursorStrokeColor,
                        }}
                      />
                    </div>
                  </div>
                )
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
