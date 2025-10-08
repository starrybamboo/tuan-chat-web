import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ImgWithHoverProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  enableScale?: boolean;
  hoverTime?: number;
  imgViewHeight?: number;
}

/**
 * @param hoverTime hover多久后会出现放大的图片，单位是毫秒
 * @param hoverImgClassName
 * @param enableScale
 * @param src
 * @param alt
 * @param className
 * @param imgProps
 * @constructor
 */
export default function ImgWithHoverToScale({
  hoverTime = 300,
  imgViewHeight = 0.35,
  enableScale = true,
  src,
  alt,
  className,
  ...imgProps
}: ImgWithHoverProps) {
  const [_isHovering, setIsHovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ left: 0, top: 0 });
  const [previewSize, setPreviewSize] = useState({ width: 300, height: 300 }); // 默认尺寸
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!enableScale) {
      return;
    }
    setIsHovering(true);

    // 预加载图像以获取准确尺寸
    if (src) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        // 设置预览图像的尺寸
        setPreviewSize({
          width: window.innerHeight * imgViewHeight * img.width / img.height,
          height: window.innerHeight * imgViewHeight,
        });
      };
    }

    hoverTimer.current = setTimeout(() => {
      setShowPreview(true);
    }, hoverTime);
  };

  const handleMouseLeave = () => {
    if (!enableScale) {
      return;
    }
    setIsHovering(false);
    setShowPreview(false);
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  // 检测并调整预览图像位置
  useEffect(() => {
    if (showPreview && containerRef.current) {
      const containerElement = containerRef.current;

      // 获取容器位置
      const containerRect = containerElement.getBoundingClientRect();

      // 设置初始位置，使其不会覆盖原图像
      // 将预览图像显示在原图像的右侧或下方，确保不被dropdown遮挡
      let left = containerRect.right + 15; // 右侧15px偏移
      let top = containerRect.top + 15; // 下方15px偏移

      // 使用实际图像尺寸或默认尺寸
      const previewWidth = previewSize.width;
      const previewHeight = previewSize.height;

      // 检查右侧是否溢出（只检测横向溢出）
      if (left + previewWidth > window.innerWidth) {
        // 如果右侧溢出，则显示在原图像的左侧
        left = containerRect.left - previewWidth - 15;
      }

      // 检查底部是否溢出
      if (top + previewHeight > window.innerHeight) {
        // 如果底部溢出，则显示在原图像的上方
        top = containerRect.top - previewHeight - 15;
      }

      // 确保不会小于0
      if (left < 0) {
        left = 15; // 留15px边距
      }

      if (top < 0) {
        top = 15; // 留15px边距
      }

      setPreviewPosition({ left, top });
    }
  }, [showPreview, previewSize]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }
    };
  }, []);

  // 创建预览元素
  const previewElement = showPreview && src && enableScale
    ? (
        createPortal(
          <div
            className="fixed z-[9999] shadow-xl rounded-lg"
            style={{
              left: `${previewPosition.left}px`,
              top: `${previewPosition.top}px`,
              transformOrigin: "top left",
            }}
          >
            <img
              src={src}
              alt={alt}
              style={{
                width: previewSize.width,
                height: previewSize.height,
                objectFit: "contain",
              }}
            />
          </div>,
          document.body,
        )
      )
    : null;

  return (
    <div
      ref={containerRef}
      className="img-with-hover relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={src}
        alt={alt}
        className={className}
        {...imgProps}
      />
      {previewElement}
    </div>
  );
}
