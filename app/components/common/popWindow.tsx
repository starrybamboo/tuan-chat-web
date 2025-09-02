import { Mounter } from "@/components/common/mounter";
import React from "react";

export interface PopWindowProp {
  isOpen: boolean;
  children: React.ReactNode;
  onClose: () => void;
  /** 开启后会变成全屏，并且只能靠右上角的关闭按钮关闭 */
  fullScreen?: boolean;
  transparent?: boolean; // 是否透明背景
}
/**
 * 【Legacy】如无必要，请使用toastWindow来代替本组件
 *
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
export function PopWindow({ isOpen, children, onClose, fullScreen = false, transparent = false }: PopWindowProp) {
  if (!isOpen) {
    return null;
  }
  return (
    <Mounter targetId="modal-root">
      <PopWindowComponent isOpen={isOpen} onClose={onClose} fullScreen={fullScreen} transparent={transparent}>
        {children}
      </PopWindowComponent>
    </Mounter>
  );
}

export function PopWindowComponent({ isOpen, children, onClose, fullScreen = false, transparent = false }: PopWindowProp) {
  return (
    <div className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div
        className={`relative flex flex-col
               ${transparent ? "bg-transparent w-screen h-dvh" : "bg-base-100 dark:bg-base-300"}
               ${fullScreen ? "w-screen h-dvh" : "modal-box w-auto max-w-[100vw] lg:max-w-[80vw] lg:h-auto lg:max-h-[90vh]"}`}
        style={{
          // 移动端避开浏览器UI的优化
          height: fullScreen ? "100dvh" : undefined,
          maxHeight: !fullScreen ? "min(90vh, 100dvh - 2rem)" : undefined,
        }}
      >
        {/* 关闭按钮 */}
        <button
          type="button"
          className="btn btn-sm btn-circle absolute right-2 top-2 bg-base-200 hover:bg-base-300 dark:bg-base-200 dark:hover:bg-base-100 z-20"
          onClick={onClose}
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
        {/* 卡片内容 */}
        <div className="w-full h-full overflow-auto min-h-0">
          {children}
        </div>
      </div>

      {/* 背景遮罩 */}
      <div
        className={`modal-backdrop ${transparent ? "bg-black/20 dark:bg-black/30" : "bg-black/50 dark:bg-black/70"}`}
        onClick={(fullScreen && !transparent) ? () => {} : onClose}
      >
      </div>
    </div>
  );
}
