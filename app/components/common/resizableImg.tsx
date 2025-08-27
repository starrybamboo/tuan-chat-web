import React, { useCallback, useEffect, useRef, useState } from "react";

// 定义一个类型，用于表示一个2D点或向量
interface Point { x: number; y: number }

export function ResizableImg({
  src,
  size,
  transparent,
  onClose,
}: {
  src: string;
  size?: { width?: number; height?: number };
  transparent?: boolean;
  onClose?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const didDragRef = useRef(false);

  // 使用 ref 来存储变换状态，避免不必要的重渲染
  const positionRef = useRef<Point>({ x: 0, y: 0 });
  const scaleRef = useRef<number>(1);

  // 使用 ref 存储上一次的交互状态
  const lastInteractionRef = useRef<{
    pinchDist: number;
    midpoint: Point;
    mousePos: Point;
  }>({ pinchDist: 0, midpoint: { x: 0, y: 0 }, mousePos: { x: 0, y: 0 } });

  // --- 核心更新函数 ---
  const updateTransform = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const img = container.querySelector("img");
      if (img) {
        img.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px) scale(${scaleRef.current})`;
      }
    }
  }, []);

  // --- 辅助函数 ---
  const getDistance = (t1: Touch, t2: Touch): number => {
    return Math.sqrt(
      (t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2,
    );
  };

  const getMidpoint = (t1: Touch, t2: Touch): Point => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  // --- 统一的变换逻辑 (已更新) ---
  const applyTransform = useCallback(({ panDelta, scaleChange, zoomCenter }: {
    panDelta: Point;
    scaleChange: number;
    zoomCenter?: Point; // 新增：可选的缩放中心点参数
  }) => {
    const container = containerRef.current;
    if (!container)
      return;

    const rect = container.getBoundingClientRect();
    // 核心修改：使用传入的 zoomCenter，如果未提供，则回退到容器中心
    const pivotPoint = zoomCenter ?? { x: rect.width / 2, y: rect.height / 2 };

    const prevPos = positionRef.current;
    const prevScale = scaleRef.current;

    const newScale = Math.max(0.2, Math.min(5, prevScale * scaleChange));

    // 正确的数学公式：new_pos = pivot * (1 - scale_ratio) + old_pos * scale_ratio + pan_delta
    // 这个公式能保证在缩放的同时，正确应用平移，让图片“跟手”
    const scaleRatio = newScale / prevScale;

    const newPosX = pivotPoint.x - (pivotPoint.x - prevPos.x) * scaleRatio + panDelta.x;
    const newPosY = pivotPoint.y - (pivotPoint.y - prevPos.y) * scaleRatio + panDelta.y;

    positionRef.current = {
      x: newPosX,
      y: newPosY,
    };
    scaleRef.current = newScale;

    updateTransform();
  }, [updateTransform]);

  // --- 事件处理器 ---

  const handleInteractionStart = useCallback((e: MouseEvent | TouchEvent) => {
    didDragRef.current = false;
    setIsInteracting(true);
    const container = containerRef.current;
    if (container) {
      const img = container.querySelector("img");
      if (img)
        img.style.transition = "none";
    }

    if (e instanceof TouchEvent) {
      if (e.touches.length === 2) {
        lastInteractionRef.current.pinchDist = getDistance(e.touches[0], e.touches[1]);
        lastInteractionRef.current.midpoint = getMidpoint(e.touches[0], e.touches[1]);
      }
      else if (e.touches.length === 1) {
        lastInteractionRef.current.mousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }
    else if (e instanceof MouseEvent) {
      if (e.button !== 0)
        return;
      lastInteractionRef.current.mousePos = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isInteracting)
      return;
    e.preventDefault();

    const container = containerRef.current;
    if (!container)
      return;
    const rect = container.getBoundingClientRect();

    let panDelta: Point = { x: 0, y: 0 };
    let scaleChange = 1;
    let zoomCenter: Point | undefined;

    if (e instanceof TouchEvent) {
      if (e.touches.length === 2) {
        const currentMidpoint = getMidpoint(e.touches[0], e.touches[1]);
        const currentDist = getDistance(e.touches[0], e.touches[1]);
        // 关键改动：获取上一帧的中点作为计算的基准
        const lastMidpoint = lastInteractionRef.current.midpoint;

        panDelta = {
          x: currentMidpoint.x - lastMidpoint.x,
          y: currentMidpoint.y - lastMidpoint.y,
        };
        scaleChange = lastInteractionRef.current.pinchDist === 0 ? 1 : currentDist / lastInteractionRef.current.pinchDist;

        // 关键改动：缩放中心点应该是本次手势增量【开始时】的位置（即上一帧的中点）
        zoomCenter = {
          x: lastMidpoint.x - rect.left,
          y: lastMidpoint.y - rect.top,
        };

        // 更新下一帧要用的状态
        lastInteractionRef.current.pinchDist = currentDist;
        lastInteractionRef.current.midpoint = currentMidpoint;
      }
      else if (e.touches.length === 1) {
        const touch = e.touches[0];
        panDelta = {
          x: touch.clientX - lastInteractionRef.current.mousePos.x,
          y: touch.clientY - lastInteractionRef.current.mousePos.y,
        };
        lastInteractionRef.current.mousePos = { x: touch.clientX, y: touch.clientY };
      }
    }
    else if (e instanceof MouseEvent) {
      panDelta = {
        x: e.clientX - lastInteractionRef.current.mousePos.x,
        y: e.clientY - lastInteractionRef.current.mousePos.y,
      };
      lastInteractionRef.current.mousePos = { x: e.clientX, y: e.clientY };
    }

    if (Math.abs(panDelta.x) > 1 || Math.abs(panDelta.y) > 1 || scaleChange !== 1) {
      didDragRef.current = true;
    }

    applyTransform({ panDelta, scaleChange, zoomCenter });
  }, [isInteracting, applyTransform]);

  const handleInteractionEnd = useCallback(() => {
    setIsInteracting(false);
    const container = containerRef.current;
    if (container) {
      const img = container.querySelector("img");
      if (img)
        img.style.transition = "transform 0.2s ease-out";
    }
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container)
      return;

    const rect = container.getBoundingClientRect();
    const zoomCenter = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const scaleChange = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    applyTransform({ panDelta: { x: 0, y: 0 }, scaleChange, zoomCenter });
  }, [applyTransform]);

  const handleDoubleClick = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const img = container.querySelector("img");
      if (img)
        img.style.transition = "transform 0.2s ease-out";
    }
    positionRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    updateTransform();
  }, [updateTransform]);

  const handleContainerClick = useCallback((e: MouseEvent) => {
    if (e.target === containerRef.current && !didDragRef.current) {
      onClose?.();
    }
  }, [onClose]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousedown", handleInteractionStart as EventListener);
      container.addEventListener("touchstart", handleInteractionStart as EventListener, { passive: false });

      window.addEventListener("mousemove", handleInteractionMove as EventListener);
      window.addEventListener("touchmove", handleInteractionMove as EventListener, { passive: false });

      window.addEventListener("mouseup", handleInteractionEnd as EventListener);
      window.addEventListener("touchend", handleInteractionEnd as EventListener);
      window.addEventListener("mouseleave", handleInteractionEnd as EventListener);

      container.addEventListener("wheel", handleWheel as EventListener, { passive: false });
      container.addEventListener("dblclick", handleDoubleClick as EventListener);
      container.addEventListener("click", handleContainerClick as EventListener);

      return () => {
        container.removeEventListener("mousedown", handleInteractionStart as EventListener);
        container.removeEventListener("touchstart", handleInteractionStart as EventListener);

        window.removeEventListener("mousemove", handleInteractionMove as EventListener);
        window.removeEventListener("touchmove", handleInteractionMove as EventListener);

        window.removeEventListener("mouseup", handleInteractionEnd as EventListener);
        window.removeEventListener("touchend", handleInteractionEnd as EventListener);
        window.removeEventListener("mouseleave", handleInteractionEnd as EventListener);

        container.removeEventListener("wheel", handleWheel as EventListener);
        container.removeEventListener("dblclick", handleDoubleClick as EventListener);
        container.removeEventListener("click", handleContainerClick as EventListener);
      };
    }
  }, [handleInteractionStart, handleInteractionMove, handleInteractionEnd, handleWheel, handleDoubleClick, handleContainerClick]);

  return (
    <div
      className={`overflow-hidden flex justify-center items-center touch-none select-none ${transparent ? "w-screen h-screen" : "h-full w-full"}`}
      ref={containerRef}
      style={{
        cursor: isInteracting ? "grabbing" : "grab",
      }}
    >
      <img
        src={src}
        className="max-w-none max-h-none object-contain"
        alt="img"
        width={size?.width}
        height={size?.height}
        style={{
          transition: "transform 0.2s ease-out",
          touchAction: "none",
        }}
        onDragStart={e => e.preventDefault()}
      />
    </div>
  );
}
