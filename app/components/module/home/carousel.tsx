import React, { useEffect, useRef, useState } from "react";

interface CarouselItemProps {
  img: string;
  alt?: string;
  title?: string;
  description?: string;
  isActive?: boolean;
}

type CarouselProps = CarouselItemProps;

function CarouselItem({ img, alt, isActive = false }: CarouselItemProps) {
  return (
    <div
      className={`flex-shrink-0 px-4 transition-transform duration-700 ease-out ${
        isActive ? "w-1/3" : "w-1/4"
      }`}
    >
      <div
        className={`shadow-lg bg-gray-100 cursor-pointer relative group/item overflow-hidden transition-transform duration-700 ease-out ${
          isActive
            ? "aspect-square z-10 origin-bottom"
            : "aspect-square origin-bottom"
        }`}
      >
        <img
          src={img}
          alt={alt}
          className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
            isActive
              ? "scale-105 group-hover/item:scale-110"
              : "scale-100 group-hover/item:scale-105"
          }`}
          style={{ willChange: "transform" }}
        />
        {/* 悬浮时的白色遮罩 */}
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500"></div>
      </div>
    </div>
  );
}

// 四图并排轮播组件
function Carousel({ items, className, autoPlay = true, interval = 4000, onActiveChange }: {
  items: CarouselProps[];
  className?: string;
  autoPlay?: boolean;
  interval?: number;
  onActiveChange?: (activeItem: CarouselProps, activeIndex: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(4); // 从真实数据的开始位置开始
  const [isTransitioning] = useState(true);
  const [isManualControl, setIsManualControl] = useState(false); // 是否为手动控制状态
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resumeAutoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 为了实现无缝循环，在数组前后各添加一组图片
  const extendedItems = React.useMemo(() => {
    if (items.length === 0) {
      return [];
    }
    if (items.length < 4) {
      // 如果图片少于4张，重复添加直到至少有4张
      const repeated = [];
      while (repeated.length < 8) {
        repeated.push(...items);
      }
      return repeated;
    }
    // 在前面添加最后4张，在后面添加前4张，实现无缝循环
    return [...items.slice(-4), ...items, ...items.slice(0, 4)];
  }, [items]);

  // 当前活跃项变化时调用回调函数
  useEffect(() => {
    if (onActiveChange && items.length > 0) {
      // 计算当前活跃项的真实索引（活跃项相对于 currentIndex 的位置是 +1）
      const activeRealIndex = (currentIndex - 4 + 1) % items.length;
      const activeItem = items[activeRealIndex];
      onActiveChange(activeItem, activeRealIndex);
    }
  }, [currentIndex, items, onActiveChange]);

  // 自动播放功能
  useEffect(() => {
    if (!autoPlay || items.length <= 1 || isManualControl) {
      return;
    }

    // 清除之前的计时器
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
    }

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        // 处理右侧克隆区域跳转 - 使用延迟跳转
        if (nextIndex >= items.length + 4) {
          return 4;
        }
        return nextIndex;
      });
    }, interval);

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
      if (resumeAutoPlayTimerRef.current) {
        clearTimeout(resumeAutoPlayTimerRef.current);
      }
    };
  }, [autoPlay, interval, items.length, isManualControl]);

  // 处理手动操作
  const handleManualOperation = () => {
    // 清空所有计时器
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (resumeAutoPlayTimerRef.current) {
      clearTimeout(resumeAutoPlayTimerRef.current);
    }
    // 设置为手动控制状态
    setIsManualControl(true);
    // 3秒后恢复自动播放
    resumeAutoPlayTimerRef.current = setTimeout(() => {
      setIsManualControl(false);
    }, 3000);
  };

  // 向前切换
  const handlePrevious = () => {
    // 处理手动操作
    handleManualOperation();
    setCurrentIndex((prev) => {
      const nextIndex = prev - 1;
      // 处理左侧克隆区域跳转 - 直接跳转，避免动画重复
      if (nextIndex < 4) {
        // 直接跳转到真实数据末尾，不播放到克隆区
        return items.length + 3;
      }
      return nextIndex;
    });
  };

  // 向后切换
  const handleNext = () => {
    // 处理手动操作
    handleManualOperation();
    setCurrentIndex((prev) => {
      const nextIndex = prev + 1;
      // 处理右侧克隆区域跳转 - 直接跳转，避免动画重复
      if (nextIndex >= items.length + 4) {
        // 直接跳转到真实数据开始，不播放到克隆区
        return 4;
      }
      return nextIndex;
    });
  };

  // 计算偏移量（需要根据活跃项调整）
  const translateX = React.useMemo(() => {
    if (items.length === 0) {
      return 0;
    }
    // 我们希望第二张图（位置1）是活跃的
    // 当前的布局应该是：[currentIndex, currentIndex+1(活跃), currentIndex+2, currentIndex+3]
    // 所以我们需要向左偏移让 currentIndex 成为第一张图
    const offset = currentIndex;
    return -(offset * 25) - 5;
  }, [currentIndex, items.length]);

  if (items.length === 0) {
    return (
      <div className={`relative bg-gray-200 flex items-center justify-center ${className}`}>
        <p className="text-gray-500">暂无图片</p>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`} style={{ height: "30vw" }}>
      {/* 轮播图容器 */}
      <div className="overflow-visible h-full flex items-end">
        <div
          className={`flex items-end w-full ${isTransitioning ? "transition-transform duration-700 ease-out" : ""}`}
          style={{ transform: `translateX(${translateX}%)` }}
        >
          {extendedItems.map((item, index) => {
            // 计算当前项在可视区域中的位置
            // 希望第二张图（可视区域位置1）是活跃的
            const relativePosition = index - currentIndex;
            const isActive = relativePosition === 1; // 相对于当前索引+1的位置为活跃状态
            return (
              <CarouselItem
                key={`carousel-${item.img}-${Math.floor(index / items.length)}`}
                img={item.img}
                alt={item.alt}
                isActive={isActive}
              />
            );
          })}
        </div>
      </div>

      {/* 指示器圆点 - 仅在有多于4张图片时显示 */}
      {items.length > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-2">
          {/* 左箭头 */}
          <button
            onClick={handlePrevious}
            className="p-1 rounded-full bg-gray-200 cursor-pointer hover:bg-gray-700 text-gray-600 hover:text-white transition-colors duration-200"
            type="button"
            aria-label="上一组图片"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {/* 指示器圆点 */}
          <div className="flex space-x-2 mx-4">
            {items.map((item, index) => (
              <button
                key={`indicator-${item.img}`}
                onClick={() => {
                  // 处理手动操作
                  handleManualOperation();
                  setCurrentIndex(index + 4); // +4 因为真实数据从索引4开始
                }}
                type="button"
                className={`w-2 h-2 transition-all duration-300 cursor-pointer ${
                  (currentIndex - 4) % items.length === index % items.length
                    ? "bg-primary scale-125"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`跳转到第${index + 1}组图片`}
              />
            ))}
          </div>
          {/* 右箭头 */}
          <button
            onClick={handleNext}
            className="p-1 rounded-full bg-gray-200 cursor-pointer hover:bg-gray-700 text-gray-600 hover:text-white transition-colors duration-200"
            type="button"
            aria-label="下一组图片"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default Carousel;
