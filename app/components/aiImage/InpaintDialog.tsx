import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { InpaintViewportSize, InpaintViewportTransform } from "@/components/aiImage/inpaint/inpaintViewportUtils";
import type { InpaintDialogSource, InpaintSubmitPayload } from "@/components/aiImage/types";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { triggerBrowserDownload } from "@/components/aiImage/helpers";
import { InpaintBottomBar } from "@/components/aiImage/inpaint/InpaintBottomBar";
import { InpaintCanvasStage } from "@/components/aiImage/inpaint/InpaintCanvasStage";
import { InpaintToolPanel } from "@/components/aiImage/inpaint/InpaintToolPanel";
import { InpaintTopBar } from "@/components/aiImage/inpaint/InpaintTopBar";
import {
  clampInpaintZoom,
  clampViewportPan,
  INPAINT_ZOOM_STEP,

  resolveCenteredViewportPan,
  resolveInpaintViewportSize,
} from "@/components/aiImage/inpaint/inpaintViewportUtils";
import {
  buildBinaryMaskGrid,
  buildMaskOutlineSegments,
  buildMaskSolidColor,
  buildPixelSnappedCircleMaskStamps,
  buildPixelSnappedSquareMaskStampRects,
  getPixelCircleMaskData,
  getPixelCircleMaskOutlineSegments,
  hasAnyMaskAlpha,
  mapSourcePointToMaskPoint,
  MASK_COLOR_OPTIONS,
  normalizeMaskBrushSize,
  projectMaskRectToSourceRect,
  resolveNovelAiMaskBufferSize,
  resolvePixelSnappedCircleMaskStamp,
  resolvePixelSnappedSquareMaskStampRect,
} from "@/components/aiImage/inpaintMaskUtils";

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

interface InpaintViewportPanSession {
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
}
const BRUSH_CURSOR_STROKE_COLOR = "#000000";
const BRUSH_CURSOR_CROSS_SIZE = 13;

