import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { InpaintDialogSource, InpaintSubmitPayload } from "@/components/aiImage/types";
import { ZoomInIcon as AppZoomInIcon, ZoomOutIcon as AppZoomOutIcon } from "@/icons";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  DownloadSimpleIcon,
  FloppyDiskIcon,
  EraserIcon,
  PaletteIcon,
  PencilSimpleLineIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { triggerBrowserDownload } from "@/components/aiImage/helpers";
import {
  buildBinaryMaskGrid,
  buildMaskOutlineSegments,
  buildPixelSnappedCircleMaskStamps,
  buildPixelSnappedSquareMaskStampRects,
  buildMaskSolidColor,
  getPixelCircleMaskData,
  getPixelCircleMaskOutlineSegments,
  hasAnyMaskAlpha,
  mapSourcePointToMaskPoint,
  MASK_COLOR_OPTIONS,
  normalizeMaskBrushSize,
  projectMaskRectToSourceRect,
  resolvePixelSnappedCircleMaskStamp,
  resolvePixelSnappedSquareMaskStampRect,
  resolveNovelAiMaskBufferSize,
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

interface InpaintViewportSize {
  width: number;
  height: number;
}

interface InpaintViewportPanSession {
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
}

interface InpaintViewportTransform {
  zoom: number;
  panX: number;
  panY: number;
}

const INPAINT_MIN_ZOOM = 0.5;
const INPAINT_MAX_ZOOM = 4;
const INPAINT_ZOOM_STEP = 1.15;
const BRUSH_CURSOR_STROKE_COLOR = "#000000";
const BRUSH_CURSOR_CROSS_SIZE = 13;

function clampInpaintZoom(value: number) {
  if (!Number.isFinite(value))
    return 1;
  return Math.min(INPAINT_MAX_ZOOM, Math.max(INPAINT_MIN_ZOOM, value));
}

function resolveInpaintViewportSize(element: HTMLDivElement | null): InpaintViewportSize {
  if (!element)
    return { width: 0, height: 0 };
  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(0, Math.floor(rect.width)),
    height: Math.max(0, Math.floor(rect.height)),
  };
}

function resolveCenteredViewportPan(viewport: InpaintViewportSize, content: { width: number; height: number }) {
  return {
    x: (viewport.width - content.width) / 2,
    y: (viewport.height - content.height) / 2,
  };
}

