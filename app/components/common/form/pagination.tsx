import { useState } from "react";

function Pagination({
  total,
  max = 8,
  className = "",
  onChange = null,
  initialPageNo = 1, // 初始化的pageNo
}: {
  total: number;
  className?: string;
  max?: number;
  onChange?: ((page: number) => void) | null;
  initialPageNo?: number;
}) {
  const [current, setCurrent] = useState(initialPageNo);
  const isOverflowing = total > max;

  function handlePagClick(num: number) {
    setCurrent(num);
    if (onChange) {
      onChange(num);
    }
  }

  // 普通分页元素
  function normalPag(num: number) {
    return (
      <button
        key={num}
        className={`join-item btn w-12 ${current === num ? "btn-active" : ""}`}
        onClick={() => handlePagClick(num)}
        type="button"
      >
        {num}
      </button>
    );
  }

  // 超出了 max 时候的分页, 会根据当前的页数来控制左右省略
  function overflowedPag() {
    const half = 4;
    if (current <= half) {
      const pags = Array.from({ length: max }, (_, index) => (
        normalPag(index + 1)
      ));
      pags.push(<button className="btn join-item btn-disabled" key="right" type="button">...</button>);
      pags.push(normalPag(total));
      return pags;
    }
    else if (current > half && current < total - half) {
      const pags = [normalPag(1)];
      pags.push(<button className="btn join-item btn-disabled" key="left" type="button">...</button>);
      for (let i = current - half + 1; i <= current + half - 1; i++) {
        if (i > 0 && i <= total) {
          pags.push(normalPag(i));
        }
      }
      pags.push(<button className="btn join-item btn-disabled" key="right" type="button">...</button>);
      pags.push(normalPag(total));
      return pags;
    }
    else {
      const pags = [normalPag(1)];
      pags.push(<button className="btn join-item btn-disabled" key="left" type="button">...</button>);
      for (let i = total - max + 1; i <= total; i++) {
        if (i > 0 && i <= total) {
          pags.push(normalPag(i));
        }
      }
      return pags;
    }
  }

  // 没有超出 max 时候的分页, 显示所有
  function nonOverflowed() {
    return Array.from({ length: Math.min(total, max) }, (_, index) => (
      normalPag(index + 1)
    ));
  }

  return (
    <div className={`join ${className}`}>
      <button
        type="button"
        className={`join-item btn mr-2 ${current === 1 ? "btn-disabled" : ""}`}
        onClick={() => handlePagClick(current - 1)}
      >
        «
      </button>
      {isOverflowing ? overflowedPag() : nonOverflowed()}
      <button
        type="button"
        className={`join-item btn ml-2 ${
          current === total ? "btn-disabled" : ""
        } `}
        onClick={() => handlePagClick(current + 1)}
      >
        »
      </button>
    </div>
  );
}

export default Pagination;
