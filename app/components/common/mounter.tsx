import type React from "react";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

export function Mounter({ children, targetId }: { children: React.ReactNode; targetId: string }) {
  const [isMounted, setIsMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  useEffect(() => {
    if (isMounted && modalRef.current) {
      const modalRoot = document.getElementById(targetId);
      if (modalRoot) {
        modalRoot.appendChild(modalRef.current);
      }
    }
  }, [isMounted]);
  // 必须要在组件挂载后才能获取modalRoot，否则在build的时候会爆错。
  if (!isMounted) {
    return null;
  }
  const modalRoot = document.getElementById(targetId);

  if (!modalRoot) {
    return null;
  }
  return ReactDOM.createPortal(
    children,
    modalRoot,
  );
}
