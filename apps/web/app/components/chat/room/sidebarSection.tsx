import type { ReactNode } from "react";

import { FolderPlusIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";

import { ChevronDown } from "@/icons";

type SidebarSectionProps = {
  title: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  withDivider?: boolean;
  actionTitle?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  actionVisibility?: "always" | "hover";
  className?: string;
  contentClassName?: string;
  fillContent?: boolean;
  children: ReactNode;
}

export default function SidebarSection({
  title,
  isExpanded,
  onToggleExpanded,
  withDivider = false,
  actionTitle,
  onAction,
  actionIcon,
  actionVisibility = "hover",
  className,
  contentClassName,
  fillContent = false,
  children,
}: SidebarSectionProps) {
  const handleToggleExpanded = () => {
    onToggleExpanded();
  };
  const sectionClassName = `px-1 ${withDivider ? "mt-0.5 border-t border-base-300/70 pt-1" : ""} ${className ?? ""}`;
  const headerClassName = "group flex items-center gap-1 rounded-md bg-base-300/55 px-2 py-1.5 text-[12.5px] font-semibold tracking-[0.08em] text-base-content/86";
  const iconButtonClassName = "inline-flex size-5 items-center justify-center rounded-sm text-base-content/60 transition hover:bg-base-100/70 hover:text-base-content/88";
  const actionButtonVisibilityClassName = actionVisibility === "always"
    ? "opacity-100"
    : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100";
  const actionButtonClassName = `ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-md text-base-content/62 transition-[opacity,color,background-color] duration-150 hover:bg-base-100/70 hover:text-base-content/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30 ${actionButtonVisibilityClassName}`;

  return (
    <section className={sectionClassName}>
      <div className={headerClassName}>
        <button
          type="button"
          className={iconButtonClassName}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleExpanded();
          }}
          title={isExpanded ? "折叠" : "展开"}
        >
          <ChevronDown className={`
            size-4
            ${isExpanded ? "" : "-rotate-90"}
          `} />
        </button>

        <button
          type="button"
          className="flex-1 truncate text-left select-none"
          onClick={handleToggleExpanded}
        >
          {title}
        </button>

        {onAction && actionTitle && (
          <button
            type="button"
            className={actionButtonClassName}
            title={actionTitle}
            aria-label={actionTitle}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAction();
            }}
          >
            <span className="inline-flex size-5 items-center justify-center">
              {actionIcon ?? <FolderPlusIcon className="size-4" weight="regular" />}
            </span>
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="sidebar-section-content"
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{
              height: { type: "spring", stiffness: 520, damping: 42, mass: 0.7 },
              opacity: { duration: 0.12 },
              y: { type: "spring", stiffness: 520, damping: 36, mass: 0.6 },
            }}
            // 可滚动分区需要让动画容器本身参与高度分配，否则内部 overflow 不会生效。
            className={fillContent ? `
              flex min-h-0 flex-1 flex-col overflow-hidden
            ` : `overflow-hidden`}
          >
            <div className={`
              mt-0.5 space-y-1
              ${fillContent ? "min-h-0 flex-1" : ""}
              ${contentClassName ?? ""}
            `}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
