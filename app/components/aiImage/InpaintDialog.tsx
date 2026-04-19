import type { PointerEvent as ReactPointerEvent } from "react";
import type { InpaintDialogSource, InpaintSubmitPayload } from "@/components/aiImage/types";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  EraserIcon,
  FloppyDiskIcon,
  PencilSimpleLineIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type InpaintTool = "paint" | "erase";

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
  const [brushSize, setBrushSize] = useState(24);
  const [tool, setTool] = useState<InpaintTool>("paint");
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
    setBrushSize(24);
    setTool("paint");
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
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    } satisfies CanvasPoint;
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

    if (tool === "erase") {
      context.globalCompositeOperation = "destination-out";
      context.strokeStyle = "rgba(0, 0, 0, 1)";
      context.fillStyle = "rgba(0, 0, 0, 1)";
    }
    else {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = "rgba(252, 90, 123, 0.82)";
      context.fillStyle = "rgba(252, 90, 123, 0.82)";
    }

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
  }, [brushSize, getMaskContext, tool]);

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
    lastPointRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawStroke(point, point);
    if (tool === "paint")
      setHasMask(true);
  }, [drawStroke, pushUndoSnapshot, resolveCanvasPoint, tool]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || drawingPointerIdRef.current !== event.pointerId)
      return;

    const point = resolveCanvasPoint(event);
    const previousPoint = lastPointRef.current;
    if (!point || !previousPoint)
      return;

    event.preventDefault();
    drawStroke(previousPoint, point);
    lastPointRef.current = point;
  }, [drawStroke, resolveCanvasPoint]);

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

  const toolbarButtonClassName = "inline-flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-white/72 transition hover:border-white/24 hover:bg-white/[0.1] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/16 disabled:cursor-not-allowed disabled:opacity-35";
  const floatingPanelClassName = "rounded-md border border-white/10 bg-[#191b31]/94 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur";
  const actionButtonClassName = "inline-flex h-10 items-center justify-center rounded-md border border-white/10 px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/16 disabled:cursor-not-allowed disabled:opacity-40";
  const canUndo = historyVersion >= 0 && undoStackRef.current.length > 0;
  const canRedo = historyVersion >= 0 && redoStackRef.current.length > 0;
  const sourceMeta = useMemo(() => {
    if (!source)
      return "";
    return `${source.width} × ${source.height}`;
  }, [source]);

  if (!isOpen || !source)
    return null;

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-[#111224] text-white">
      <div className="absolute left-4 top-4 z-20 flex flex-col gap-3">
        <div className={floatingPanelClassName}>
          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/64">
            <span>Pen Size</span>
            <span className="text-white">{brushSize}</span>
          </div>
          <input
            type="range"
            min={4}
            max={96}
            step={2}
            value={brushSize}
            className="mt-3 h-1.5 w-40 cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/12 [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[#f6e6a5] [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(17,18,36,0.35)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/12 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#f6e6a5]"
            onChange={event => setBrushSize(Number(event.target.value))}
          />
        </div>

        <div className={`${floatingPanelClassName} flex items-center gap-2`}>
          <button
            type="button"
            className={`${actionButtonClassName} ${tool === "paint" ? "border-[#f6e6a5]/60 bg-[#f6e6a5]/18 text-[#fff3bf]" : "bg-white/[0.04] text-white/78"}`}
            onClick={() => setTool("paint")}
          >
            Draw Mask
          </button>
          <button
            type="button"
            className={`${actionButtonClassName} ${tool === "erase" ? "border-white/28 bg-white/[0.14] text-white" : "bg-white/[0.04] text-white/78"}`}
            onClick={() => setTool("erase")}
          >
            Erase
          </button>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/62">
          {sourceMeta}
        </div>
        <button
          type="button"
          className={`${actionButtonClassName} border-[#f6e6a5]/55 bg-[#f6e6a5] text-[#222133] hover:bg-[#fff1af]`}
          disabled={!hasMask || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          <FloppyDiskIcon className="mr-2 size-[18px]" weight="bold" />
          {isSubmitting ? "保存中" : "Save & Close"}
        </button>
        <button
          type="button"
          className={toolbarButtonClassName}
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
              className={`absolute inset-0 h-full w-full touch-none ${tool === "erase" ? "cursor-cell" : "cursor-crosshair"}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-white/10 bg-[#191b31]/94 px-3 py-2 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur">
          <button
            type="button"
            className={`${toolbarButtonClassName} ${tool === "paint" ? "border-[#f06d8b]/55 bg-[#f06d8b]/18 text-[#ff95ad]" : ""}`}
            aria-label="切换为绘制蒙版"
            title="绘制蒙版"
            onClick={() => setTool("paint")}
          >
            <PencilSimpleLineIcon className="size-[18px]" weight="bold" />
          </button>
          <button
            type="button"
            className={`${toolbarButtonClassName} ${tool === "erase" ? "border-white/24 bg-white/[0.12] text-white" : ""}`}
            aria-label="切换为擦除"
            title="擦除"
            onClick={() => setTool("erase")}
          >
            <EraserIcon className="size-[18px]" weight="bold" />
          </button>
          <div className="mx-1 h-7 w-px bg-white/10" />
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
