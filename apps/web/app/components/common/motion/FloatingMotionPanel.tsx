import type { ComponentProps } from "react";

import { motion } from "motion/react";

import { floatingListItemMotionProps, floatingPanelMotionProps } from "@/components/common/motion/floatingPanelMotion";

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