export function InpaintDialog({
  isOpen,
  source,
  isSubmitting,
  onClose,
  onSubmit,
}: InpaintDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fillPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingPointerIdRef = useRef<number | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<CanvasPoint | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const viewportPanSessionRef = useRef<InpaintViewportPanSession | null>(null);
  const hasInitializedViewportTransformRef = useRef(false);
  const renderMaskPreviewRef = useRef<() => void>(() => {});

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [strength, setStrength] = useState(1);
  const [brushSize, setBrushSize] = useState(() => normalizeMaskBrushSize(4, "square"));
  const [tool, setTool] = useState<"paint" | "erase">("paint");
  const [maskDrawShape, setMaskDrawShape] = useState<"circle" | "square">("square");
  const [maskColor, setMaskColor] = useState<(typeof MASK_COLOR_OPTIONS)[number]>(MASK_COLOR_OPTIONS[4]);
  const [maskOpacity, setMaskOpacity] = useState(45);
  const [showMaskBorder, setShowMaskBorder] = useState(true);
  const [isBoardPanelOpen, setIsBoardPanelOpen] = useState(false);
  const [brushCursorPoint, setBrushCursorPoint] = useState<BrushCursorPoint | null>(null);
  const [viewportSize, setViewportSize] = useState<InpaintViewportSize>({ width: 0, height: 0 });
  const [viewportTransform, setViewportTransform] = useState<InpaintViewportTransform>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });
  const [isViewportPanning, setIsViewportPanning] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [historyState, setHistoryState] = useState({ version: 0, undoCount: 0, redoCount: 0 });
  const isSquareBrush = maskDrawShape === "square";
  const sourceCanvasSize = useMemo(() => ({
    width: source?.width ?? 0,
    height: source?.height ?? 0,
  }), [source?.height, source?.width]);
  // Match NovelAI: edit the mask on a dedicated 1/8-resolution layer, then scale it back up.
  const maskBufferSize = useMemo(() => resolveNovelAiMaskBufferSize(
    sourceCanvasSize.width,
    sourceCanvasSize.height,
  ), [sourceCanvasSize.height, sourceCanvasSize.width]);
  const fittedViewportWidth = Math.max(1, viewportSize.width);
  const fittedViewportHeight = Math.max(1, viewportSize.height);
  const baseScale = source
    ? Math.min(1, fittedViewportWidth / source.width, fittedViewportHeight / source.height)
    : 1;
  const viewportScale = baseScale * viewportTransform.zoom;

  const ensureBufferCanvas = useCallback((targetRef: { current: HTMLCanvasElement | null }, width: number, height: number) => {
    let bufferCanvas = targetRef.current;
    if (!bufferCanvas) {
      bufferCanvas = document.createElement("canvas");
      targetRef.current = bufferCanvas;
    }
    if (bufferCanvas.width !== width)
      bufferCanvas.width = width;
    if (bufferCanvas.height !== height)
      bufferCanvas.height = height;
    return bufferCanvas;
  }, []);

  const getDisplayContext = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context)
      return null;
    return { canvas, context };
  }, []);

  const getMaskContext = useCallback(() => {
    if (!source || maskBufferSize.width <= 0 || maskBufferSize.height <= 0)
      return null;

    const canvas = ensureBufferCanvas(maskCanvasRef, maskBufferSize.width, maskBufferSize.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context)
      return null;
    return { canvas, context };
  }, [ensureBufferCanvas, maskBufferSize.height, maskBufferSize.width, source]);

  const syncHistoryVersion = useCallback(() => {
    setHistoryState(prev => ({
      version: prev.version + 1,
      undoCount: undoStackRef.current.length,
      redoCount: redoStackRef.current.length,
    }));
  }, []);

  const renderMaskPreview = useCallback(() => {
    const displayTarget = getDisplayContext();
    const maskTarget = getMaskContext();
    if (!displayTarget || !maskTarget)
      return;

    const { canvas: displayCanvas, context: displayContext } = displayTarget;
    const { canvas: maskCanvas, context: maskContext } = maskTarget;
    if (!displayCanvas.width || !displayCanvas.height)
      return;

    displayContext.clearRect(0, 0, displayCanvas.width, displayCanvas.height);

    const fillCanvas = ensureBufferCanvas(fillPreviewCanvasRef, displayCanvas.width, displayCanvas.height);
    const fillContext = fillCanvas.getContext("2d");
    if (!fillContext)
      return;

    fillContext.clearRect(0, 0, fillCanvas.width, fillCanvas.height);
    fillContext.fillStyle = buildMaskSolidColor(maskColor, maskOpacity);
    fillContext.fillRect(0, 0, fillCanvas.width, fillCanvas.height);
    fillContext.globalCompositeOperation = "destination-in";
    // Keep nearest-neighbor scaling so the blocky mask grid remains visible like NovelAI.
    fillContext.imageSmoothingEnabled = false;
    fillContext.drawImage(maskCanvas, 0, 0, fillCanvas.width, fillCanvas.height);
    fillContext.globalCompositeOperation = "source-over";
    displayContext.drawImage(fillCanvas, 0, 0);

    if (!showMaskBorder)
      return;

    const maskGrid = buildBinaryMaskGrid(maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data);
    const outlineSegments = buildMaskOutlineSegments(maskGrid, maskCanvas.width, maskCanvas.height);
    if (outlineSegments.length === 0)
      return;

    const scaleX = displayCanvas.width / maskCanvas.width;
    const scaleY = displayCanvas.height / maskCanvas.height;
    displayContext.save();
    displayContext.beginPath();
    for (const segment of outlineSegments) {
      if (segment.orientation === "horizontal") {
        const y = segment.top * scaleY;
        displayContext.moveTo(segment.left * scaleX, y);
        displayContext.lineTo((segment.left + segment.length) * scaleX, y);
        continue;
      }

      const x = segment.left * scaleX;
      displayContext.moveTo(x, segment.top * scaleY);
      displayContext.lineTo(x, (segment.top + segment.length) * scaleY);
    }
    displayContext.strokeStyle = buildMaskSolidColor(maskColor, Math.max(maskOpacity, 70));
    displayContext.lineWidth = 1;
    displayContext.stroke();
    displayContext.restore();
  }, [
    ensureBufferCanvas,
    getDisplayContext,
    getMaskContext,
    maskColor,
    maskOpacity,
    showMaskBorder,
  ]);

  useEffect(() => {
    renderMaskPreviewRef.current = renderMaskPreview;
  }, [renderMaskPreview]);

  const loadImageFromDataUrl = useCallback(async (dataUrl: string) => {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const target = getMaskContext();
        if (!target) {
          resolve();
          return;
        }
        target.context.clearRect(0, 0, target.canvas.width, target.canvas.height);
        target.context.imageSmoothingEnabled = false;
        target.context.drawImage(image, 0, 0, target.canvas.width, target.canvas.height);
        resolve();
      };
      image.onerror = () => reject(new Error("读取 Inpaint 蒙版失败"));
      image.src = dataUrl;
    });
  }, [getMaskContext]);

  const syncMaskPresence = useCallback(() => {
    const target = getMaskContext();
    if (!target || !target.canvas.width || !target.canvas.height) {
      setHasMask(false);
      return;
    }
    const pixels = target.context.getImageData(0, 0, target.canvas.width, target.canvas.height);
    setHasMask(hasAnyMaskAlpha(pixels.data));
  }, [getMaskContext]);

  const pushUndoSnapshot = useCallback(() => {
    const target = getMaskContext();
    if (!target || !target.canvas.width || !target.canvas.height)
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
    renderMaskPreview();
    syncMaskPresence();
    syncHistoryVersion();
  }, [getMaskContext, renderMaskPreview, syncHistoryVersion, syncMaskPresence]);

  useEffect(() => {
    if (!isOpen || !source)
      return;

    let cancelled = false;

    const initializeDialog = async () => {
      setPrompt(source.prompt);
      setNegativePrompt(source.negativePrompt);
      setStrength(source.strength);
      setBrushSize(normalizeMaskBrushSize(4, "square"));
      setTool("paint");
      setMaskDrawShape("square");
      setMaskColor(MASK_COLOR_OPTIONS[4]);
      setMaskOpacity(45);
      setShowMaskBorder(true);
      setIsBoardPanelOpen(false);
      setBrushCursorPoint(null);
      setViewportTransform({
        zoom: 1,
        panX: 0,
        panY: 0,
      });
      setIsViewportPanning(false);
      setHasMask(false);
      viewportPanSessionRef.current = null;
      hasInitializedViewportTransformRef.current = false;
      undoStackRef.current = [];
      redoStackRef.current = [];
      syncHistoryVersion();

      const displayCanvas = canvasRef.current;
      if (!displayCanvas)
        return;

      displayCanvas.width = source.width;
      displayCanvas.height = source.height;
      displayCanvas.getContext("2d")?.clearRect(0, 0, source.width, source.height);

      const target = getMaskContext();
      if (!target)
        return;

      target.context.clearRect(0, 0, target.canvas.width, target.canvas.height);
      if (source.maskDataUrl) {
        try {
          await loadImageFromDataUrl(source.maskDataUrl);
        }
        catch {
          // 蒙版读取失败时回退为清空状态。
        }
      }

      if (cancelled)
        return;

      renderMaskPreviewRef.current();
      syncMaskPresence();
    };

    void initializeDialog();
    return () => {
      cancelled = true;
    };
  }, [
    getMaskContext,
    isOpen,
    loadImageFromDataUrl,
    source,
    syncHistoryVersion,
    syncMaskPresence,
  ]);

  useEffect(() => {
    if (!isOpen)
      return;

    const viewport = canvasViewportRef.current;
    if (!viewport)
      return;

    const syncViewportSize = () => {
      setViewportSize((previous) => {
        const next = resolveInpaintViewportSize(viewport);
        if (previous.width === next.width && previous.height === next.height)
          return previous;
        return next;
      });
    };

    syncViewportSize();

    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => syncViewportSize());
    resizeObserver?.observe(viewport);
    window.addEventListener("resize", syncViewportSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncViewportSize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen)
      return;

    const handleWindowMouseMove = (event: MouseEvent) => {
      const panSession = viewportPanSessionRef.current;
      if (!panSession || !source)
        return;

      event.preventDefault();
      setViewportTransform((previous) => {
        const scale = baseScale * previous.zoom;
        const content = {
          width: source.width * scale,
          height: source.height * scale,
        };
        const nextPan = clampViewportPan({
          x: panSession.startPanX + (event.clientX - panSession.startClientX),
          y: panSession.startPanY + (event.clientY - panSession.startClientY),
        }, viewportSize, content);
        if (nextPan.x === previous.panX && nextPan.y === previous.panY)
          return previous;
        return {
          ...previous,
          panX: nextPan.x,
          panY: nextPan.y,
        };
      });
    };

    const stopViewportPan = () => {
      if (!viewportPanSessionRef.current)
        return;
      viewportPanSessionRef.current = null;
      setIsViewportPanning(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", stopViewportPan);
    window.addEventListener("blur", stopViewportPan);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", stopViewportPan);
      window.removeEventListener("blur", stopViewportPan);
    };
  }, [baseScale, isOpen, source, viewportSize]);

  useEffect(() => {
    if (!isOpen || !source)
      return;
    renderMaskPreview();
  }, [isOpen, isSquareBrush, maskColor, maskOpacity, renderMaskPreview, showMaskBorder, source]);

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

    const canvasX = (event.clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (event.clientY - rect.top) * (canvas.height / rect.height);

    return {
      canvasPoint: {
        x: canvasX,
        y: canvasY,
      },
      cursorPoint: {
        x: canvasX,
        y: canvasY,
      },
    } satisfies {
      canvasPoint: CanvasPoint;
      cursorPoint: BrushCursorPoint;
    };
  }, []);

  const brushMaskMetrics = useMemo(() => ({
    squareSize: Math.max(1, Math.round(brushSize)),
    radius: Math.max(1, Math.round(brushSize / 2)),
  }), [brushSize]);
  const brushCursorCrossCanvasSize = viewportScale > 0 ? BRUSH_CURSOR_CROSS_SIZE / viewportScale : BRUSH_CURSOR_CROSS_SIZE;
  const brushCursorStrokeWidth = viewportScale > 0 ? 1 / viewportScale : 1;
  const activeBrushCursorOverlay = useMemo(() => {
    if (!brushCursorPoint || sourceCanvasSize.width <= 0 || sourceCanvasSize.height <= 0)
      return null;

    const maskCursorPoint = mapSourcePointToMaskPoint(brushCursorPoint, sourceCanvasSize, maskBufferSize);
    if (isSquareBrush) {
      return {
        rect: projectMaskRectToSourceRect(
          resolvePixelSnappedSquareMaskStampRect(maskCursorPoint.x, maskCursorPoint.y, brushMaskMetrics.squareSize),
          sourceCanvasSize,
          maskBufferSize,
        ),
        pixelOutline: null,
      };
    }

    const circleStamp = resolvePixelSnappedCircleMaskStamp(maskCursorPoint.x, maskCursorPoint.y, brushMaskMetrics.radius);
    const rect = projectMaskRectToSourceRect({
      left: circleStamp.left,
      top: circleStamp.top,
      width: circleStamp.size,
      height: circleStamp.size,
    }, sourceCanvasSize, maskBufferSize);
    const circleOutline = getPixelCircleMaskOutlineSegments(circleStamp.radius);
    const pixelWidth = circleOutline.size > 0 ? rect.width / circleOutline.size : rect.width;
    const pixelHeight = circleOutline.size > 0 ? rect.height / circleOutline.size : rect.height;

    return {
      rect,
      pixelOutline: {
        segments: circleOutline.segments,
        pixelWidth,
        pixelHeight,
      },
    };
  }, [
    brushCursorPoint,
    brushMaskMetrics.radius,
    brushMaskMetrics.squareSize,
    isSquareBrush,
    maskBufferSize,
    sourceCanvasSize,
  ]);

  const applyPixelSnappedCircleStamp = useCallback((
    context: CanvasRenderingContext2D,
    stamp: ReturnType<typeof resolvePixelSnappedCircleMaskStamp>,
    nextTool: "paint" | "erase",
  ) => {
    const circleMaskData = getPixelCircleMaskData(stamp.radius);
    const imageData = context.getImageData(stamp.left, stamp.top, circleMaskData.size, circleMaskData.size);
    for (let index = 0; index < circleMaskData.data.length; index += 1) {
      if (circleMaskData.data[index] !== 1)
        continue;
      const pixelOffset = index * 4;
      if (nextTool === "erase") {
        imageData.data[pixelOffset + 3] = 0;
      }
      else {
        imageData.data[pixelOffset] = 255;
        imageData.data[pixelOffset + 1] = 255;
        imageData.data[pixelOffset + 2] = 255;
        imageData.data[pixelOffset + 3] = 255;
      }
    }
    context.putImageData(imageData, stamp.left, stamp.top);
  }, []);

  const drawStroke = useCallback((from: CanvasPoint, to: CanvasPoint) => {
    const target = getMaskContext();
    if (!target || sourceCanvasSize.width <= 0 || sourceCanvasSize.height <= 0)
      return;

    const maskFrom = mapSourcePointToMaskPoint(from, sourceCanvasSize, maskBufferSize);
    const maskTo = mapSourcePointToMaskPoint(to, sourceCanvasSize, maskBufferSize);
    const { context } = target;
    if (isSquareBrush) {
      context.save();
      if (tool === "erase") {
        context.globalCompositeOperation = "destination-out";
        context.fillStyle = "rgba(0, 0, 0, 1)";
      }
      else {
        context.globalCompositeOperation = "source-over";
        context.fillStyle = "rgba(255, 255, 255, 1)";
      }
      const stampRects = buildPixelSnappedSquareMaskStampRects(maskFrom, maskTo, brushMaskMetrics.squareSize);
      for (const stampRect of stampRects) {
        context.fillRect(stampRect.left, stampRect.top, stampRect.width, stampRect.height);
      }
      context.restore();
    }
    else {
      // NovelAI mask circles also use pixelSnap; they do not fall back to generic arc() strokes.
      const circleStamps = buildPixelSnappedCircleMaskStamps(maskFrom, maskTo, brushMaskMetrics.radius);
      for (const circleStamp of circleStamps)
        applyPixelSnappedCircleStamp(context, circleStamp, tool);
    }
    renderMaskPreview();
  }, [
    applyPixelSnappedCircleStamp,
    brushMaskMetrics.radius,
    brushMaskMetrics.squareSize,
    getMaskContext,
    isSquareBrush,
    maskBufferSize,
    renderMaskPreview,
    sourceCanvasSize,
    tool,
  ]);

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
    if (viewportPanSessionRef.current) {
      setBrushCursorPoint(null);
      return;
    }

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
    if (viewportPanSessionRef.current)
      return;

    const point = resolveCanvasPoint(event);
    if (!point)
      return;
    setBrushCursorPoint(point.cursorPoint);
  }, [resolveCanvasPoint]);

  const handlePointerLeave = useCallback(() => {
    if (!isDrawingRef.current)
      setBrushCursorPoint(null);
  }, []);

  const queueViewportZoom = useCallback((factor: number, clientPoint?: { x: number; y: number }) => {
    const viewport = canvasViewportRef.current;
    if (!viewport || !source || viewportSize.width <= 0 || viewportSize.height <= 0)
      return;

    const viewportRect = viewport.getBoundingClientRect();
    const anchorLeft = clientPoint ? clientPoint.x - viewportRect.left : viewportSize.width / 2;
    const anchorTop = clientPoint ? clientPoint.y - viewportRect.top : viewportSize.height / 2;

    setViewportTransform((previous) => {
      const nextZoom = clampInpaintZoom(previous.zoom * factor);
      if (nextZoom === previous.zoom)
        return previous;

      const previousScale = baseScale * previous.zoom;
      const nextScale = baseScale * nextZoom;
      const contentX = (anchorLeft - previous.panX) / previousScale;
      const contentY = (anchorTop - previous.panY) / previousScale;
      const nextPan = clampViewportPan({
        x: anchorLeft - contentX * nextScale,
        y: anchorTop - contentY * nextScale,
      }, viewportSize, {
        width: source.width * nextScale,
        height: source.height * nextScale,
      });

      return {
        zoom: nextZoom,
        panX: nextPan.x,
        panY: nextPan.y,
      };
    });
  }, [baseScale, source, viewportSize]);

  const handleZoomIn = useCallback(() => {
    queueViewportZoom(INPAINT_ZOOM_STEP);
  }, [queueViewportZoom]);

  const handleZoomOut = useCallback(() => {
    queueViewportZoom(1 / INPAINT_ZOOM_STEP);
  }, [queueViewportZoom]);

  const handleResetZoom = useCallback(() => {
    if (!source || viewportSize.width <= 0 || viewportSize.height <= 0) {
      setViewportTransform({
        zoom: 1,
        panX: 0,
        panY: 0,
      });
      return;
    }

    const centeredPan = resolveCenteredViewportPan(viewportSize, {
      width: source.width * baseScale,
      height: source.height * baseScale,
    });
    setViewportTransform({
      zoom: 1,
      panX: centeredPan.x,
      panY: centeredPan.y,
    });
  }, [baseScale, source, viewportSize]);

  const handleViewportMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 1)
      return;

    event.preventDefault();
    event.stopPropagation();
    viewportPanSessionRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: viewportTransform.panX,
      startPanY: viewportTransform.panY,
    };
    setIsViewportPanning(true);
    setBrushCursorPoint(null);
  }, [viewportTransform.panX, viewportTransform.panY]);

  const handleViewportAuxClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 1)
      return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleBrushSizeChange = useCallback((nextBrushSize: number) => {
    setBrushSize(normalizeMaskBrushSize(nextBrushSize, maskDrawShape));
  }, [maskDrawShape]);

  const handleMaskDrawShapeChange = useCallback((nextShape: "circle" | "square") => {
    setMaskDrawShape(nextShape);
    setBrushSize(previous => normalizeMaskBrushSize(previous, nextShape));
  }, []);

  const handleToggleSquareBrush = useCallback((event?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    handleMaskDrawShapeChange(maskDrawShape === "square" ? "circle" : "square");
  }, [handleMaskDrawShapeChange, maskDrawShape]);

  const handleClearMask = useCallback(() => {
    const target = getMaskContext();
    if (!target || !hasMask)
      return;

    pushUndoSnapshot();
    target.context.clearRect(0, 0, target.canvas.width, target.canvas.height);
    renderMaskPreview();
    setHasMask(false);
  }, [getMaskContext, hasMask, pushUndoSnapshot, renderMaskPreview]);

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
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || !maskCanvas.width || !maskCanvas.height || !source)
      return "";
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = source.width;
    exportCanvas.height = source.height;
    const exportContext = exportCanvas.getContext("2d");
    if (!exportContext)
      return "";
    exportContext.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
    // Persist a full-size PNG while keeping the authored mask geometry from the low-res buffer.
    exportContext.imageSmoothingEnabled = false;
    exportContext.drawImage(maskCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
    return exportCanvas.toDataURL("image/png");
  }, [source]);

  const handleSubmit = useCallback(async () => {
    const nextPrompt = prompt.trim();
    if (!source || !hasMask || isSubmitting)
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

  const topActionButtonClassName = "inline-flex h-10 items-center justify-center border-0 px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-40 rounded-none";
  const topIconActionButtonClassName = "inline-flex size-10 items-center justify-center border-0 bg-base-200 text-base-content/72 transition hover:bg-base-300 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-35 rounded-none";
  const sharedPanelClassName = "rounded-md border border-base-300 bg-base-100 shadow-[0_18px_48px_rgba(0,0,0,0.18)]";
  const bottomToolButtonClassName = "inline-flex size-10 items-center justify-center rounded-md border border-transparent bg-transparent text-base-content/60 transition hover:bg-base-200 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-35";
  const zoomPanelButtonClassName = "inline-flex h-10 items-center justify-center rounded-md border border-transparent bg-transparent px-2 text-base-content/60 transition hover:bg-base-200 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-35";
  const zoomPanelLabelClassName = "inline-flex h-10 min-w-14 items-center justify-center rounded-md border border-base-300 bg-base-200 px-3 text-[11px] font-semibold text-base-content/82 transition hover:bg-base-300 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-primary/20";
  const boardButtonClassName = `${bottomToolButtonClassName} ${isBoardPanelOpen ? "bg-base-300 text-base-content" : ""}`;
  const boardPanelClassName = `absolute right-0 bottom-[calc(100%+10px)] z-30 w-[320px] p-3 ${sharedPanelClassName}`;
  const canUndo = historyState.undoCount > 0;
  const canRedo = historyState.redoCount > 0;
  const zoomLabel = `${Math.round(viewportTransform.zoom * 100)}%`;

  useEffect(() => {
    if (!isOpen || !source || viewportSize.width <= 0 || viewportSize.height <= 0)
      return;

    setViewportTransform((previous) => {
      const content = {
        width: source.width * baseScale * previous.zoom,
        height: source.height * baseScale * previous.zoom,
      };
      if (!hasInitializedViewportTransformRef.current) {
        hasInitializedViewportTransformRef.current = true;
        const centeredPan = resolveCenteredViewportPan(viewportSize, content);
        return {
          ...previous,
          panX: centeredPan.x,
          panY: centeredPan.y,
        };
      }

      const clampedPan = clampViewportPan({
        x: previous.panX,
        y: previous.panY,
      }, viewportSize, content);
      if (clampedPan.x === previous.panX && clampedPan.y === previous.panY)
        return previous;
      return {
        ...previous,
        panX: clampedPan.x,
        panY: clampedPan.y,
      };
    });
  }, [baseScale, isOpen, source, viewportSize]);

  useEffect(() => {
    if (!isOpen)
      return;

    const viewport = canvasViewportRef.current;
    if (!viewport)
      return;

    // 原生 wheel 监听必须显式关闭 passive，才能彻底阻止页面滚动。
    const handleViewportWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      queueViewportZoom(
        event.deltaY < 0 ? INPAINT_ZOOM_STEP : 1 / INPAINT_ZOOM_STEP,
        { x: event.clientX, y: event.clientY },
      );
    };

    viewport.addEventListener("wheel", handleViewportWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleViewportWheel);
  }, [isOpen, queueViewportZoom]);

  if (!isOpen || !source)
    return null;

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-base-200 text-base-content">
      <InpaintToolPanel
        sharedPanelClassName={sharedPanelClassName}
        brushSize={brushSize}
        isSquareBrush={isSquareBrush}
        onBrushSizeChange={handleBrushSizeChange}
        onMaskDrawShapeChange={handleMaskDrawShapeChange}
        onToggleSquareBrush={handleToggleSquareBrush}
      />

      <InpaintTopBar
        hasMask={hasMask}
        isSubmitting={isSubmitting}
        onDownloadSource={handleDownloadSource}
        onSubmit={handleSubmit}
        onClose={onClose}
        topIconActionButtonClassName={topIconActionButtonClassName}
        topActionButtonClassName={topActionButtonClassName}
      />

      <InpaintCanvasStage
        canvasViewportRef={canvasViewportRef}
        canvasRef={canvasRef}
        source={source}
        isViewportPanning={isViewportPanning}
        viewportTransform={viewportTransform}
        viewportScale={viewportScale}
        onViewportMouseDownCapture={handleViewportMouseDown}
        onViewportAuxClick={handleViewportAuxClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrawing}
        onPointerCancel={finishDrawing}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        brushCursorPoint={brushCursorPoint}
        activeBrushCursorOverlay={activeBrushCursorOverlay}
        isSquareBrush={isSquareBrush}
        brushCursorStrokeWidth={brushCursorStrokeWidth}
        brushCursorCrossCanvasSize={brushCursorCrossCanvasSize}
        brushCursorStrokeColor={BRUSH_CURSOR_STROKE_COLOR}
      />

      <InpaintBottomBar
        sharedPanelClassName={sharedPanelClassName}
        zoomPanelButtonClassName={zoomPanelButtonClassName}
        zoomPanelLabelClassName={zoomPanelLabelClassName}
        bottomToolButtonClassName={bottomToolButtonClassName}
        boardButtonClassName={boardButtonClassName}
        boardPanelClassName={boardPanelClassName}
        zoomLabel={zoomLabel}
        tool={tool}
        isBoardPanelOpen={isBoardPanelOpen}
        maskColor={maskColor}
        maskOpacity={maskOpacity}
        showMaskBorder={showMaskBorder}
        hasMask={hasMask}
        canUndo={canUndo}
        canRedo={canRedo}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onZoomIn={handleZoomIn}
        onSetTool={setTool}
        onToggleBoardPanel={() => setIsBoardPanelOpen(prev => !prev)}
        onSetMaskColor={setMaskColor}
        onSetMaskOpacity={setMaskOpacity}
        onSetShowMaskBorder={setShowMaskBorder}
        onClearMask={handleClearMask}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
    </div>
  );
}
