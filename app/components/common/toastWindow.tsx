import { PopWindowComponent } from "@/components/common/popWindow";
import React from "react";
import { createRoot } from "react-dom/client";

interface ToastWindowOptions {
  /**
   * 开启后会变成全屏，并且只能靠右上角的关闭按钮关闭
   * @default false
   */
  fullScreen?: boolean;
  /**
   * 开启后弹窗的主要背景会变透明
   * @default false
   */
  transparent?: boolean;
  /**
   * 关闭时候的回调函数
   */
  onclose?: () => void;
}

/**
 * 以函数调用的方式打开一个弹窗。
 * 它会动态创建一个DOM节点并挂载React组件，关闭时会自动销毁。
 * @param children - 要在弹窗中显示的React节点。
 * @param options - 弹窗的配置项，如 fullScreen 和 transparent。
 * @example
 * toastWindow(
 * <div>
 * <h3>确认操作</h3>
 * <p>您确定要删除这条记录吗？</p>
 * </div>
 * );
 * @returns - 一个对象，包含 update 和 close 方法。
 */
export default function toastWindow(
  children: ((onClose: () => void) => React.ReactNode) | React.ReactNode,
  options: ToastWindowOptions = {},
): { update: (newChildren: React.ReactNode) => void; close: () => void } {
  // 创建一个临时的 div 容器
  const container = document.createElement("div");

  // 将容器添加到 modal-root 或 body 中
  // 优先使用 modal-root，如果不存在则回退到 body
  const modalRoot = document.getElementById("modal-root") || document.body;
  modalRoot.appendChild(container);

  const root = createRoot(container);

  // 关闭和卸载函数
  const unmount = () => {
    root.unmount(); // 卸载React组件
    if (container.parentNode) {
      container.parentNode.removeChild(container); // 从DOM中移除容器
    }
  };
  const handleClose = () => {
    unmount();
    options.onclose?.();
  };

  const render = (content: React.ReactNode) => {
    root.render(
      <React.StrictMode>
        <PopWindowComponent
          isOpen={true}
          fullScreen={options.fullScreen}
          transparent={options.transparent}
          onClose={handleClose}
        >
          {content}
        </PopWindowComponent>
      </React.StrictMode>,
    );
  };

  // 初始渲染
  render(typeof children === "function"
    ? children(handleClose)
    : children);

  return {
    update: (newChildren: React.ReactNode) => {
      render(newChildren);
    },
    close: handleClose,
  };
}
