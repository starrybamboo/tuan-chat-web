import type { MotionProps } from "motion/react";

export const privateChatPanelMotionProps: MotionProps = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.985 },
  transition: { type: "spring", stiffness: 460, damping: 30, mass: 0.7 },
};

export function privateChatListItemMotionProps(index: number): MotionProps {
  return {
    initial: { opacity: 0, y: 8, scale: 0.995 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      duration: 0.16,
      delay: Math.min(index * 0.025, 0.16),
      ease: "easeOut",
    },
  };
}

export const privateChatTabIndicatorMotionProps = {
  type: "spring",
  stiffness: 520,
  damping: 24,
  mass: 0.7,
} as const;
