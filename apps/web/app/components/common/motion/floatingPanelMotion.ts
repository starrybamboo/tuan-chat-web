import type { MotionProps } from "motion/react";

export const floatingPanelMotionProps = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 6, scale: 0.98 },
  transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
} satisfies MotionProps;

export function floatingListItemMotionProps(index: number): MotionProps {
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: {
      duration: 0.14,
      delay: Math.min(index * 0.025, 0.16),
      ease: "easeOut",
    },
  };
}
