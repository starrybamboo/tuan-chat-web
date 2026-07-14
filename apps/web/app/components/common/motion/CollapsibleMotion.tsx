import type { MotionProps } from "motion/react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { AnimatePresence, motion } from "motion/react";

import { motionDuration } from "@/components/common/motion/motionTokens";

type CollapseOverflow = NonNullable<CSSProperties["overflow"]>;

function getCollapseMotionProps(expandedOverflow: CollapseOverflow): MotionProps {
  return {
    initial: { opacity: 0, height: 0, y: -4, overflow: "hidden" },
    animate: {
      opacity: 1,
      height: "auto",
      y: 0,
      transitionEnd: { overflow: expandedOverflow },
    },
    exit: { opacity: 0, height: 0, y: -4, overflow: "hidden" },
    transition: {
      height: { duration: motionDuration.base, ease: "easeOut" },
      opacity: { duration: motionDuration.fast },
      y: { duration: motionDuration.fast, ease: "easeOut" },
    },
  };
}

type CollapsibleMotionProps = Omit<ComponentProps<typeof motion.div>, "children"> & {
  open: boolean;
  children: ReactNode;
  expandedOverflow?: CollapseOverflow;
};

/** 统一处理内容区展开、收起和高度变化。 */
export function CollapsibleMotion({ open, children, expandedOverflow = "visible", ...props }: CollapsibleMotionProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div {...getCollapseMotionProps(expandedOverflow)} {...props}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
