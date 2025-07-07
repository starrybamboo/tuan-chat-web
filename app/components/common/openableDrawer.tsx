import { isLgScreen } from "@/utils/getScreenSize";
import React from "react";

export function openAbleDrawer({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) {
  if (!isOpen) {
    return null;
  }
  if (isLgScreen()) {
    return children;
  }
  return (
    <div className={`side-drawer-opener ${isOpen ? "open" : ""}`}>
      {children}
    </div>
  );
}
