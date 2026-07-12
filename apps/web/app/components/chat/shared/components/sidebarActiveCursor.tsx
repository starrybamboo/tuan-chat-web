import { motion, useReducedMotion } from "motion/react";

import type { ChatSidebarActiveTone } from "./chatSidebarActiveTone";

type SidebarActiveCursorProps = {
  isActive: boolean;
  tone?: ChatSidebarActiveTone;
  layoutId?: string;
};

export const chatSidebarActiveCursorLayoutId = "chat-sidebar-active-cursor";

export default function SidebarActiveCursor({
  isActive,
  tone = "default",
  layoutId = chatSidebarActiveCursorLayoutId,
}: SidebarActiveCursorProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!isActive) {
    return null;
  }

  return (
    <motion.div
      layoutId={layoutId}
      aria-hidden="true"
      className={`
        pointer-events-none absolute left-0 top-1/2 z-10 h-10 w-1
        -translate-y-1/2 rounded-r-full
        ${tone === "collapsed" ? "bg-warning" : "bg-info"}
      `}
      data-tone={tone}
      data-sidebar-active-cursor={layoutId}
      transition={shouldReduceMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 520, damping: 36, mass: 0.45 }}
    />
  );
}
