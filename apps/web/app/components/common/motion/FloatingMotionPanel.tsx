import type { MotionProps } from "motion/react";
import type { ComponentProps } from "react";

import { motion } from "motion/react";

import { motionEase } from "@/components/common/motion/motionTokens";

const floatingPanelMotionProps = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 6, scale: 0.98 },
  transition: { duration: 0.16, ease: motionEase.emphasized },
} satisfies MotionProps;

function floatingListItemMotionProps(index: number): MotionProps {
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

type FloatingMotionPanelProps = ComponentProps<typeof motion.div>;
type FloatingMotionItemProps = ComponentProps<typeof motion.div> & {
  index: number;
};
type FloatingMotionButtonProps = ComponentProps<typeof motion.button> & {
  index: number;
};
type FloatingMotionListProps = ComponentProps<typeof motion.ul>;
type FloatingMotionListItemProps = ComponentProps<typeof motion.li> & {
  index: number;
};

export function FloatingMotionPanel({ children, ...props }: FloatingMotionPanelProps) {
  return (
    <motion.div {...floatingPanelMotionProps} {...props}>
      {children}
    </motion.div>
  );
}

export function FloatingMotionItem({ children, index, ...props }: FloatingMotionItemProps) {
  return (
    <motion.div {...floatingListItemMotionProps(index)} {...props}>
      {children}
    </motion.div>
  );
}

export function FloatingMotionButton({ children, index, ...props }: FloatingMotionButtonProps) {
  return (
    <motion.button {...floatingListItemMotionProps(index)} {...props}>
      {children}
    </motion.button>
  );
}

export function FloatingMotionList({ children, ...props }: FloatingMotionListProps) {
  return (
    <motion.ul {...floatingPanelMotionProps} {...props}>
      {children}
    </motion.ul>
  );
}

export function FloatingMotionListItem({ children, index, ...props }: FloatingMotionListItemProps) {
  return (
    <motion.li {...floatingListItemMotionProps(index)} {...props}>
      {children}
    </motion.li>
  );
}
