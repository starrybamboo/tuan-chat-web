import { useEffect, useRef } from "react";

import {
  CHAT_MESSAGE_BUBBLE_DEFAULT_CLASS,
  CHAT_MESSAGE_ROW_CLASS,
} from "@/components/chat/message/messageCardStyle";
import { MediaImage } from "@/components/common/mediaImage";

const PREVIEW_MESSAGE_META_ROW_CLASS = "flex min-w-0 w-full items-center gap-2 sm:gap-3 relative";
const PREVIEW_MESSAGE_BUBBLE_CLASS = `${CHAT_MESSAGE_BUBBLE_DEFAULT_CLASS} !max-w-full sm:!max-w-full`;

function isCalibrationHintContent(content: string): boolean {
  return content.trim().startsWith("点击进行");
}

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
  /** 预览文案语气 */
  contentTone?: "default" | "warning" | "danger";
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
  contentTone = "default",
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
  const isCalibrationHint = isCalibrationHintContent(content);
  const contentToneStyle = contentTone === "danger"
    ? {
        color: "#F87171",
        textShadow: "0 0 4px rgba(248, 113, 113, 0.62), 0 0 10px rgba(239, 68, 68, 0.28), 0 1px 2px rgba(0, 0, 0, 0.9)",
      }
    : contentTone === "warning" || isCalibrationHint
      ? {
        color: "#FBBF24",
        textShadow: "0 0 4px rgba(251, 191, 36, 0.58), 0 0 10px rgba(34, 211, 238, 0.28), 0 1px 2px rgba(0, 0, 0, 0.9)",
      }
      : undefined;
  const contentToneClassName = contentTone === "danger"
    ? "font-semibold text-error"
    : contentTone === "warning" || isCalibrationHint
      ? "font-semibold text-warning"
      : "";

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
      const nextWidth = Math.max(1, Math.round(destW * dpr));
      const nextHeight = Math.max(1, Math.round(destH * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
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
        const sourceWidth = sourceCanvas.width;
        const sourceHeight = sourceCanvas.height;

        const { destW, destH } = getDestSize();
        const scale = Math.max(destW / sourceWidth, destH / sourceHeight);
        const srcW = destW / scale;
        const srcH = destH / scale;
        const sx = Math.max(0, (sourceWidth - srcW) / 2);
        const sy = Math.max(0, (sourceHeight - srcH) / 2);

        ctx.clearRect(0, 0, destW, destH);
        ctx.drawImage(
          sourceCanvas,
          sx,
          sy,
          srcW,
          srcH,
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
  }, [avatarCanvasRef]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => redrawRef.current?.());
    return () => cancelAnimationFrame(frame);
  }, [renderKey]);

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
              <span
                className="
                  block min-w-10 max-w-full truncate pb-0.5 text-sm
                  font-medium text-base-content/85 transition-all duration-200
                  motion-reduce:transition-none
                  sm:pb-1 sm:text-sm
                "
                title={displayRoleName}
              >
                {displayRoleName}
              </span>
            </div>
          </div>
          <div className={PREVIEW_MESSAGE_BUBBLE_CLASS}>
            <div className={`whitespace-pre-wrap ${contentToneClassName}`} style={contentToneStyle}>{content}</div>
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
              transition-all duration-200 motion-reduce:transition-none
              sm:text-base/6
            ">
              <div className="block min-w-0 truncate" title={displayRoleName}>
                {`【${displayRoleName}】`}
              </div>
            </div>
          </div>
        </div>
        <div className="
          relative transition-all duration-200 rounded-lg px-1.5 py-0.5
          motion-reduce:transition-none
          sm:px-2 sm:py-0.5
          wrap-break-word text-base/normal
          sm:text-sm
          lg:text-base
          hover:bg-base-200/50
        ">
          <div className={`whitespace-pre-wrap ${contentToneClassName}`} style={contentToneStyle}>{content}</div>
        </div>
      </div>
    </div>
  );
}
