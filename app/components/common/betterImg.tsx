import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import React, { useEffect, useRef, useState } from "react";

/**
 * 更好的img组件，点击可以显示大图，大图状态下可以缩放。
 * @param src 图片源，可以是url，也可以是一个File对象
 * @param className
 * @param onClose 可选的回调函数，如果填写了该回调函数，那么图片左上角会出现一个关闭按钮，点击后调用onClose回调函数。
 * @param size 图片的尺寸，用于优化加载体验
 * @param popWindowKey 弹窗的searchParam key。如果同一页面会出现多个同一url的图片时，需要指定
 * @param transparent
 */

function BetterImg({ src, className, onClose, size, popWindowKey, transparent = true }: {
  src: string | File | undefined;
  className?: string;
  onClose?: () => void;
  size?: { width?: number; height?: number };
  popWindowKey?: string;
  transparent?: boolean;
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgSrc = typeof src === "string" || !src ? src : URL.createObjectURL(src);
  const [isOpen, setIsOpen] = useSearchParamsState<boolean>(popWindowKey || `imgPop${imgSrc}`, false);

  const zoom = (delta: number, mouseX: number, mouseY: number) => {
    const newScale = Math.max(0.5, Math.min(3, scale + delta));

    // 计算相对于容器的鼠标位置
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerMouseX = mouseX - containerRect.left;
      const containerMouseY = mouseY - containerRect.top;

      // 计算容器中心点
      const containerCenterX = containerRect.width / 2;
      const containerCenterY = containerRect.height / 2;

      // 计算鼠标相对于图片中心的偏移
      const offsetX = containerMouseX - containerCenterX;
      const offsetY = containerMouseY - containerCenterY;

      // 根据缩放比例调整位置，使鼠标位置保持不变
      const scaleRatio = newScale / scale;
      const newX = position.x - offsetX * (scaleRatio - 1);
      const newY = position.y - offsetY * (scaleRatio - 1);

      setPosition({ x: newX, y: newY });
      setScale(newScale);
    }
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 左键点击触发拖动（e.button === 0 表示左键）
    if (e.button === 0) {
      e.preventDefault(); // 防止选中文字
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault(); // 防止选中文字
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    // 鼠标离开容器时结束拖动
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    zoom(delta, e.clientX, e.clientY);
  };

  // 点击容器空白区域关闭图片查看
  const handleContainerClick = (e: React.MouseEvent) => {
    // 只有当点击的是容器本身（不是图片）时才关闭
    if (e.target === e.currentTarget) {
      setIsOpen(false);
      resetZoom();
    }
  };

  useEffect(() => {
    // 拖动时修改全局鼠标样式
    if (isDragging) {
      document.body.style.cursor = "grabbing";
    }
    else {
      document.body.style.cursor = scale > 1 ? "grab" : "default";
    }

    // 清理函数，确保组件卸载时恢复默认样式
    return () => {
      document.body.style.cursor = "";
    };
  }, [isDragging, scale]);

  return (
    <div>
      <div className="relative group">
        <img
          ref={imgRef}
          src={imgSrc}
          width={size?.width}
          height={size?.height}
          className={`hover:scale-101 ${className} cursor-zoom-in w-full object-contain`}
          alt="img"
          onClick={() => setIsOpen(true)}
        />

        {onClose && (
          <button
            type="button"
            className="btn btn-xs btn-circle right-0 top-0 absolute opacity-0 group-hover:opacity-100 duration-200 origin-top-right"
            onClick={onClose}
          >
            <span className="text-xs">✕</span>
          </button>
        )}
      </div>

      <PopWindow
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          resetZoom();
        }}
        fullScreen={true}
        transparent={transparent}
      >
        <div
          className={`relative overflow-hidden flex justify-center items-center ${transparent ? "w-screen h-screen" : ""}`}
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave} // 新增事件处理
          onWheel={handleWheel}
          onClick={handleContainerClick} // 点击容器空白区域关闭图片查看
          style={{
            // 根据缩放状态和拖动状态显示不同光标
            cursor: isDragging ? "grabbing" : scale > 1 ? "grab" : "default",
          }}
        >
          <div
            className="w-max h-max"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.2s ease",
              transformOrigin: "center center", // 修改为中心缩放
            }}
          >
            <img
              src={imgSrc}
              className="max-h-[70vh] max-w-[70vw] object-contain"
              alt="img"
              width={size?.width}
              height={size?.height}
              onClick={e => e.stopPropagation()} // 防止点击图片时触发容器的关闭事件
            />
          </div>
        </div>
      </PopWindow>
    </div>
  );
}

export default BetterImg;
