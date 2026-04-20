import type { PointerEvent as ReactPointerEvent } from "react";
import type { InpaintDialogSource, InpaintSubmitPayload } from "@/components/aiImage/types";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  DownloadSimpleIcon,
  FloppyDiskIcon,
  PencilSimpleLineIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { triggerBrowserDownload } from "@/components/aiImage/helpers";

interface InpaintDialogProps {
  isOpen: boolean;
  source: InpaintDialogSource | null;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: InpaintSubmitPayload) => void | Promise<void>;
}

interface CanvasPoint {
  x: number;
  y: number;
}

interface BrushCursorPoint {
  x: number;
  y: number;
}

function hasAnyMaskPixels(context: CanvasRenderingContext2D, width: number, height: number) {
  const alpha = context.getImageData(0, 0, width, height).data;
  for (let index = 3; index < alpha.length; index += 4) {
    if (alpha[index] > 0)
      return true;
  }
  return false;
}

export function InpaintDialog({
  isOpen,
  source,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: InpaintDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingPointerIdRef = useRef<number | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<CanvasPoint | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [strength, setStrength] = useState(0.7);
  const [brushSize, setBrushSize] = useState(4);
  const [brushCursorPoint, setBrushCursorPoint] = useState<BrushCursorPoint | null>(null);
  const [hasMask, setHasMask] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  const getMaskContext = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context)
      return null;
    return { canvas, context };
  }, []);

  const syncHistoryVersion = useCallback(() => {
    setHistoryVersion(prev => prev + 1);
  }, []);

  const syncMaskPresence = useCallback(() => {
    const target = getMaskContext();
    if (!target) {
      setHasMask(false);
      return;
    }
    setHasMask(hasAnyMaskPixels(target.context, target.canvas.width, target.canvas.height));
  }, [getMaskContext]);

  const pushUndoSnapshot = useCallback(() => {
    const target = getMaskContext();
    if (!target)
      return;

    undoStackRef.current.push(target.context.getImageData(0, 0, target.canvas.width, target.canvas.height));
    redoStackRef.current = [];
    syncHistoryVersion();
  }, [getMaskContext, syncHistoryVersion]);

  const restoreSnapshot = useCallback((snapshot: ImageData) => {
    const target = getMaskContext();
    if (!target)
      return;

    target.context.clearRect(0, 0, target.canvas.width, target.canvas.height);
    target.context.putImageData(snapshot, 0, 0);
    syncMaskPresence();
    syncHistoryVersion();
  }, [getMaskContext, syncHistoryVersion, syncMaskPresence]);

  useEffect(() => {
    if (!isOpen || !source)
      return;

    setPrompt(source.prompt);
    setNegativePrompt(source.negativePrompt);
    setStrength(source.strength);
    setBrushSize(4);
    setBrushCursorPoint(null);
    setHasMask(false);
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryVersion();

    const target = getMaskContext();
    if (!target)
      return;

    target.canvas.width = source.width;
    target.canvas.height = source.height;
    target.context.clearRect(0, 0, target.canvas.width, target.canvas.height);
  }, [getMaskContext, isOpen, source, syncHistoryVersion]);

  useEffect(() => {
    if (!isOpen)
      return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isSubmitting)
          onClose();
        return;
      }

      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey;
      const isRedo = ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y")
        || ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z");

      if (isUndo && undoStackRef.current.length > 0) {
        event.preventDefault();
        const target = getMaskContext();
        const previousSnapshot = undoStackRef.current.pop();
        if (!target || !previousSnapshot)
          return;
        redoStackRef.current.push(target.context.getImageData(0, 0, target.canvas.width, target.canvas.height));
        restoreSnapshot(previousSnapshot);
        return;
      }

      if (isRedo && redoStackRef.current.length > 0) {
        event.preventDefault();
        const target = getMaskContext();
        const nextSnapshot = redoStackRef.current.pop();
        if (!target || !nextSnapshot)
          return;
        undoStackRef.current.push(target.context.getImageData(0, 0, target.canvas.width, target.canvas.height));
        restoreSnapshot(nextSnapshot);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [getMaskContext, isOpen, isSubmitting, onClose, restoreSnapshot]);

  const resolveCanvasPoint = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas)
      return null;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height)
      return null;

    return {
      canvasPoint: {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
      },
      cursorPoint: {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      },
    } satisfies {
      canvasPoint: CanvasPoint;
      cursorPoint: BrushCursorPoint;
    };
  }, []);

  const drawStroke = useCallback((from: CanvasPoint, to: CanvasPoint) => {
    const target = getMaskContext();
    if (!target)
      return;

    const { context } = target;
    context.save();
    context.lineCap = "square";
    context.lineJoin = "miter";
    context.lineWidth = brushSize;
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = "rgba(255, 255, 255, 1)";
    context.fillStyle = "rgba(255, 255, 255, 1)";

    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();

    context.fillRect(
      to.x - brushSize / 2,
      to.y - brushSize / 2,
      brushSize,
      brushSize,
    );
    context.restore();
  }, [brushSize, getMaskContext]);

  const finishDrawing = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || drawingPointerIdRef.current !== event.pointerId)
      return;

    isDrawingRef.current = false;
    lastPointRef.current = null;
    drawingPointerIdRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    catch {
      // ignore
    }
    syncMaskPresence();
  }, [syncMaskPresence]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0)
      return;

    const point = resolveCanvasPoint(event);
    if (!point)
      return;

    pushUndoSnapshot();
    event.preventDefault();
    drawingPointerIdRef.current = event.pointerId;
    isDrawingRef.current = true;
    lastPointRef.current = point.canvasPoint;
    setBrushCursorPoint(point.cursorPoint);
    event.currentTarget.setPointerCapture(event.pointerId);
    drawStroke(point.canvasPoint, point.canvasPoint);
    setHasMask(true);
  }, [drawStroke, pushUndoSnapshot, resolveCanvasPoint]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = resolveCanvasPoint(event);
    if (point)
      setBrushCursorPoint(point.cursorPoint);

    if (!isDrawingRef.current || drawingPointerIdRef.current !== event.pointerId)
      return;

    const previousPoint = lastPointRef.current;
    if (!point || !previousPoint)
      return;

    event.preventDefault();
    drawStroke(previousPoint, point.canvasPoint);
    lastPointRef.current = point.canvasPoint;
  }, [drawStroke, resolveCanvasPoint]);

  const handlePointerEnter = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = resolveCanvasPoint(event);
    if (!point)
      return;
    setBrushCursorPoint(point.cursorPoint);
  }, [resolveCanvasPoint]);

  const handlePointerLeave = useCallback(() => {
    if (!isDrawingRef.current)
      setBrushCursorPoint(null);
  }, []);

  const handleClearMask = useCallback(() => {
    const target = getMaskContext();
    if (!target || !hasMask)
      return;

    pushUndoSnapshot();
    target.context.clearRect(0, 0, target.canvas.width, target.canvas.height);
    setHasMask(false);
  }, [getMaskContext, hasMask, pushUndoSnapshot]);

  const handleUndo = useCallback(() => {
    const target = getMaskContext();
    const previousSnapshot = undoStackRef.current.pop();
    if (!target || !previousSnapshot)
      return;

    redoStackRef.current.push(target.context.getImageData(0, 0, target.canvas.width, target.canvas.height));
    restoreSnapshot(previousSnapshot);
  }, [getMaskContext, restoreSnapshot]);

  const handleRedo = useCallback(() => {
    const target = getMaskContext();
    const nextSnapshot = redoStackRef.current.pop();
    if (!target || !nextSnapshot)
      return;

    undoStackRef.current.push(target.context.getImageData(0, 0, target.canvas.width, target.canvas.height));
    restoreSnapshot(nextSnapshot);
  }, [getMaskContext, restoreSnapshot]);

  const buildMaskDataUrl = useCallback(() => {
    const target = getMaskContext();
    if (!target)
      return "";

    const { canvas, context } = target;
    const sourcePixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportContext = exportCanvas.getContext("2d");
    if (!exportContext)
      return "";

    const exportPixels = exportContext.createImageData(exportCanvas.width, exportCanvas.height);
    for (let index = 0; index < sourcePixels.data.length; index += 4) {
      const alpha = sourcePixels.data[index + 3];
      if (!alpha)
        continue;
      exportPixels.data[index] = 255;
      exportPixels.data[index + 1] = 255;
      exportPixels.data[index + 2] = 255;
      exportPixels.data[index + 3] = alpha;
    }
    exportContext.putImageData(exportPixels, 0, 0);
    return exportCanvas.toDataURL("image/png");
  }, [getMaskContext]);

  const handleSubmit = useCallback(async () => {
    const nextPrompt = prompt.trim();
    if (!source || !nextPrompt || !hasMask || isSubmitting)
      return;

    const maskDataUrl = buildMaskDataUrl();
    if (!maskDataUrl)
      return;

    await onSubmit({
      prompt: nextPrompt,
      negativePrompt,
      strength,
      maskDataUrl,
    });
  }, [buildMaskDataUrl, hasMask, isSubmitting, negativePrompt, onSubmit, prompt, source, strength]);

  const handleDownloadSource = useCallback(() => {
    if (!source)
      return;

    triggerBrowserDownload(source.dataUrl, `inpaint-source-${source.seed}.png`);
  }, [source]);

  const toolbarButtonClassName = "inline-flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-white/72 transition hover:border-white/24 hover:bg-white/[0.1] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/16 disabled:cursor-not-allowed disabled:opacity-35";
  const topActionButtonClassName = "inline-flex h-10 items-center justify-center border-0 px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/16 disabled:cursor-not-allowed disabled:opacity-40 rounded-none";
  const topIconActionButtonClassName = "inline-flex size-10 items-center justify-center border-0 bg-white/[0.06] text-white/72 transition hover:bg-white/[0.1] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/16 disabled:cursor-not-allowed disabled:opacity-35 rounded-none";
  const canUndo = historyVersion >= 0 && undoStackRef.current.length > 0;
  const canRedo = historyVersion >= 0 && redoStackRef.current.length > 0;

  if (!isOpen || !source)
    return null;

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-base-200 text-white">
      <div className="absolute left-4 top-4 z-20 overflow-hidden rounded-md border border-white/10 bg-[#191b31]/94 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur">
        <div className="flex items-stretch">
          <button
            type="button"
            className="flex min-h-[96px] w-24 flex-col items-center justify-center gap-2 border-r border-white/10 bg-[#14172c] px-3 text-sm font-medium text-white/88 transition hover:bg-[#171a31] focus:outline-none focus:ring-2 focus:ring-white/16"
          >
            <span className="inline-flex size-7 items-center justify-center rounded-md border border-white/12 bg-white/[0.04] text-white/86">
              <PencilSimpleLineIcon className="size-[18px]" weight="bold" />
            </span>
            <span className="leading-none">Draw Mask</span>
          </button>
          <div className="min-w-[160px] px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/64">
              Pen Size: {brushSize}
            </div>
            <input
              type="range"
              min={4}
              max={50}
              step={1}
              value={brushSize}
              className="mt-3 h-1.5 w-40 cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/12 [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[#f6e6a5] [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(17,18,36,0.35)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/12 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#f6e6a5]"
              onChange={event => setBrushSize(Number(event.target.value))}
            />
            <div className="mt-3 flex items-center gap-2 text-sm text-white/78">
              <span className="inline-flex size-4 shrink-0 border border-white/14 bg-[#0f1221]" />
              <span>Square Brush</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-stretch overflow-hidden border border-white/10 shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
        <button
          type="button"
          className={topIconActionButtonClassName}
          aria-label="下载原图"
          title="下载原图"
          disabled={isSubmitting}
          onClick={handleDownloadSource}
        >
          <DownloadSimpleIcon className="size-[18px]" weight="bold" />
        </button>
        <button
          type="button"
          className={`${topActionButtonClassName} border-l border-white/10 bg-[#f6e6a5] text-[#222133] hover:bg-[#fff1af]`}
          disabled={!hasMask || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          <FloppyDiskIcon className="mr-2 size-[18px]" weight="bold" />
          {isSubmitting ? "保存中" : "Save & Close"}
        </button>
        <button
          type="button"
          className={`${topIconActionButtonClassName} border-l border-white/10`}
          aria-label="关闭 Inpaint"
          title="关闭 Inpaint"
          disabled={isSubmitting}
          onClick={onClose}
        >
          <XIcon className="size-[18px]" weight="bold" />
        </button>
      </div>

      <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center px-5 pb-24 pt-20">
          <div className="relative flex max-h-full max-w-full items-center justify-center">
            <img
              src={source.dataUrl}
              alt="inpaint-source"
              className="block max-h-[calc(100vh-11rem)] max-w-[calc(100vw-6rem)] select-none object-contain shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full cursor-none touch-none opacity-0"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
              onPointerEnter={handlePointerEnter}
              onPointerLeave={handlePointerLeave}
            />
            {brushCursorPoint
              ? (
                  <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_2px_rgba(5,6,12,0.35)]"
                    style={{ left: `${brushCursorPoint.x}px`, top: `${brushCursorPoint.y}px` }}
                  >
                    <svg viewBox="0 0 24 24" className="block size-6 text-white/80">
                      <path
                        d="M6 3H9V5H7V7H5V9H3V15H5V17H7V19H9V21H15V19H17V17H19V15H21V9H19V7H17V5H15V3H9V5H6V3Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinejoin="miter"
                        strokeLinecap="square"
                      />
                      <path
                        d="M12 7V17M7 12H17"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        strokeLinejoin="miter"
                        strokeLinecap="square"
                      />
                    </svg>
                  </div>
                )
              : null}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-white/10 bg-[#191b31]/94 px-3 py-2 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur">
          <button
            type="button"
            className={toolbarButtonClassName}
            aria-label="清空蒙版"
            title="清空蒙版"
            disabled={!hasMask}
            onClick={handleClearMask}
          >
            <TrashIcon className="size-[18px]" weight="bold" />
          </button>
          <button
            type="button"
            className={toolbarButtonClassName}
            aria-label="撤销"
            title="撤销"
            disabled={!canUndo}
            onClick={handleUndo}
          >
            <ArrowCounterClockwiseIcon className="size-[18px]" weight="bold" />
          </button>
          <button
            type="button"
            className={toolbarButtonClassName}
            aria-label="重做"
            title="重做"
            disabled={!canRedo}
            onClick={handleRedo}
          >
            <ArrowClockwiseIcon className="size-[18px]" weight="bold" />
          </button>
        </div>
      </div>

      {error
        ? (
            <div className="absolute bottom-4 right-4 z-20 rounded-md border border-[#ff6b82]/30 bg-[#2c1720]/92 px-3 py-2 text-sm text-[#ffb4c0] shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
              {error}
            </div>
          )
        : null}
    </div>
  );
}
