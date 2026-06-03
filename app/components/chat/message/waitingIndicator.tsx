import { motion } from "motion/react";
import { waitingCoreMotionProps, waitingPulseMotionProps } from "@/components/common/motion/chatMessageMotion";

export default function WaitingIndicator({
  name = "等待扮演",
  compact = false,
}: {
  compact?: boolean;
  name?: null | string;
}) {
  const indicatorSizeClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const coreSizeClass = compact ? "h-2 w-2" : "h-2.5 w-2.5";
  const coreGlowClass = compact
    ? "shadow-[0_0_8px_color-mix(in_oklab,currentColor_45%,transparent)]"
    : "shadow-[0_0_10px_color-mix(in_oklab,currentColor_45%,transparent)]";

  return (
    <span className={compact ? "inline-flex items-center gap-1.5 text-warning" : "inline-flex items-center gap-2 text-warning"}>
      {name && <span className={compact ? "text-[11px] font-medium" : "text-xs font-medium"}>{name}</span>}
      <span className={`relative inline-flex ${indicatorSizeClass} shrink-0 items-center justify-center`}>
        <motion.span
          className="absolute inset-0 flex items-center justify-center text-warning/90"
          {...waitingPulseMotionProps(0)}
        >
          <svg aria-hidden="true" className="h-full w-full overflow-visible" viewBox="0 0 16 16">
            <circle cx="8" cy="8" fill="none" r="7.25" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </motion.span>
        <motion.span
          className="absolute inset-0 flex items-center justify-center text-warning/65"
          {...waitingPulseMotionProps(1)}
        >
          <svg aria-hidden="true" className="h-full w-full overflow-visible" viewBox="0 0 16 16">
            <circle cx="8" cy="8" fill="none" r="7.25" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </motion.span>
        <motion.span
          className={`${coreSizeClass} rounded-full bg-warning ${coreGlowClass}`}
          {...waitingCoreMotionProps}
        />
      </span>
    </span>
  );
}
