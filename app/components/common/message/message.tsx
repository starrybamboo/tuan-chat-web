import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

enum MessageType {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  SUCCESS = "success",
}

// 配置项,可以根据需要进行扩展
// className 来自 daisyui 的 alert 组件
const messageItem = {
  [MessageType.INFO]: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    className: "alert-info",
  },
  [MessageType.WARNING]: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    className: "alert-warning",
  },
  [MessageType.ERROR]: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    className: "alert-error",
  },
  [MessageType.SUCCESS]: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    className: "alert-success",
  },
};

// 创建消息实例的函数
function createMessage(type: MessageType, message: string, className?: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const MessageComponent = () => {
    const [visible, setVisible] = useState(true);

    const [animationClass, setAnimationClass] = useState("");

    useEffect(() => {
      const animationTimer = setTimeout(() => {
        setAnimationClass("fade-out");
      }, 2500);

      const visibilityTimer = setTimeout(() => {
        setVisible(false);
        document.body.removeChild(container);
      }, 3000);

      return () => {
        clearTimeout(visibilityTimer);
        clearTimeout(animationTimer);
        // 清理 DOM
        if (!visible) {
          document.body.removeChild(container);
        }
      };
    }, [visible]);

    if (!visible)
      return null;

    return createPortal(
      <div className={`alert ${messageItem[type].className} ${className} ${animationClass} absolute top-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 fade-in-out`}>
        {messageItem[type].icon}
        <span>{message}</span>
      </div>,
      container,
      Date.now().valueOf(),
    );
  };

  createRoot(container).render(<MessageComponent />);
}

// 导出消息函数
const messageApi = {
  success: (message: string) => createMessage(MessageType.SUCCESS, message),
  error: (message: string) => createMessage(MessageType.ERROR, message),
  warning: (message: string) => createMessage(MessageType.WARNING, message),
  info: (message: string) => createMessage(MessageType.INFO, message),
};

export default messageApi;
