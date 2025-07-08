import { getScreenSize } from "@/utils/getScreenSize";
import React from "react";

export function OpenAbleDrawer({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) {
  if (!isOpen) {
    return null;
  }
  if (getScreenSize() === "sm") {
    return (
      <div className="w-full h-full absolute">
        {children}
      </div>
    );
  }
  return children;
}
