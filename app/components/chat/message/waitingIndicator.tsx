import { motion } from "motion/react";
import { waitingCoreMotionProps, waitingPulseMotionProps } from "@/components/common/motion/chatMessageMotion";

export default function WaitingIndicator({
  name = "等待扮演",
  compact = false,
}: {
  compact?: boolean;
  name?: string;
}) {
  return (
    <span className={compact ? "inline-flex items-center gap-1.5 text-warning" : "inline-flex items-center gap-2 text-warning"}>
      <span className={compact ? "text-[11px] font-medium" : "text-xs font-medium"}>{name}</span>
      <span className={compact ? "relative inline-flex h-3.5 w-3.5 items-center justify-center" : "relative inline-flex h-4 w-4 items-center justify-center"}>
        <motion.span
          className="absolute inset-0 rounded-full border border-warning/90"
          {...waitingPulseMotionProps(0)}
        />
        <motion.span
          className="absolute inset-0 rounded-full border border-warning/65"
          {...waitingPulseMotionProps(1)}
        />
        <motion.span
          className={compact ? "h-2 w-2 rounded-full bg-warning shadow-[0_0_8px_color-mix(in_oklab,currentColor_45%,transparent)]" : "h-2.5 w-2.5 rounded-full bg-warning shadow-[0_0_10px_color-mix(in_oklab,currentColor_45%,transparent)]"}
          {...waitingCoreMotionProps}
        />
      </span>
    </span>
  );
}
