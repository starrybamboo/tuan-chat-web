interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showBottomMessage?: boolean;
}

/**
 * 分页组件
 * 通用的分页控制组件
 */
export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  showBottomMessage = false,
}: PaginationProps) {
  const hasNextPage = totalItems >= pageSize;
  const hasPrevPage = currentPage > 1;

  const handlePrevPage = () => {
    if (hasPrevPage) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 底部提示 */}
      {showBottomMessage && totalItems >= pageSize && (
        <div className="text-center text-base-content/50 text-sm">
          已经到底啦 (^_^) ✧
        </div>
      )}

      {/* 分页控制 */}
      {totalItems > 0 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={!hasPrevPage}
            className="btn btn-outline btn-sm"
          >
            上一页
          </button>
          <div className="flex items-center px-4 py-2 text-sm text-base-content/70">
            第
            {" "}
            {currentPage}
            {" "}
            ҳ
          </div>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={!hasNextPage}
            className="btn btn-outline btn-sm"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
