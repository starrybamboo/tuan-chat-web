import type { MotionProps } from "motion/react";

export const interactiveButtonMotionProps = {
  whileHover: { scale: 1.06, y: -1.5 },
  whileTap: { scale: 0.95, y: 0 },
  transition: { type: "spring", stiffness: 560, damping: 30, mass: 0.5 },
} satisfies MotionProps;
