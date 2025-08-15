import { Mounter } from "@/components/common/mounter";
import React from "react";

/**
 * useDynamicVh
 *
 * 在开启时动态维护 CSS 变量 --vh，使其表示“可见视口高度的 1%（px）”。
 * 目的：解决移动端地址栏或软键盘收起/展开导致的视口高度变化问题，
 * 让基于 `calc(var(--vh) * 100)` 的布局能跟随真实可见高度而变化
 *
 * @param enabled - 是否启用（通常在 modal 打开时启用，关闭时移除监听）
 */
function useDynamicVh(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled)
      return;
    const setVh = () => {
      const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      document.documentElement.style.setProperty("--vh", `${h / 100}px`);
    };
    setVh();
    // 监听 visualViewport 的 resize（在支持的浏览器中对键盘/地址栏变化响应更快更准确）
    window.visualViewport?.addEventListener("resize", setVh);
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
    // 清理：取消所有绑定的事件监听
    return () => {
      window.visualViewport?.removeEventListener("resize", setVh);
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, [enabled]);
}

/**
 * 关于控制popWindow开关的参数，请使用useSearchParamsState。
 * 这样，在回退url的时候也能关闭弹窗（这主要是对移动端的优化）
 * 另外注意的是，useParamsState中的key不要取太常规的名字（比如“pop”），
 * 如果有两个相同key的popWindow同时被打开就会出现bug！这个key在一个页面内应该是要唯一的！
 * 例子：
 * const [isOpen, setIsOpen] = useSearchParamsState<boolean>("WindowNamePop", false);
 * ......
 * <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>content</PopWindow>
 * @param isOpen 控制是否开启
 * @param children 弹窗显示的内容
 * @param onClose 当关闭的时候的回调函数，一般类似setIsOpen(false)
 * @param fullScreen 开启后会变成全屏，并且只能靠右上角的关闭按钮关闭
 * @param transparent 背景透明
 * @constructor
 */
export function PopWindow({ isOpen, children, onClose, fullScreen = false, transparent = false }: {
  isOpen: boolean;
  children: React.ReactNode;
  onClose: () => void;
  /** 开启后会变成全屏，并且只能靠右上角的关闭按钮关闭 */
  fullScreen?: boolean;
  transparent?: boolean; // 是否透明背景
}) {
  useDynamicVh(isOpen);

  if (!isOpen)
    return null;

  const nonFullMaxHeight = "calc(var(--vh, 1vh) * 100 - 2rem)";
  const fullScreenHeight = "calc(var(--vh, 1vh) * 100)";

  return (
    <Mounter targetId="modal-root">
      {/* wrapper：固定覆盖视口 */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Backdrop —— 放在 modal 之前，z 低 */}
        <div
          className={`absolute inset-0 z-[1000] transition-opacity ${transparent ? "bg-black/20 dark:bg-black/30" : "bg-black/50 dark:bg-black/70"}`}
          onClick={fullScreen ? undefined : onClose}
          aria-hidden="true"
          style={{ WebkitTapHighlightColor: "transparent" }}
        />

        {/* Modal 内容 z 高，显示在 backdrop 之上 */}
        <div
          className={`relative z-[1010] overflow-hidden
            ${transparent ? "bg-transparent w-screen" : "bg-base-100 dark:bg-base-300"}
            ${fullScreen ? "w-screen" : "mx-4"}
            ${fullScreen ? "" : "rounded-lg shadow-lg"}
          `}
          style={{
            // 保证高度限制，供内部 scroll 使用
            height: fullScreen ? fullScreenHeight : undefined,
            maxHeight: fullScreen ? fullScreenHeight : nonFullMaxHeight,
            maxWidth: fullScreen ? undefined : "min(100vw, 80rem)",
            paddingTop: `env(safe-area-inset-top)`,
            paddingBottom: `env(safe-area-inset-bottom)`,
            // 把 modal 做列布局，保证内部主体可以 flex-grow
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 关闭按钮（固定在顶部） */}
          <button
            type="button"
            className="btn btn-sm btn-circle absolute right-2 top-2 z-[1020] bg-base-200 hover:bg-base-300 dark:bg-base-200 dark:hover:bg-base-100"
            onClick={onClose}
            aria-label="close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>

          {/* 内容区：flex:1 + overflow-auto，出现滚动条且可滚动 */}
          <div
            className="card-body p-4 w-full overflow-auto"
            style={{
              flex: 1,
              WebkitOverflowScrolling: "touch", // iOS 平滑滚动
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </Mounter>
  );
}