function clampViewportPan(
  pan: { x: number; y: number },
  viewport: InpaintViewportSize,
  content: { width: number; height: number },
) {
  const centered = resolveCenteredViewportPan(viewport, content);
  return {
    x: content.width <= viewport.width
      ? centered.x
      : Math.min(0, Math.max(viewport.width - content.width, pan.x)),
    y: content.height <= viewport.height
      ? centered.y
      : Math.min(0, Math.max(viewport.height - content.height, pan.y)),
  };
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
  const [historyVersion, setHistoryVersion] = useState(0);
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
    setHistoryVersion(prev => prev + 1);
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
    buildBinaryMaskGrid,
    buildMaskOutlineSegments,
    buildMaskSolidColor,
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
    source?.dataUrl,
    source?.height,
    source?.maskDataUrl,
    source?.negativePrompt,
    source?.prompt,
    source?.strength,
    source?.width,
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

  const toolbarButtonClassName = "inline-flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-white/72 transition hover:border-white/24 hover:bg-white/[0.1] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/16 disabled:cursor-not-allowed disabled:opacity-35";
  const topActionButtonClassName = "inline-flex h-10 items-center justify-center border-0 px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/16 disabled:cursor-not-allowed disabled:opacity-40 rounded-none";
  const topIconActionButtonClassName = "inline-flex size-10 items-center justify-center border-0 bg-white/[0.06] text-white/72 transition hover:bg-white/[0.1] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/16 disabled:cursor-not-allowed disabled:opacity-35 rounded-none";
  const sharedPanelClassName = "rounded-md border border-[#2A3138] bg-[#161A1F] shadow-[0_18px_48px_rgba(0,0,0,0.34)]";
  const bottomToolButtonClassName = "inline-flex size-10 items-center justify-center rounded-md border border-transparent bg-transparent text-white/60 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/16 disabled:cursor-not-allowed disabled:opacity-35";
  const zoomPanelButtonClassName = "inline-flex h-10 items-center justify-center rounded-md border border-transparent bg-transparent px-2 text-white/60 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/16 disabled:cursor-not-allowed disabled:opacity-35";
  const zoomPanelLabelClassName = "inline-flex h-10 min-w-14 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] px-3 text-[11px] font-semibold text-white/82 transition hover:bg-white/[0.1] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/16";
  const boardButtonClassName = `${bottomToolButtonClassName} ${isBoardPanelOpen ? "bg-white/[0.12] text-white" : ""}`;
  const boardPanelClassName = `absolute right-0 bottom-[calc(100%+10px)] z-30 w-[320px] p-3 ${sharedPanelClassName}`;
  const canUndo = historyVersion >= 0 && undoStackRef.current.length > 0;
  const canRedo = historyVersion >= 0 && redoStackRef.current.length > 0;
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
    <div className="absolute inset-0 z-50 overflow-hidden bg-base-200 text-white">
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
              onChange={event => handleBrushSizeChange(Number(event.target.value))}
            />
            <div className="mt-2 flex select-none items-center gap-2 text-[11px] font-medium text-white/82">
              <input
                type="checkbox"
                checked={isSquareBrush}
                className="size-3.5 rounded border border-white/14 bg-white/[0.04] accent-[#f6e6a5]"
                aria-label="启用方形画刷"
                onChange={event => handleMaskDrawShapeChange(event.target.checked ? "square" : "circle")}
              />
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 text-[11px] font-medium text-white/82"
                onClick={handleToggleSquareBrush}
              >
                Square Brush
              </button>
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
        <div className="min-h-0 flex-1 px-5 pb-14 pt-16">
          <div
            ref={canvasViewportRef}
            className="relative h-full w-full overflow-hidden overscroll-none"
            onMouseDownCapture={handleViewportMouseDown}
            onAuxClick={handleViewportAuxClick}
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
                                  borderColor: BRUSH_CURSOR_STROKE_COLOR,
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
                                  backgroundColor: BRUSH_CURSOR_STROKE_COLOR,
                                }}
                              />
                            ))}
                        <span
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{
                            width: `${brushCursorCrossCanvasSize}px`,
                            height: `${brushCursorStrokeWidth}px`,
                            backgroundColor: BRUSH_CURSOR_STROKE_COLOR,
                          }}
                        />
                        <span
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{
                            width: `${brushCursorStrokeWidth}px`,
                            height: `${brushCursorCrossCanvasSize}px`,
                            backgroundColor: BRUSH_CURSOR_STROKE_COLOR,
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

      <div className="pointer-events-none absolute bottom-16 right-4 z-20">
        <div className={`pointer-events-auto flex items-center gap-1.5 px-2 ${sharedPanelClassName}`}>
          <button
            type="button"
            className={zoomPanelButtonClassName}
            aria-label="缩小画布"
            title="缩小"
            onClick={handleZoomOut}
          >
            <span className="inline-flex size-[18px] items-center justify-center" aria-hidden="true">
              <AppZoomOutIcon />
            </span>
          </button>
          <button
            type="button"
            className={zoomPanelLabelClassName}
            aria-label="重置缩放"
            title="重置缩放（滚轮缩放，中键拖动）"
            onClick={handleResetZoom}
          >
            {zoomLabel}
          </button>
          <button
            type="button"
            className={zoomPanelButtonClassName}
            aria-label="放大画布"
            title="放大"
            onClick={handleZoomIn}
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
              className={`${bottomToolButtonClassName} ${tool === "paint" ? "bg-white/[0.12] text-white" : ""}`}
              aria-label="绘制蒙版"
              title="绘制蒙版"
              onClick={() => setTool("paint")}
            >
              <PencilSimpleLineIcon className="size-[18px]" weight="bold" />
            </button>
            <button
              type="button"
              className={`${bottomToolButtonClassName} ${tool === "erase" ? "bg-white/[0.12] text-white" : ""}`}
              aria-label="擦除蒙版"
              title="擦除蒙版"
              onClick={() => setTool("erase")}
            >
              <EraserIcon className="size-[18px]" weight="bold" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative flex items-center">
              <button
                type="button"
                className={boardButtonClassName}
                aria-label="打开画板"
                title="画板"
                onClick={() => setIsBoardPanelOpen(prev => !prev)}
              >
                <PaletteIcon className="size-[18px]" weight="bold" />
              </button>
              {isBoardPanelOpen
                ? (
                    <div className={boardPanelClassName}>
                      <div className="mb-3 text-[11px] font-medium text-white/55">Mask Color</div>
                      <div className="flex flex-wrap gap-2">
                        {MASK_COLOR_OPTIONS.map(color => (
                          <button
                            key={color}
                            type="button"
                            className={`inline-flex size-6 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-white/20 ${
                              maskColor === color ? "border-white/85 ring-2 ring-white/20" : "border-white/10"
                            }`}
                            aria-label={`选择蒙版颜色 ${color}`}
                            onClick={() => setMaskColor(color)}
                          >
                            <span className="size-4 rounded-full" style={{ backgroundColor: color }} />
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 text-sm font-medium text-white">
                        <span>Mask Opacity</span>
                        <span>{maskOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={1}
                        value={maskOpacity}
                        className="mt-2 h-1.5 w-full cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/10 [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(17,18,36,0.35)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/10 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
                        onChange={event => setMaskOpacity(Number(event.target.value))}
                      />

                      <label className="mt-4 flex items-center gap-2 text-[11px] font-medium text-white">
                        <input
                          type="checkbox"
                          checked={showMaskBorder}
                          className="size-3.5 rounded border border-white/20 bg-white/[0.04] accent-white"
                          onChange={event => setShowMaskBorder(event.target.checked)}
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
              onClick={handleClearMask}
            >
              <TrashIcon className="size-[18px]" weight="bold" />
            </button>
            <button
              type="button"
              className={bottomToolButtonClassName}
              aria-label="撤销"
              title="撤销"
              disabled={!canUndo}
              onClick={handleUndo}
            >
              <ArrowCounterClockwiseIcon className="size-[18px]" weight="bold" />
            </button>
            <button
              type="button"
              className={bottomToolButtonClassName}
              aria-label="重做"
              title="重做"
              disabled={!canRedo}
              onClick={handleRedo}
            >
              <ArrowClockwiseIcon className="size-[18px]" weight="bold" />
            </button>
          </div>
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
