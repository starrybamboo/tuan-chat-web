import type React from "react";
import type { ToastWindowData, ToastWindowOptions } from "@/components/common/toastWindow/toastWindowRenderer";

// 全局状态管理器
class ToastWindowManager {
  private windows: Map<string, ToastWindowData> = new Map();
  private listeners: Set<() => void> = new Set();

  addWindow(id: string, data: ToastWindowData) {
    this.windows.set(id, data);
    this.notifyListeners();
  }

  removeWindow(id: string) {
    this.windows.delete(id);
    this.notifyListeners();
  }

  getWindows() {
    return Array.from(this.windows.values());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}
export const toastManager = new ToastWindowManager();
/**
 * 以函数调用的方式打开一个弹窗。
 * 它会在现有的 React 应用树中渲染，保持路由上下文。
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
  children: ((close: () => void) => React.ReactNode) | React.ReactNode,
  options: ToastWindowOptions = {},
): { update: (newChildren: React.ReactNode) => void; close: () => void } {
  const id = Math.random().toString(36).substr(2, 9);

  const handleClose = () => {
    toastManager.removeWindow(id);
    options.onclose?.();
  };

  const render = (content: React.ReactNode) => {
    const windowData: ToastWindowData = {
      id,
      children: content,
      options,
      onClose: handleClose,
    };
    toastManager.addWindow(id, windowData);
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
