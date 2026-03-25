import { useEffect, useRef, useState } from "react";

interface EditableFieldProps {
  fieldKey: string;
  value: string;
  isEditing: boolean;
  onValueChange: (key: string, value: string) => void;
  onValueCommit?: (key: string, value: string) => void;
  onDelete: (key: string) => void;
  onRename: (oldKey: string, newKey: string) => void;
  className?: string;
  valueInputClassName?: string;
  showDeleteButton?: boolean;
  size?: "default" | "compact";
}

/**
 * 可编辑字段组件
 * 支持字段名编辑、值编辑和删除功能
 */
export default function EditableField({
  fieldKey,
  value,
  isEditing,
  onValueChange,
  onValueCommit,
  onDelete,
  onRename,
  className = "",
  valueInputClassName,
  showDeleteButton = true,
  size = "default",
}: EditableFieldProps) {
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [tempFieldKey, setTempFieldKey] = useState("");
  const scrollRef = useRef<HTMLSpanElement>(null);
  const keyScrollRef = useRef<HTMLSpanElement>(null);
  const isSelectingRef = useRef(false);
  const mousePosRef = useRef<{ x: number } | null>(null);
  const autoScrollRaf = useRef<number | null>(null);

  useEffect(() => {
    // 处理两个可滚动元素
    const elements = [scrollRef.current, keyScrollRef.current].filter(Boolean) as HTMLSpanElement[];
    if (elements.length === 0)
      return;

    // ----- 滚轮处理逻辑 -----
    const handleWheel = (e: WheelEvent) => {
      // 找到触发事件的元素
      const target = e.currentTarget as HTMLSpanElement;

      // 允许横向和纵向的滚动事件都触发横向滚动
      // 优先处理纵向滚轮（将其转换为横向）
      let delta = 0;
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        // 显著降低滚动速度系数，避免太快滑到底
        delta = e.deltaY * 0.15;
      }
      else {
        // 如果是原生横向滚动（如触摸板），也进行一定的减速处理，防止过快
        delta = e.deltaX * 0.15;
      }

      const maxScrollLeft = target.scrollWidth - target.clientWidth;
      const currentScrollLeft = target.scrollLeft;

      // 判断此次滚动是否有效（未同时也未到底）
      // 允许一定的误差范围
      const isScrollableLeft = delta < 0 && currentScrollLeft > 0.5;
      const isScrollableRight = delta > 0 && currentScrollLeft < maxScrollLeft - 0.5;

      if (isScrollableLeft || isScrollableRight) {
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡，防止触发外层容器滚动
        target.scrollLeft += delta;
      }
    };

    // ----- 拖拽选择自动滚动逻辑 -----
    const checkAutoScroll = () => {
      // 找到当前正在交互的元素（这里简化为检查鼠标下的元素，或者在 mousedown 时记录 target）
      // 由于逻辑比较复杂，为了简化，我们假设拖拽选择主要发生在 value 区域（因为 key 一般较短且不可选文本）
      // 如果 key 也需要支持拖拽滚动，需要更复杂的逻辑来追踪哪个元素被激活。
      // 考虑到 fieldKey 点击即变成 input 编辑模式，通常不需要像 value 那样支持长文本选择复制
      // 所以这里暂不为 fieldKey 应用 checkAutoScroll 逻辑，仅对其应用 wheel 逻辑

      // 原有的 value 区域 autoScroll 逻辑保持不变，但需绑定到特定元素
      // 这里为了简单，我们只对 scrollRef (value) 启用拖拽自动滚动
      const el = scrollRef.current;

      // 在每次调用时都需要重新获取最新的鼠标位置和状态
      if (!isSelectingRef.current || !mousePosRef.current || !el) {
        autoScrollRaf.current = null;
        return;
      }

      const rect = el.getBoundingClientRect();
      const x = mousePosRef.current.x; // 获取最新的鼠标 x 坐标
      // 边缘触发滚动的阈值区域宽度（像素）
      const threshold = 60;
      // 最大滚动速度 (px/frame) - 保持较小值防止飞速滚动
      const maxScrollSpeed = 6;

      let speed = 0;

      // 检测左边缘：鼠标在左侧阈值内 或 容器左侧外
      if (x < rect.left + threshold) {
        // 距离右边越远（越往左），速度越快
        // 当 x = rect.left + threshold 时，dist = 0
        // 当 x = rect.left 时，dist = threshold
        const dist = (rect.left + threshold) - x;
        // 速度计算：这里使用线性增加，但限制最大值
        speed = -Math.min(maxScrollSpeed, dist * 0.15);
      }
      // 检测右边缘：鼠标在右侧阈值内 或 容器右侧外
      else if (x > rect.right - threshold) {
        const dist = x - (rect.right - threshold);
        speed = Math.min(maxScrollSpeed, dist * 0.15);
      }

      if (Math.abs(speed) > 0.1) {
        el.scrollLeft += speed;
        // 只要还在滚动，就继续下一帧
        autoScrollRaf.current = requestAnimationFrame(checkAutoScroll);
      }
      else {
        // 如果当前不需要滚动，停止循环，依靠 mousemove 重新启动
        autoScrollRaf.current = null;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // 只有当在 value 区域 (scrollRef) 按下时才启动自动滚动逻辑
      if (e.target === scrollRef.current || scrollRef.current?.contains(e.target as Node)) {
        isSelectingRef.current = true;
        mousePosRef.current = null;
        if (scrollRef.current)
          scrollRef.current.style.overflowX = "hidden";
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 只有在选择状态下才关心鼠标位置
      if (isSelectingRef.current) {
        // 更新最新的鼠标位置给 checkAutoScroll 使用
        mousePosRef.current = { x: e.clientX };

        // 如果当前自动滚动没有在运行，就启动它
        if (!autoScrollRaf.current) {
          autoScrollRaf.current = requestAnimationFrame(checkAutoScroll);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      isSelectingRef.current = false;
      mousePosRef.current = null;
      if (scrollRef.current)
        scrollRef.current.style.overflowX = "";

      if (autoScrollRaf.current) {
        cancelAnimationFrame(autoScrollRaf.current);
        autoScrollRaf.current = null;
      }
    };

    const valueElement = scrollRef.current;

    // 绑定事件
    elements.forEach((el) => {
      // 使用 passive: false 以便调用 preventDefault
      el.addEventListener("wheel", handleWheel, { passive: false });
    });

    // 只在 scrollRef 上监听 mousedown 用于选择
    valueElement?.addEventListener("mousedown", handleMouseDown);

    // 监听全局 mousemove/mouseup 以处理拖出元素的情况
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      elements.forEach((el) => {
        el.removeEventListener("wheel", handleWheel);
      });
      valueElement?.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      if (autoScrollRaf.current) {
        cancelAnimationFrame(autoScrollRaf.current);
      }
    };
  }, [isEditing]);

  const isCompact = size === "compact";
  void valueInputClassName;

  const handleRename = (newKey: string) => {
    if (!newKey.trim() || newKey === fieldKey) {
      return;
    }
    onRename(fieldKey, newKey);
  };

  if (!isEditing) {
    return (
      <div className={`flex items-center justify-between rounded-lg border bg-base-100/50 border-base-content/10 ${
        isCompact ? "px-2 py-1" : "p-2 md:p-3"
      }`}
      >
        <span
          ref={keyScrollRef}
          className={`font-medium overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden shrink-0 text-left md:mr-4 ${isCompact ? "text-xs" : "text-sm md:text-base"}`}
          style={{ scrollbarWidth: "none" }}
        >
          {fieldKey}
        </span>
        <span
          ref={scrollRef}
          className={`badge badge-ghost shrink overflow-x-auto whitespace-nowrap min-w-0 justify-start [&::-webkit-scrollbar]:hidden ${isCompact ? "badge-xs" : "text-sm md:text-base"}`}
          style={{ scrollbarWidth: "none" }}
        >
          {String(value)}
        </span>
      </div>
    );
  }

  return (
    <div className={`form-control ${className}`}>
      <label className={`
        relative flex items-center gap-2 rounded-lg transition-all duration-200 border
        focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20
        bg-base-100 border-base-content/20
        ${isCompact ? "py-1 px-2" : "py-2 px-3"}
        max-md:flex-col max-md:items-stretch max-md:h-auto max-md:gap-0
        w-full
        md:input md:input-ghost md:bg-base-200/50 md:border-transparent md:h-10
      `}
      >
        {/* 字段名编辑 */}
        <div className="flex items-center md:contents">
          {editingFieldKey === fieldKey
            ? (
                <input
                  type="text"
                  value={tempFieldKey}
                  onChange={e => setTempFieldKey(e.target.value)}
                  onBlur={() => {
                    if (tempFieldKey.trim() && tempFieldKey !== fieldKey) {
                      handleRename(tempFieldKey);
                    }
                    setEditingFieldKey(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (tempFieldKey.trim() && tempFieldKey !== fieldKey) {
                        handleRename(tempFieldKey);
                      }
                      setEditingFieldKey(null);
                    }
                  }}
                  className={`
                    bg-transparent border-none focus:outline-none outline-none font-medium
                    ${isCompact ? "text-[10px] md:text-xs" : "text-xs md:text-sm"}
                    w-full md:w-auto md:max-w-[6em] md:shrink-0
                    max-md:text-base-content/70
                  `}
                  autoFocus
                />
              )
            : (
                <span
                  ref={keyScrollRef}
                  className={`
                    cursor-pointer hover:text-primary font-medium whitespace-nowrap overflow-x-auto
                    ${isCompact ? "text-[10px] md:text-xs" : "text-xs md:text-sm"}
                    w-full md:w-auto md:shrink-0 text-left
                    max-md:text-base-content/70 max-md:pr-6
                  `}
                  onClick={() => {
                    setEditingFieldKey(fieldKey);
                    setTempFieldKey(fieldKey);
                  }}
                  title="点击编辑字段名"
                >
                  {fieldKey}
                </span>
              )}
        </div>

        <div className="hidden md:block w-px h-4 bg-base-content/20 mx-2"></div>

        {/* 字段值编辑 */}
        <input
          type="text"
          value={String(value)}
          onChange={e => onValueChange(fieldKey, e.target.value)}
          onBlur={e => onValueCommit?.(fieldKey, e.currentTarget.value)}
          onKeyDown={(e) => {
            if (!onValueCommit)
              return;
            if (e.key !== "Enter")
              return;
            if (e.nativeEvent.isComposing)
              return;
            e.preventDefault();
            onValueCommit?.(fieldKey, (e.target as HTMLInputElement).value);
          }}
          className={`
            bg-transparent border-none outline-none focus:outline-none
            grow min-w-0
            ${isCompact ? "text-xs" : "text-sm"}
            max-md:w-full max-md:font-semibold max-md:text-base-content
            placeholder:text-base-content/30
          `}
          placeholder="请输入值"
        />

        {/* 删除按钮 */}
        {showDeleteButton && (
          <button
            type="button"
            onClick={() => onDelete(fieldKey)}
            className={`
              btn btn-ghost btn-circle
              text-base-content/40 hover:text-error hover:bg-error/10
              md:static md:btn-xs
              max-md:absolute max-md:top-1 max-md:right-1 max-md:w-6 max-md:h-6 max-md:min-h-0
            `}
            title="删除字段"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 md:h-3.5 md:w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </label>
    </div>
  );
}
