import React, { useEffect, useRef, useState } from "react";

interface ImgWithHoverProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  enableScale?: boolean;
  hoverTime?: number;
  hoverImgClassName?: string;
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
  hoverImgClassName = "",
  enableScale = true,
  src,
  alt,
  className,
  ...imgProps
}: ImgWithHoverProps) {
  const [_isHovering, setIsHovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!enableScale) {
      return;
    }
    setIsHovering(true);
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

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }
    };
  }, []);

  return (
    <div
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
      {showPreview && src && enableScale && (
        <div
          ref={previewRef}
          className={`fixed z-50 shadow-xl rounded-lg overflow-hidden ${hoverImgClassName}`}
          style={{
            transformOrigin: "top left",
          }}
        >
          <img
            src={src}
            alt={alt}
            className="block"
          />
        </div>
      )}
    </div>
  );
}
