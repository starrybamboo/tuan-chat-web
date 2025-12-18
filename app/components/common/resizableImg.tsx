import React, { useCallback, useEffect, useRef, useState } from "react";

// 定义一个类型，用于表示一个2D点或向量
interface Point { x: number; y: number }

export function ResizableImg({
  src,
  size,
  onClose,
}: {
  src: string;
  size?: { width?: number; height?: number };
  onClose?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const didDragRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

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
    const img = imgRef.current;
    if (img) {
      img.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px) scale(${scaleRef.current})`;
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

  // --- 统一的变换逻辑 ---
  const applyTransform = useCallback(({ panDelta, scaleChange, zoomCenter }: {
    panDelta: Point;
    scaleChange: number;
    zoomCenter?: Point;
  }) => {
    const container = containerRef.current;
    if (!container)
      return;

    const pivotPoint = zoomCenter ?? { x: container.clientWidth / 2, y: container.clientHeight / 2 };
    const prevPos = positionRef.current;
    const prevScale = scaleRef.current;
    const newScale = Math.max(0.2, Math.min(5, prevScale * scaleChange));
    const scaleRatio = newScale / prevScale;

    const newPosX = pivotPoint.x - (pivotPoint.x - prevPos.x) * scaleRatio + panDelta.x;
    const newPosY = pivotPoint.y - (pivotPoint.y - prevPos.y) * scaleRatio + panDelta.y;

    positionRef.current = { x: newPosX, y: newPosY };
    scaleRef.current = newScale;

    updateTransform();
  }, [updateTransform]);

  // --- 事件处理器 ---
  const handleInteractionStart = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isLoaded)
      return;
    didDragRef.current = false;
    setIsInteracting(true);
    const img = imgRef.current;
    if (img)
      img.style.transition = "none";

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
  }, [isLoaded]);

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
        const lastMidpoint = lastInteractionRef.current.midpoint;
        panDelta = { x: currentMidpoint.x - lastMidpoint.x, y: currentMidpoint.y - lastMidpoint.y };
        scaleChange = lastInteractionRef.current.pinchDist === 0 ? 1 : currentDist / lastInteractionRef.current.pinchDist;
        zoomCenter = { x: lastMidpoint.x - rect.left, y: lastMidpoint.y - rect.top };
        lastInteractionRef.current.pinchDist = currentDist;
        lastInteractionRef.current.midpoint = currentMidpoint;
      }
      else if (e.touches.length === 1) {
        const touch = e.touches[0];
        panDelta = { x: touch.clientX - lastInteractionRef.current.mousePos.x, y: touch.clientY - lastInteractionRef.current.mousePos.y };
        lastInteractionRef.current.mousePos = { x: touch.clientX, y: touch.clientY };
      }
    }
    else if (e instanceof MouseEvent) {
      panDelta = { x: e.clientX - lastInteractionRef.current.mousePos.x, y: e.clientY - lastInteractionRef.current.mousePos.y };
      lastInteractionRef.current.mousePos = { x: e.clientX, y: e.clientY };
    }

    if (Math.abs(panDelta.x) > 1 || Math.abs(panDelta.y) > 1 || scaleChange !== 1) {
      didDragRef.current = true;
    }

    applyTransform({ panDelta, scaleChange, zoomCenter });
  }, [isInteracting, applyTransform]);

  const handleInteractionEnd = useCallback(() => {
    if (!isInteracting)
      return;
    setIsInteracting(false);
    const img = imgRef.current;
    if (img)
      img.style.transition = "transform 0.2s ease-out";
  }, [isInteracting]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!isLoaded)
      return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container)
      return;
    const rect = container.getBoundingClientRect();
    const zoomCenter = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const scaleChange = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    applyTransform({ panDelta: { x: 0, y: 0 }, scaleChange, zoomCenter });
  }, [isLoaded, applyTransform]);

  const resetImageState = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth)
      return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const initialScale = Math.min(scaleX, scaleY);

    const scaledImgWidth = imgWidth * initialScale;
    const scaledImgHeight = imgHeight * initialScale;

    const initialX = (containerWidth - scaledImgWidth) / 2;
    const initialY = (containerHeight - scaledImgHeight) / 2;

    positionRef.current = { x: initialX, y: initialY };
    scaleRef.current = initialScale;
    updateTransform();
  }, [updateTransform]);

  const handleDoubleClick = useCallback(() => {
    if (!isLoaded)
      return;
    const img = imgRef.current;
    if (img)
      img.style.transition = "transform 0.2s ease-out";
    resetImageState();
  }, [isLoaded, resetImageState]);

  const handleContainerClick = useCallback((e: MouseEvent) => {
    if (e.target === containerRef.current && !didDragRef.current) {
      onClose?.();
    }
  }, [onClose]);

  const handleImageLoad = useCallback(() => {
    // 立即设置初始位置和缩放
    resetImageState();
    setTimeout(() => {
      setIsLoaded(true);
    }, 50);
  }, [resetImageState]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const passiveFalse: AddEventListenerOptions = { passive: false };
      const onInteractionStart = handleInteractionStart as EventListener;
      const onInteractionMove = handleInteractionMove as EventListener;
      const onInteractionEnd = handleInteractionEnd as EventListener;
      const onWheel = handleWheel as EventListener;
      const onDoubleClick = handleDoubleClick as EventListener;
      const onContainerClick = handleContainerClick as EventListener;

      container.addEventListener("mousedown", onInteractionStart);
      container.addEventListener("touchstart", onInteractionStart, passiveFalse);
      window.addEventListener("mousemove", onInteractionMove);
      window.addEventListener("touchmove", onInteractionMove, passiveFalse);
      window.addEventListener("mouseup", onInteractionEnd);
      window.addEventListener("touchend", onInteractionEnd);
      window.addEventListener("mouseleave", onInteractionEnd);
      container.addEventListener("wheel", onWheel, passiveFalse);
      container.addEventListener("dblclick", onDoubleClick);
      container.addEventListener("click", onContainerClick);

      return () => {
        container.removeEventListener("mousedown", onInteractionStart);
        container.removeEventListener("touchstart", onInteractionStart, passiveFalse);
        window.removeEventListener("mousemove", onInteractionMove);
        window.removeEventListener("touchmove", onInteractionMove, passiveFalse);
        window.removeEventListener("mouseup", onInteractionEnd);
        window.removeEventListener("touchend", onInteractionEnd);
        window.removeEventListener("mouseleave", onInteractionEnd);
        container.removeEventListener("wheel", onWheel, passiveFalse);
        container.removeEventListener("dblclick", onDoubleClick);
        container.removeEventListener("click", onContainerClick);
      };
    }
  }, [handleInteractionStart, handleInteractionMove, handleInteractionEnd, handleWheel, handleDoubleClick, handleContainerClick]);

  return (
    <div
      className="overflow-hidden touch-none select-none h-full w-full"
      ref={containerRef}
      style={{ cursor: isInteracting ? "grabbing" : "grab" }}
    >
      <img
        ref={imgRef}
        src={src}
        className="max-w-none max-h-none"
        alt="img"
        width={size?.width}
        height={size?.height}
        style={{
          transition: isLoaded ? "transform 0.2s ease-out" : "none",
          touchAction: "none",
          transformOrigin: "0 0",
          visibility: isLoaded ? "visible" : "hidden",
        }}
        onDragStart={e => e.preventDefault()}
        onLoad={handleImageLoad}
      />
    </div>
  );
}
