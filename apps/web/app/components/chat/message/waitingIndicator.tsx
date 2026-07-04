import { motion } from "motion/react";

export default function WaitingIndicator({
  name = "等待扮演",
  compact = false,
}: {
  compact?: boolean;
  name?: null | string;
}) {
  const dotSizeClass = compact ? "size-1" : "size-1.5";
  const dotGapClass = compact ? "gap-0.5" : "gap-1";

  return (
    <span className={compact ? "inline-flex items-center gap-1.5 text-warning" : `
      inline-flex items-center gap-2 text-warning
    `}>
      {name && <span className={compact ? "text-[11px] font-medium" : `
        text-xs font-medium
      `}>{name}</span>}
      <span className={`
        inline-flex shrink-0 items-center ${dotGapClass}
      `}>
        {[0, 1, 2].map(index => (
          <motion.span
            key={index}
            aria-hidden="true"
            animate={{ scale: [1, 1.5, 1] }}
            className={`
              ${dotSizeClass} rounded-full bg-current will-change-transform
            `}
            transition={{
              delay: index * 0.2,
              duration: 1.2,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        ))}
      </span>
    </span>
  );
}
