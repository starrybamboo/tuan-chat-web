import { motion } from "motion/react";
import { typingDotMotionProps } from "@/components/common/motion/chatMessageMotion";

export default function TypingIndicator({
  name,
  compact = false,
  accentClassName = "text-info",
  dotClassName = "bg-info/70",
}: {
  accentClassName?: string;
  compact?: boolean;
  dotClassName?: string;
  name?: string;
}) {
  return (
    <span className={compact ? "inline-flex items-center gap-1" : `
      inline-flex items-center gap-2 px-4 py-2
    `}>
      {name && <span className={compact ? `
        text-[11px]
        ${accentClassName}
      ` : `
        text-xs
        ${accentClassName}
      `}>{name}</span>}
      <span className={compact ? "inline-flex items-center gap-0.5" : `
        inline-flex items-center gap-1
      `}>
        <motion.span className={compact ? `
          size-1 rounded-full
          ${dotClassName}
        ` : `
          size-1.5 rounded-full
          ${dotClassName}
        `} {...typingDotMotionProps(0)} />
        <motion.span className={compact ? `
          size-1 rounded-full
          ${dotClassName}
        ` : `
          size-1.5 rounded-full
          ${dotClassName}
        `} {...typingDotMotionProps(1)} />
        <motion.span className={compact ? `
          size-1 rounded-full
          ${dotClassName}
        ` : `
          size-1.5 rounded-full
          ${dotClassName}
        `} {...typingDotMotionProps(2)} />
      </span>
    </span>
  );
}
