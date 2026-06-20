import { useEffect, useRef } from "react";

import {
  CHAT_MESSAGE_BUBBLE_DEFAULT_CLASS,
  CHAT_MESSAGE_ROW_CLASS,
} from "@/components/chat/message/messageCardStyle";
import { MediaImage } from "@/components/common/mediaImage";

const PREVIEW_MESSAGE_META_ROW_CLASS = "flex min-w-0 w-full items-center gap-2 sm:gap-3 relative";
const PREVIEW_MESSAGE_BUBBLE_CLASS = `${CHAT_MESSAGE_BUBBLE_DEFAULT_CLASS} !max-w-full sm:!max-w-full`;

/**
 * 展示用聊天气泡组件的属性接口
 */
type DisplayChatBubbleProps = {
  /** 角色名称 */
  roleName: string;
  /** 头像 canvas 引用（优先） */
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

  const avatarFrameClass = useChatBubbleStyle
    ? "size-10 sm:size-12 rounded-full overflow-hidden"
    : "size-9 sm:size-20.5 rounded-md overflow-hidden";
  const displayRoleName = roleName || "Undefined";

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

  const avatarMedia = avatarCanvasRef
    ? (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={displayRoleName}
          className="block size-full"
        />
      )
    : (
        <MediaImage
          src={avatarUrl}
          alt={displayRoleName}
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
        />
      );

  if (useChatBubbleStyle) {
    return (
      <div className={`${CHAT_MESSAGE_ROW_CLASS} min-w-0 max-w-full overflow-hidden`}>
        <div className="shrink-0">
          <div className={avatarFrameClass}>
            {avatarMedia}
          </div>
        </div>
        <div className="flex min-w-0 max-w-full flex-col items-start">
          <div className={PREVIEW_MESSAGE_META_ROW_CLASS}>
            <div className="relative flex min-w-0 max-w-full items-center gap-2">
              <span className="
                block min-w-10 max-w-full truncate pb-0.5 text-sm
                font-medium text-base-content/85 transition-all duration-200
                sm:pb-1 sm:text-sm
              ">
                {displayRoleName}
              </span>
            </div>
          </div>
          <div className={PREVIEW_MESSAGE_BUBBLE_CLASS}>
            <div className="whitespace-pre-wrap">{content}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="
      flex w-full min-w-0 overflow-hidden py-1.5
      sm:py-2
      relative
    ">
      <div className="
        shrink-0 pr-2
        sm:pr-3
      ">
        <div className={avatarFrameClass}>
          {avatarMedia}
        </div>
      </div>
      <div className="
        flex-1 min-w-0 pr-2
        sm:pr-5
      ">
        <div className="
          flex min-w-0 w-full items-center gap-2
          relative
        ">
          <div className="relative flex min-w-0 max-w-full items-center gap-2">
            <div className="
              min-w-10 max-w-full text-sm/5 font-semibold
              transition-all duration-200
              sm:text-base/6
            ">
              <div className="block min-w-0 truncate">
                {`【${displayRoleName}】`}
              </div>
            </div>
          </div>
        </div>
        <div className="
          relative transition-all duration-200 rounded-lg px-1.5 py-0.5
          sm:px-2 sm:py-0.5
          wrap-break-word text-base/normal
          sm:text-sm
          lg:text-base
          hover:bg-base-200/50
        ">
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    </div>
  );
}
