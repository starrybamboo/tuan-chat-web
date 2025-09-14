import { BaselineArrowBackIosNew, ChevronRight } from "@/icons";
import React, { useEffect, useMemo, useState } from "react";

/**
 * 分页组件 Props
 */
interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  showNavigation?: boolean;
  className?: string;
  responsive?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  totalPages,
  currentPage,
  onPageChange,
  showNavigation = true,
  className = "",
  responsive = true,
}) => {
  const [width, setWidth] = useState<number>(window.innerWidth);

  // 监听窗口大小
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 统一跳转
  const handleChange = (page: number) => {
    onPageChange(page);
  };

  const displayPages = useMemo<(number | string)[]>(() => {
    // 确保 totalPages 是有效数字
    const validTotalPages = Math.max(1, Number(totalPages) || 1);
    const pages: (number | string)[] = [];
    const isMobile = responsive && width < 768;

    if (validTotalPages <= (isMobile ? 5 : 9)) {
      return Array.from({ length: validTotalPages }, (_, i) => i + 1);
    }

    if (!isMobile) {
      // 桌面端固定9个按钮
      if (currentPage <= 5) {
        // 开头
        for (let i = 1; i <= 7; i++) pages.push(i);
        pages.push("...");
        pages.push(validTotalPages);
      }
      else if (currentPage >= validTotalPages - 4) {
        // 结尾
        pages.push(1);
        pages.push("...");
        for (let i = validTotalPages - 6; i <= validTotalPages; i++) pages.push(i);
      }
      else {
        // 中间
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
        pages.push("...");
        pages.push(validTotalPages);
      }
    }
    else {
      // 移动端，精简显示，buffer=1
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(validTotalPages, currentPage + 1);
      pages.push(1);
      if (start > 2)
        pages.push("...");
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== validTotalPages)
          pages.push(i);
      }
      if (end < validTotalPages - 1)
        pages.push("...");
      pages.push(validTotalPages);
    }

    return pages;
  }, [totalPages, currentPage, width, responsive]);

  // 只有在总页数大于1时才渲染分页组件
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div
      className={
        `join flex flex-wrap justify-center ${className} gap-1 md:gap-2`
      }
      role="navigation"
      aria-label="分页导航"
    >
      {showNavigation && (
        <button
          className="join-item btn btn-square"
          onClick={() => handleChange(Math.max(1, currentPage - 1))}
          type="button"
          disabled={currentPage === 1}
          aria-label="上一页"
        >
          <BaselineArrowBackIosNew />
        </button>
      )}

      {displayPages.map((page, idx) => {
        const isEllipsis = page === "...";
        return (
          <button
            key={page}
            type="button"
            className={`join-item btn btn-square ${
              page === currentPage ? "btn-active bg-success" : ""
            } ${isEllipsis ? "cursor-pointer" : ""}`}
            onClick={() => {
              if (typeof page === "number") {
                handleChange(page);
              }
              else if (isEllipsis) {
                const delta = 5;
                const currentIndex = displayPages.indexOf(currentPage);
                const leftEllipsis = idx < currentIndex;
                const target = leftEllipsis
                  ? Math.max(1, currentPage - delta)
                  : Math.min(totalPages, currentPage + delta);
                handleChange(target);
              }
            }}
            aria-current={page === currentPage ? "page" : undefined}
            aria-label={isEllipsis ? "更多页码" : `第 ${page} 页`}
          >
            {page}
          </button>
        );
      })}

      {showNavigation && (
        <button
          type="button"
          className="join-item btn btn-square"
          onClick={() => handleChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label="下一页"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default Pagination;
