import React, { useCallback, useState } from "react";
import { RotateLeftIcon, RotateRightIcon } from "@/icons";

interface ImagePreviewProps {
  images: string[];
  maxPreview?: number;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  maxPreview = 9,
}) => {
  const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);

  const handleImageClick = useCallback((index: number) => {
    if (enlargedIndex === index) {
      // 如果点击的是当前放大的图片，回到预览模式
      setEnlargedIndex(null);
      setRotation(0);
    }
    else {
      // 放大指定图片
      setEnlargedIndex(index);
      setRotation(0);
    }
  }, [enlargedIndex]);

  const handleRotateLeft = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation(prev => prev - 90);
  }, []);

  const handleRotateRight = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation(prev => prev + 90);
  }, []);

  const handleNavigation = useCallback((e: React.MouseEvent, direction: "prev" | "next") => {
    e.stopPropagation();
    if (enlargedIndex === null)
      return;

    if (direction === "prev") {
      setEnlargedIndex(prev =>
        prev === null
          ? null
          : prev > 0 ? prev - 1 : images.length - 1,
      );
    }
    else {
      setEnlargedIndex(prev =>
        prev === null
          ? null
          : prev < images.length - 1 ? prev + 1 : 0,
      );
    }
    setRotation(0); // 切换图片时重置旋转
  }, [enlargedIndex, images.length]);

  const handleEnlargedClick = useCallback((e: React.MouseEvent) => {
    if (enlargedIndex === null)
      return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const leftThird = width * 0.3;
    const rightThird = width * 0.7;

    if (clickX < leftThird && enlargedIndex > 0) {
      // 点击左侧30%区域，上一张
      handleNavigation(e, "prev");
    }
    else if (clickX > rightThird && enlargedIndex < images.length - 1) {
      // 点击右侧30%区域，下一张
      handleNavigation(e, "next");
    }
    else {
      // 点击中间区域，回到预览模式
      handleImageClick(enlargedIndex);
    }
  }, [enlargedIndex, images.length, handleNavigation, handleImageClick]);

  if (images.length === 0)
    return null;

  // 放大模式
  if (enlargedIndex !== null) {
    const currentImage = images[enlargedIndex];
    const hasPrev = enlargedIndex > 0;
    const hasNext = enlargedIndex < images.length - 1;

    return (
      <div className="relative w-4/5">
        {/* 放大图片容器 */}
        <div
          className="relative w-full aspect-square bg-base-100 rounded-lg overflow-hidden cursor-pointer"
          onClick={handleEnlargedClick}
        >
          <img
            key={`pic-${enlargedIndex}`}
            src={currentImage}
            alt={`ͼƬ ${enlargedIndex + 1}`}
            className="w-full h-full object-contain"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: "transform 0.3s ease-in-out",
            }}
          />

          {hasPrev && (
            <div className="absolute left-0 top-0 w-[30%] h-full bg-gradient-to-r from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-center justify-start pl-4">
              <div className="bg-black/50 rounded-full p-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </div>
            </div>
          )}

          {hasNext && (
            <div className="absolute right-0 top-0 w-[30%] h-full bg-gradient-to-l from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-center justify-end pr-4">
              <div className="bg-black/50 rounded-full p-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* 旋转控制按钮 */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            type="button"
            onClick={handleRotateLeft}
            className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            title="向左旋转"
          >
            <RotateLeftIcon />
          </button>
          <button
            type="button"
            onClick={handleRotateRight}
            className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            title="向右旋转"
          >
            <RotateRightIcon />
          </button>
        </div>

        {/* 图片信息 */}
        <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {enlargedIndex + 1}
          {" "}
          /
          {images.length}
        </div>
      </div>
    );
  }

  // 预览模式（网格布局）
  return (
    <div className="w-full">
      <div
        className={`grid gap-2 ${
          images.length === 1
            ? "grid-cols-1 max-w-xs"
            : images.length === 2
              ? "grid-cols-2 max-w-md"
              : "grid-cols-3 max-w-lg"
        }`}
      >
        {images.slice(0, maxPreview).map((img: string, idx: number) => (
          <div key={img} className="relative">
            <img
              src={img}
              alt={`ͼƬ ${idx + 1}`}
              className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleImageClick(idx)}
            />

            {/* 如果是最后一个预览格并且总数超过 maxPreview，显示 +N 覆盖 */}
            {idx === maxPreview - 1 && images.length > maxPreview && (
              <div
                className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors"
                onClick={() => handleImageClick(idx)}
              >
                <span className="text-white font-semibold text-lg">
                  +
                  {images.length - maxPreview}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 如果总数超过 maxPreview，显示查看全部提示 */}
      {images.length > maxPreview && (
        <p
          className="text-xs text-gray-500 mt-2 cursor-pointer hover:text-blue-500 transition-colors"
          onClick={() => handleImageClick(0)}
        >
          点击查看全部
          {" "}
          {images.length}
          {" "}
          张图片
        </p>
      )}
    </div>
  );
};

export default ImagePreview;

