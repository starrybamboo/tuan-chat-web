import { ResizableImg } from "@/components/common/resizableImg";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import React, { useRef } from "react";

/**
 * 更好的img组件，点击可以显示大图，大图状态下可以缩放。
 * @param src 图片源，可以是url，也可以是一个File对象
 * @param className
 * @param onClose 可选的回调函数，如果填写了该回调函数，那么图片左上角会出现一个关闭按钮，点击后调用onClose回调函数。
 * @param size 图片的尺寸，用于优化加载体验
 * @param popWindowKey 弹窗的searchParam key。如果同一页面会出现多个同一url的图片时，需要指定
 * @param transparent
 */
function BetterImg({ src, className, onClose, size, transparent = true }: {
  src: string | File | undefined;
  className?: string;
  onClose?: () => void;
  size?: { width?: number; height?: number };
  transparent?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const imgSrc = typeof src === "string" || !src ? src : URL.createObjectURL(src);

  const openToastWindow = () => {
    toastWindow(
      onClose => <ResizableImg src={imgSrc ?? ""} size={size} onClose={onClose} />,
      {
        fullScreen: true,
        transparent,
      },
    );
  };

  return (
    <div className="relative group">
      <img
        ref={imgRef}
        src={imgSrc}
        width={size?.width}
        className={`cursor-zoom-in object-contain hover:scale-101 ${className ?? ""}`}
        alt="img"
        onClick={() => openToastWindow()}
      />

      {onClose && (
        <button
          type="button"
          className="btn btn-xs btn-circle right-0 top-0 absolute opacity-100 duration-200 origin-top-right"
          onClick={onClose}
        >
          <span className="text-xs">✕</span>
        </button>
      )}
    </div>
  );
}

export default BetterImg;
