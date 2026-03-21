import type { PointerEvent as ReactPointerEvent } from "react";
import type { InpaintDialogSource, InpaintSubmitPayload } from "@/components/aiImage/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatSliderValue, modelLabel } from "@/components/aiImage/helpers";
import { CloseIcon, EditIcon } from "@/icons";

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

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [strength, setStrength] = useState(0.7);
  const [brushSize, setBrushSize] = useState(48);
  const [tool, setTool] = useState<InpaintTool>("paint");
  const [hasMask, setHasMask] = useState(false);

  useEffect(() => {
    if (!isOpen || !source)
      return;

    setPrompt(source.prompt);
    setNegativePrompt(source.negativePrompt);
    setStrength(source.strength);
    setBrushSize(48);
    setTool("paint");
    setHasMask(false);

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context)
      return;

    canvas.width = source.width;
    canvas.height = source.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, [isOpen, source]);

  const syncMaskPresence = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      setHasMask(false);
      return;
    }
    setHasMask(hasAnyMaskPixels(context, canvas.width, canvas.height));
  }, []);

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
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context)
      return;

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = brushSize;

    if (tool === "erase") {
      context.globalCompositeOperation = "destination-out";
      context.strokeStyle = "rgba(0, 0, 0, 1)";
      context.fillStyle = "rgba(0, 0, 0, 1)";
    }
    else {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = "rgba(59, 130, 246, 0.82)";
      context.fillStyle = "rgba(59, 130, 246, 0.82)";
    }

    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();

    context.beginPath();
    context.arc(to.x, to.y, brushSize / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }, [brushSize, tool]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0)
      return;

    const point = resolveCanvasPoint(event);
    if (!point)
      return;

    event.preventDefault();
    drawingPointerIdRef.current = event.pointerId;
    isDrawingRef.current = true;
    lastPointRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawStroke(point, point);
    if (tool === "paint")
      setHasMask(true);
  }, [drawStroke, resolveCanvasPoint, tool]);

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

  const handleClearMask = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context)
      return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasMask(false);
  }, []);

  const buildMaskDataUrl = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context)
      return "";

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
  }, []);

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

  const sourceMeta = useMemo(() => {
    if (!source)
      return "暂无可编辑的图像";
    return [
      `${source.width}×${source.height}`,
      `seed: ${source.seed}`,
      modelLabel(source.model),
    ].join(" · ");
  }, [source]);

  return (
    <dialog
      open={isOpen}
      className={`modal ${isOpen ? "modal-open" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box relative flex max-h-[min(94vh,1100px)] max-w-[min(96vw,1560px)] flex-col overflow-hidden border border-base-300 bg-base-100 p-0 text-base-content shadow-xl">
        <div className="flex items-center gap-3 border-b border-base-300 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-base font-semibold">
              <EditIcon className="size-4" />
              <span>Inpaint</span>
            </div>
            <div className="mt-1 truncate text-xs text-base-content/60">{sourceMeta}</div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle border border-base-300 bg-base-200 text-base-content hover:bg-base-300"
            aria-label="关闭 Inpaint"
            title="关闭 Inpaint"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-0 overflow-auto bg-base-200/35 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="join rounded-xl bg-base-100 p-1 shadow-sm">
                <button
                  type="button"
                  className={`btn btn-sm join-item border-0 ${tool === "paint" ? "bg-primary text-primary-content" : "bg-transparent text-base-content/70 hover:bg-base-200 hover:text-base-content"}`}
                  onClick={() => setTool("paint")}
                >
                  绘制蒙版
                </button>
                <button
                  type="button"
                  className={`btn btn-sm join-item border-0 ${tool === "erase" ? "bg-base-content text-base-100" : "bg-transparent text-base-content/70 hover:bg-base-200 hover:text-base-content"}`}
                  onClick={() => setTool("erase")}
                >
                  擦除
                </button>
              </div>
              <label className="ml-auto flex items-center gap-3 rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-xs shadow-sm">
                <span className="uppercase tracking-[0.16em] text-base-content/55">Brush</span>
                <input
                  type="range"
                  min={8}
                  max={192}
                  step={2}
                  value={brushSize}
                  onChange={event => setBrushSize(Number(event.target.value))}
                />
                <span className="font-mono text-base-content/75">
                  {brushSize}
                  px
                </span>
              </label>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={!hasMask}
                onClick={handleClearMask}
              >
                清空蒙版
              </button>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm">
              <div className="mb-3 text-xs leading-5 text-base-content/65">
                在图像上涂抹需要重绘的区域。蓝色覆盖层会被送入 NovelAI 的 `infill` 请求，其余区域保持不变。
              </div>
              <div className="flex justify-center overflow-auto rounded-2xl bg-base-200/40 p-3">
                {source
                  ? (
                      <div className="relative inline-block">
                        <img
                          src={source.dataUrl}
                          alt="inpaint-source"
                          className="block max-h-[70vh] max-w-full rounded-xl border border-base-300 object-contain shadow-sm"
                        />
                        <canvas
                          ref={canvasRef}
                          className="absolute inset-0 h-full w-full touch-none rounded-xl"
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={finishDrawing}
                          onPointerCancel={finishDrawing}
                        />
                      </div>
                    )
                  : <div className="py-20 text-sm text-base-content/60">暂无可编辑的图像</div>}
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-auto border-l border-base-300 bg-base-100 p-4">
            <div className="rounded-2xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-5 text-base-content/80">
              Inpaint 会消耗 NovelAI Anlas。当前页面仍保持单张、1024 以内和
              <code>steps &lt;= 28</code>
              的限制，其他付费入口继续关闭。
            </div>

            <label className="mt-4 block">
              <div className="mb-2 text-sm font-medium">Prompt</div>
              <textarea
                className="textarea textarea-bordered min-h-36 w-full resize-none bg-base-100"
                value={prompt}
                disabled={isSubmitting}
                onChange={event => setPrompt(event.target.value)}
              />
            </label>

            <label className="mt-4 block">
              <div className="mb-2 text-sm font-medium">Undesired Content</div>
              <textarea
                className="textarea textarea-bordered min-h-28 w-full resize-none bg-base-100"
                value={negativePrompt}
                disabled={isSubmitting}
                onChange={event => setNegativePrompt(event.target.value)}
              />
            </label>

            <label className="mt-4 block rounded-2xl border border-base-300 bg-base-200/30 px-3 py-3">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-sm font-medium">Strength</div>
                  <div className="mt-1 text-xs text-base-content/60">数值越高，重绘区域偏离原图越明显。</div>
                </div>
                <div className="ml-auto font-mono text-sm text-base-content/75">{formatSliderValue(strength)}</div>
              </div>
              <input
                type="range"
                className="range range-primary mt-3"
                min={0.01}
                max={1}
                step={0.01}
                value={strength}
                disabled={isSubmitting}
                onChange={event => setStrength(Number(event.target.value))}
              />
            </label>

            <div className="mt-4 rounded-2xl border border-base-300 bg-base-200/20 px-3 py-3 text-xs leading-5 text-base-content/65">
              当前蒙版状态：
              {hasMask ? " 已检测到可提交的绘制区域。" : " 还没有绘制蒙版。"}
            </div>

            {error ? <div className="mt-4 text-sm text-error">{error}</div> : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={isSubmitting}
                onClick={onClose}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!source || isSubmitting || !prompt.trim() || !hasMask}
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? "生成中..." : "开始 Inpaint"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
