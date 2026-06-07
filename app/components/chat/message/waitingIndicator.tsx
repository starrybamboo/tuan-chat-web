import { motion } from "motion/react";

export default function WaitingIndicator({
  name = "等待扮演",
  compact = false,
}: {
  compact?: boolean;
  name?: null | string;
}) {
  const indicatorSizeClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <span className={compact ? "inline-flex items-center gap-1.5 text-warning" : `
      inline-flex items-center gap-2 text-warning
    `}>
      {name && <span className={compact ? "text-[11px] font-medium" : `
        text-xs font-medium
      `}>{name}</span>}
      <span className={`
        relative inline-flex
        ${indicatorSizeClass}
        shrink-0 items-center justify-center
      `}>
        <svg aria-hidden="true" className="
          absolute inset-0 size-full text-warning/30
        " viewBox="0 0 16 16">
          <circle cx="8" cy="8" fill="none" r="6.25" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <motion.svg
          aria-hidden="true"
          animate={{ rotate: 360 }}
          className="absolute inset-0 size-full text-warning"
          transition={{ duration: 1.25, ease: "linear", repeat: Infinity }}
          viewBox="0 0 16 16"
        >
          <circle
            cx="8"
            cy="8"
            fill="none"
            r="6.25"
            stroke="currentColor"
            strokeDasharray="11 30"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </motion.svg>
      </span>
    </span>
  );
}
