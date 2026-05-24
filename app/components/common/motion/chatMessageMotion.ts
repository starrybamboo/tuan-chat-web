import type { MotionProps } from "motion/react";

export const scrollToBottomButtonMotionProps: MotionProps = {
  initial: { opacity: 0, y: 18, scale: 0.86 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 18, scale: 0.88 },
  transition: { type: "spring", stiffness: 520, damping: 24, mass: 0.7 },
};

export const unreadBadgeBounceMotionProps: MotionProps = {
  initial: { scale: 0.72, y: 3 },
  animate: {
    scale: [0.72, 1.18, 0.98, 1.08, 1],
    y: [3, -5, 1, -2, 0],
  },
  transition: { duration: 0.46, ease: [0.16, 1, 0.3, 1] },
};

export const attachmentItemMotionProps: MotionProps = {
  initial: { opacity: 0, scale: 0.84, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92, y: 4 },
  transition: { type: "spring", stiffness: 480, damping: 26, mass: 0.6 },
};

export function typingDotMotionProps(index: number): MotionProps {
  return {
    animate: { y: [0, -6, 0], scale: [1, 1.1, 1] },
    transition: {
      duration: 0.85,
      repeat: Infinity,
      delay: index * 0.12,
      ease: "easeInOut",
    },
  };
}

export function waitingPulseMotionProps(index: number): MotionProps {
  return {
    animate: {
      opacity: [0.9, 0],
      scale: [0.62, 2.15],
    },
    transition: {
      duration: 1.35,
      repeat: Infinity,
      delay: index * 0.36,
      ease: "easeOut",
    },
  };
}

export const waitingCoreMotionProps: MotionProps = {
  animate: {
    scale: [1, 1.22, 1],
    opacity: [0.85, 1, 0.85],
  },
  transition: {
    duration: 1.35,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

export const skeletonFadeMotionProps: MotionProps = {
  initial: { opacity: 0, y: 4, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.28, ease: "easeOut" },
};

export const reactionPanelMotionProps: MotionProps = {
  initial: { opacity: 0, scale: 0.92, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.94, y: 8 },
  transition: { type: "spring", stiffness: 460, damping: 30, mass: 0.7 },
};

export const messageFilterToggleSweepMotionProps: MotionProps = {
  initial: { opacity: 0, x: "-28%" },
  animate: { opacity: [0, 0.72, 0], x: ["-28%", "18%", "42%"] },
  exit: { opacity: 0 },
  transition: { duration: 0.58, ease: [0.16, 1, 0.3, 1] },
};
