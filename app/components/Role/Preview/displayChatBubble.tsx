import { useEffect, useRef } from "react";

/**
 * 展示用聊天气泡组件的属性接口
 */
interface DisplayChatBubbleProps {
  /** 角色名称 */
  roleName: string;
  /** 源 avatar canvas 引用（优先） */
  avatarCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
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
  renderKey,
}: DisplayChatBubbleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 根据样式决定容器的 css 类和画布目标像素尺寸（大致）
  const containerClass = useChatBubbleStyle
    ? "w-10 h-10 rounded-full overflow-hidden"
    : "w-20 h-20 rounded-md overflow-hidden";

  // 将图片绘制到 canvas，采用 cover 策略以模拟 object-cover
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas)
      return;

    let cancelled = false;
    // 仅从提供的源 canvas 复制像素；如果未提供，则清空画布
    const sourceCanvas = avatarCanvasRef?.current;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const destW = Math.max(1, Math.round(rect.width));
    const destH = Math.max(1, Math.round(rect.height));

    canvas.width = destW * dpr;
    canvas.height = destH * dpr;
    canvas.style.width = `${destW}px`;
    canvas.style.height = `${destH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!sourceCanvas) {
      ctx.clearRect(0, 0, destW, destH);
      return () => {
        cancelled = true;
      };
    }

    const drawFromSource = () => {
      if (cancelled)
        return;
      try {
        // sourceCanvas 的内部像素尺寸可能已经是高 DPI，这里计算 CSS 像素尺寸
        const sw = sourceCanvas.width / (window.devicePixelRatio || 1);
        const sh = sourceCanvas.height / (window.devicePixelRatio || 1);
        const scale = Math.max(destW / sw, destH / sh);
        const srcW = destW / scale;
        const srcH = destH / scale;
        const sx = Math.max(0, (sw - srcW) / 2) * (window.devicePixelRatio || 1);
        const sy = Math.max(0, (sh - srcH) / 2) * (window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, destW, destH);
        ctx.drawImage(sourceCanvas, sx, sy, srcW * (window.devicePixelRatio || 1), srcH * (window.devicePixelRatio || 1), 0, 0, destW, destH);
      }
      catch (err) {
        console.warn("DisplayChatBubble drawImage from sourceCanvas failed:", err);
      }
    };

    // 延迟到下一帧绘制，避免与主渲染竞争
    requestAnimationFrame(drawFromSource);

    return () => {
      cancelled = true;
    };
  // 依赖 avatarCanvasRef 与外部渲染版本号，保证外部 canvas 内容更新时重新绘制
  }, [avatarCanvasRef, useChatBubbleStyle, renderKey]);

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
