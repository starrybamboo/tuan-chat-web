import type { MotionProps } from "motion/react";

import { motionDuration } from "./motionTokens";

type SlideDirection = "up" | "left";

type ListItemMotionOptions = {
  direction?: SlideDirection;
  distance?: number;
  duration?: number;
  staggerDelay?: number;
  maxDelay?: number;
};

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

type StructuralListItemMotionOptions = {
  index?: number;
  staggerDelay?: number;
  maxDelay?: number;
  layout?: MotionProps["layout"];
};

export function structuralListItemMotionProps(
  options: StructuralListItemMotionOptions = {},
): MotionProps {
  const {
    index = 0,
    staggerDelay = 0,
    maxDelay = motionDuration.fast,
    layout = true,
  } = options;

  return {
    layout,
    initial: { opacity: 0, y: 6, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -4, scale: 0.98 },
    transition: {
      layout: { duration: motionDuration.base, ease: "easeOut" },
      opacity: {
        duration: motionDuration.fast,
        delay: Math.min(index * staggerDelay, maxDelay),
      },
      y: { duration: motionDuration.fast, ease: "easeOut" },
      scale: { duration: motionDuration.fast, ease: "easeOut" },
    },
  };
}

export const panelSwapMotionProps: MotionProps = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
  transition: { duration: motionDuration.fast, ease: "easeOut" },
};

export const drillInPanelMotionProps: MotionProps = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 16 },
  transition: { duration: motionDuration.base, ease: "easeOut" },
};

export function springCollapseMotionProps(offsetY = -4): MotionProps {
  return {
    initial: { opacity: 0, height: 0, y: offsetY },
    animate: { opacity: 1, height: "auto", y: 0 },
    exit: { opacity: 0, height: 0, y: offsetY },
    transition: {
      height: { type: "spring", stiffness: 520, damping: 42, mass: 0.7 },
      opacity: { duration: 0.12 },
      y: { type: "spring", stiffness: 520, damping: 36, mass: 0.6 },
    },
  };
}
