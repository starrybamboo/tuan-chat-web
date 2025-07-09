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

  // 统一跳转并滚动到顶部
  const handleChange = (page: number) => {
    onPageChange(page);
  };

  const displayPages = useMemo<(number | string)[]>(() => {
    const pages: (number | string)[] = [];
    const isMobile = responsive && width < 768;

    if (totalPages <= (isMobile ? 5 : 9)) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (!isMobile) {
      // 桌面端固定9个按钮
      if (currentPage <= 5) {
        // 开头
        for (let i = 1; i <= 7; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
      else if (currentPage >= totalPages - 4) {
        // 结尾
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 6; i <= totalPages; i++) pages.push(i);
      }
      else {
        // 中间
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    else {
      // 移动端，精简显示，buffer=1
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages, currentPage + 1);
      pages.push(1);
      if (start > 2)
        pages.push("...");
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages)
          pages.push(i);
      }
      if (end < totalPages - 1)
        pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  }, [totalPages, currentPage, width, responsive]);

  return (
    <div
      className={
        `join flex flex-wrap justify-center ${className}`
        + ` gap-1 md:gap-2`
      }
      role="navigation"
      aria-label="分页导航"
    >
      {showNavigation && (
        <button
          className="join-item btn"
          onClick={() => handleChange(Math.max(1, currentPage - 1))}
          type="button"
          disabled={currentPage === 1}
          aria-label="上一页"
        >
          ‹
        </button>
      )}

      {displayPages.map((page, idx) => {
        const isEllipsis = page === "...";
        return (
          <button
            key={`${page}-${idx}`}
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
          className="join-item btn"
          onClick={() => handleChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label="下一页"
        >
          ›
        </button>
      )}
    </div>
  );
};

export default Pagination;
