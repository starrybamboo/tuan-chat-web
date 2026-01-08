// React 组件，用于渲染所有的 toast 窗口
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PopWindowComponent } from "@/components/common/popWindow";
import { toastManager } from "@/components/common/toastWindow/toastWindow";

export interface ToastWindowOptions {
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

export interface ToastWindowData {
  id: string;
  children: React.ReactNode;
  options: ToastWindowOptions;
  onClose: () => void;
}

export function ToastWindowRenderer() {
  const [windows, setWindows] = useState<ToastWindowData[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // 确保只在客户端运行
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient)
      return;

    const updateWindows = () => {
      setWindows(toastManager.getWindows());
    };

    const unsubscribe = toastManager.subscribe(updateWindows);
    updateWindows(); // 初始化

    return unsubscribe;
  }, [isClient]);

  // 在服务端渲染期间不渲染任何内容
  if (!isClient) {
    return null;
  }

  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) {
    return null;
  }

  return createPortal(
    <>
      {windows.map(window => (
        <PopWindowComponent
          key={window.id}
          isOpen={true}
          fullScreen={window.options.fullScreen}
          transparent={window.options.transparent}
          onClose={window.onClose}
        >
          {window.children}
        </PopWindowComponent>
      ))}
    </>,
    modalRoot,
  );
}
