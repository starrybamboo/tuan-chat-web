import { useEffect, useRef } from "react";

/**
 * 展示用聊天气泡组件的属性接口
 */
interface DisplayChatBubbleProps {
  /** 角色名称 */
  roleName: string;
  /** 源 avatar canvas 引用（优先） */
  avatarCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  /** 角色头像 URL 备用，当没有提供源 canvas 时使用 */
  avatarUrl?: string;
  /** 消息内容 */
  content: string;
  /** 可选的渲染版本号，外部 canvas 更新时传入以触发重绘 */
  renderKey?: number;
  /** 是否使用气泡样式，默认为true */
  useChatBubbleStyle?: boolean;
}

/**
 * 纯展示用的聊天气泡组件
 * 不包含任何交互功能，仅用于展示消息
 */
export function DisplayChatBubble({
  roleName,
  content,
  useChatBubbleStyle = true,
  avatarCanvasRef,
  avatarUrl,
  renderKey,
}: DisplayChatBubbleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const avatarUrlRef = useRef<string | null>(null);
  useEffect(() => {
    avatarUrlRef.current = avatarUrl ?? null;
  }, [avatarUrl]);

  // 根据样式决定容器的 css 类和画布目标像素尺寸（大致）
  const containerClass = useChatBubbleStyle
    ? "w-10 h-10 rounded-full overflow-hidden"
    : "w-20 h-20 rounded-md overflow-hidden";

  const redrawRef = useRef<(() => void) | null>(null);

  // 将图片绘制到 canvas，采用 cover 策略以模拟 object-cover
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas)
      return;

    let cancelled = false;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      return;

    const dpr = window.devicePixelRatio || 1;

    const getDestSize = () => {
      const rect = canvas.getBoundingClientRect();
      return {
        destW: Math.max(1, Math.round(rect.width)),
        destH: Math.max(1, Math.round(rect.height)),
      };
    };

    const resizeCanvas = () => {
      const { destW, destH } = getDestSize();
      canvas.width = destW * dpr;
      canvas.height = destH * dpr;
      canvas.style.width = `${destW}px`;
      canvas.style.height = `${destH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();

    // ---------- 绘制函数 ----------
    const sourceCanvas = avatarCanvasRef?.current;
    let img: HTMLImageElement | null = null;

    const drawFromSource = () => {
      if (cancelled || !sourceCanvas)
        return;

      try {
        const sdpr = window.devicePixelRatio || 1;
        const sw = sourceCanvas.width / sdpr;
        const sh = sourceCanvas.height / sdpr;

        const { destW, destH } = getDestSize();
        const scale = Math.max(destW / sw, destH / sh);
        const srcW = destW / scale;
        const srcH = destH / scale;
        const sx = Math.max(0, (sw - srcW) / 2) * sdpr;
        const sy = Math.max(0, (sh - srcH) / 2) * sdpr;

        ctx.clearRect(0, 0, destW, destH);
        ctx.drawImage(
          sourceCanvas,
          sx,
          sy,
          srcW * sdpr,
          srcH * sdpr,
          0,
          0,
          destW,
          destH,
        );
      }
      catch (err) {
        console.warn("drawFromSource failed:", err);
      }
    };

    const drawFromUrl = (url: string) => {
      if (cancelled)
        return;

      if (!img) {
        img = new Image();
        img.crossOrigin = "anonymous";
      }

      const handleDraw = () => {
        if (cancelled || !img?.naturalWidth)
          return;

        const { destW, destH } = getDestSize();
        const scale = Math.max(destW / img.naturalWidth, destH / img.naturalHeight);
        const sw = destW / scale;
        const sh = destH / scale;
        const sx = Math.max(0, (img.naturalWidth - sw) / 2);
        const sy = Math.max(0, (img.naturalHeight - sh) / 2);

        ctx.clearRect(0, 0, destW, destH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, destW, destH);
      };

      img.onload = () => requestAnimationFrame(handleDraw);
      img.onerror = () => !cancelled && ctx.clearRect(0, 0, canvas.width, canvas.height);
      img.src = url;

      if (img.complete && img.naturalWidth) {
        requestAnimationFrame(handleDraw);
      }
    };

    const draw = () => {
      if (cancelled)
        return;

      const srcCanvas = avatarCanvasRef?.current;
      const url = avatarUrlRef.current;

      if (srcCanvas) {
        drawFromSource();
      }
      else if (url) {
        drawFromUrl(url);
      }
      else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    redrawRef.current = draw;

    // ---------- 初始绘制 ----------
    requestAnimationFrame(draw);

    // ---------- Resize Observer ----------
    const ro = new ResizeObserver(() => {
      if (cancelled)
        return;
      resizeCanvas();
      requestAnimationFrame(draw);
    });

    ro.observe(canvas);

    return () => {
      cancelled = true;
      ro.disconnect();
      redrawRef.current = null;
      if (img) {
        img.onload = null;
        img.onerror = null;
      }
    };
  }, [avatarCanvasRef, renderKey]);

  useEffect(() => {
  // 有 source canvas 时，不走 URL 绘制
    if (avatarCanvasRef?.current)
      return;

    // 没有 canvas 或没有 url，没必要画
    if (!canvasRef.current || !avatarUrl)
      return;

    // 只触发重绘，不动结构
    requestAnimationFrame(() => {
    // 这里调用的是【主 effect 里】定义的 draw
      redrawRef.current?.();
    });
  }, [avatarUrl, avatarCanvasRef]);

  return (
    <div>
      {useChatBubbleStyle
        ? (
            <div className="flex w-full items-start gap-1 pb-2">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className={containerClass}>
                  <canvas ref={canvasRef} role="img" aria-label={roleName || "avatar"} className="w-full h-full block" />
                </div>
              </div>
              {/* Content */}
              <div className="flex flex-col items-start">
                <div className="text-sm text-base-content/85 pb-1">{roleName || "Undefined"}</div>
                <div className="max-w-xs sm:max-w-md break-words rounded-lg px-4 py-2 shadow bg-white dark:bg-black">
                  <div className="whitespace-pre-wrap">{content}</div>
                </div>
              </div>
            </div>
          )
        : (
            <div className="flex w-full pb-4">
              {/* 圆角矩形头像 */}
              <div className="flex-shrink-0 mr-3">
                <div className={containerClass}>
                  <canvas ref={canvasRef} role="img" aria-label={roleName || "avatar"} className="w-full h-full block" />
                </div>
              </div>
              {/* 消息内容 */}
              <div className="flex-1 overflow-auto">
                {/* 角色名 */}
                <div className="font-semibold">{roleName || "Undefined"}</div>
                <div className="whitespace-pre-wrap">{content}</div>
              </div>
            </div>
          )}
    </div>
  );
}
