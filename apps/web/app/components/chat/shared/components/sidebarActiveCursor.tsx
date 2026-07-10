import { motion } from "motion/react";

import type { ChatSidebarActiveTone } from "./chatSidebarActiveTone";

type SidebarActiveCursorProps = {
  isActive: boolean;
  tone?: ChatSidebarActiveTone;
};

export const chatSidebarActiveCursorLayoutId = "chat-sidebar-active-cursor";

export default function SidebarActiveCursor({ isActive, tone = "default" }: SidebarActiveCursorProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div
      layoutId={chatSidebarActiveCursorLayoutId}
      className={`
        absolute left-[-6px] z-10 top-1/2 -translate-y-1/2 h-8 w-1
        rounded-full
        ${tone === "collapsed" ? "bg-warning" : "bg-info"}
      `}
      data-tone={tone}
      transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.45 }}
    />
  );
}
