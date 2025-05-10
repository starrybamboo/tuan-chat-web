import { PopWindow } from "@/components/common/popWindow";
import React, { useEffect, useRef, useState } from "react";

function BetterImg({ src, className, onClose }: { src: string | File | undefined; className?: string; onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTipOpen, setIsTipOpen] = useState(false);

  const setTipOpen = () => {
    setIsTipOpen(true);
    setTimeout(() => {
      setIsTipOpen(false);
    }, 3000);
  };

  const imgSrc = typeof src === "string" || !src ? src : URL.createObjectURL(src);

  const zoom = (delta: number, mouseX: number, mouseY: number) => {
    const newScale = Math.max(0.5, Math.min(3, scale + delta));

    // 计算相对于容器的鼠标位置
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerMouseX = mouseX - containerRect.left;
      const containerMouseY = mouseY - containerRect.top;

      // 计算当前鼠标位置在图片坐标系中的位置
      const imgMouseX = (containerMouseX - position.x) / scale;
      const imgMouseY = (containerMouseY - position.y) / scale;

      // 计算新的位置，使鼠标位置在图片上的点保持不变
      const newX = containerMouseX - imgMouseX * newScale;
      const newY = containerMouseY - imgMouseY * newScale;

      setPosition({ x: newX, y: newY });
      setScale(newScale);
    }
  };

  const zoomIn = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      zoom(0.5, rect.left + rect.width / 2, rect.top + rect.height / 2); // 以中心点缩放
    }
  };

  const zoomOut = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      zoom(-0.5, rect.left + rect.width / 2, rect.top + rect.height / 2); // 以中心点缩放
    }
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 去掉 scale <= 1 的限制
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 去掉 !isDragging || scale <= 1 的限制
    if (isDragging) {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    zoom(delta, e.clientX, e.clientY);
  };

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = "grabbing";
    }
    else {
      document.body.style.cursor = "";
    }
    return () => {
      document.body.style.cursor = "";
    };
  }, [isDragging]);

  return (
    <div>
      <div className="relative inline-block group">
        <img
          ref={imgRef}
          src={imgSrc}
          className={`hover:scale-101 ${className} cursor-zoom-in`}
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
      >
        <div
          className="relative overflow-hidden"
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          <div
            className="w-max h-max"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.2s ease",
              transformOrigin: "0 0",
            }}
          >
            <img
              src={imgSrc}
              className="max-h-[70vh] max-w-[70wh]"
              alt="img"
              onClick={() => setTipOpen()}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-base-200 p-2 rounded-full opacity-70">
            <button
              type="button"
              className="btn btn-circle btn-sm"
              onClick={zoomOut}
              disabled={scale <= 0.5}
            >
              -
            </button>
            <button
              type="button"
              className="btn btn-circle btn-sm"
              onClick={resetZoom}
            >
              {Math.round(scale * 100)}
              %
            </button>
            <button
              type="button"
              className="btn btn-circle btn-sm"
              onClick={zoomIn}
              disabled={scale >= 3}
            >
              +
            </button>
          </div>
          {isTipOpen
            && (
              <div className="absolute top-4 right-4 bg-base-300 p-2 rounded-md flex items-center">
                <span>鼠标中键拖动图片，滚轮控制图片大小</span>
              </div>
            )}
        </div>
      </PopWindow>
    </div>
  );
}

export default BetterImg;
