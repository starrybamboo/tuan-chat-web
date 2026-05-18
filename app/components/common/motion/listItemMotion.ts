import type { MotionProps } from "motion/react";

type SlideDirection = "up" | "left";

interface ListItemMotionOptions {
  direction?: SlideDirection;
  distance?: number;
  duration?: number;
  staggerDelay?: number;
  maxDelay?: number;
}

export function listItemMotionProps(
  index: number,
  options: ListItemMotionOptions = {},
): MotionProps {
  const {
    direction = "up",
    distance = 20,
    duration = 0.3,
    staggerDelay = 0.05,
    maxDelay = 0.4,
  } = options;

  const offset = direction === "up" ? { y: distance } : { x: -distance };
  const reset = direction === "up" ? { y: 0 } : { x: 0 };

  return {
    initial: { opacity: 0, ...offset },
    animate: { opacity: 1, ...reset },
    transition: { duration, delay: Math.min(index * staggerDelay, maxDelay) },
  };
}
