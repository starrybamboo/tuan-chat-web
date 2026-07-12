// React 组件，用于渲染所有的 toast 窗口
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { DialogFrame } from "@/components/common/DialogFrame";
import "@/components/common/scrollbar.css";
import { toastManager } from "@/components/common/toastWindow/toastWindow";

export type ToastWindowOptions = {
  /**
   * 开启后会变成全屏，业务内容需提供明确的返回或关闭入口。
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
  hiddenScrollbar?: boolean;
  disableScroll?: boolean;
  rootClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
}

export type ToastWindowData = {
  id: string;
  children: React.ReactNode;
  options: ToastWindowOptions;
  onClose: () => void;
}

export function ToastWindowRenderer() {
  const [windows, setWindows] = useState<ToastWindowData[]>([]);
  const [isClient, setIsClient] = useState(false);
  const supportsDynamicViewportUnit = typeof CSS !== "undefined" && CSS.supports("height: 100dvh");

  useEffect(() => {
    // 确保只在客户端运行
    queueMicrotask(() => setIsClient(true));
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
      {windows.map((window) => {
        const fullScreen = window.options.fullScreen ?? false;
        const transparent = window.options.transparent ?? false;
        const hiddenScrollbar = window.options.hiddenScrollbar ?? false;
        const disableScroll = window.options.disableScroll ?? false;
        const fullScreenHeight = fullScreen
          ? (supportsDynamicViewportUnit ? "100dvh" : "100vh")
          : undefined;
        const modalMaxHeight = !fullScreen
          ? (supportsDynamicViewportUnit ? "min(90vh, 100dvh - 2rem)" : "min(90vh, calc(100vh - 2rem))")
          : undefined;

        return (
          <DialogFrame
            key={window.id}
            open
            mode="inline"
            onClose={window.onClose}
            ariaLabel="弹窗"
            closeOnOverlayClick={!(fullScreen && !transparent)}
            rootClassName={window.options.rootClassName ?? ""}
            panelClassName={`
              relative flex flex-col overflow-hidden
              ${transparent ? "bg-transparent w-full h-screen" : `
                bg-base-100
                dark:bg-base-300
              `}
              ${fullScreen ? "w-full h-screen" : `
                w-auto max-w-[100vw]
                lg:max-w-[80vw] lg:h-auto lg:max-h-[90vh]
              `}
              ${window.options.panelClassName ?? ""}
            `}
            panelStyle={{
              height: fullScreenHeight,
              maxHeight: modalMaxHeight,
            }}
            bodyClassName={`
              ${disableScroll ? "overflow-hidden" : (hiddenScrollbar ? `
                hidden-scrollbar
              ` : "overflow-auto")}
              w-full h-full min-h-0
              ${window.options.bodyClassName ?? ""}
            `}
          >
            {window.children}
          </DialogFrame>
        );
      })}
    </>,
    modalRoot,
  );
}
