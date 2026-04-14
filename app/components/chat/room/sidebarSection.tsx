import type { ReactNode } from "react";

import { AddIcon, ChevronDown } from "@/icons";

interface SidebarSectionProps {
  title: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  withDivider?: boolean;
  actionTitle?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  className?: string;
  contentClassName?: string;
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
  className,
  contentClassName,
  children,
}: SidebarSectionProps) {
  const handleToggleExpanded = () => {
    onToggleExpanded();
  };
  const sectionClassName = `px-1 ${withDivider ? "mt-0.5 border-t border-base-300/70 pt-1" : ""} ${className ?? ""}`;
  const headerClassName = "group flex items-center gap-1 rounded-md bg-base-300/55 px-2 py-1.5 text-[12.5px] font-semibold tracking-[0.08em] text-base-content/86";
  const iconButtonClassName = "inline-flex size-5 items-center justify-center rounded-sm text-base-content/60 transition hover:bg-base-100/70 hover:text-base-content/88";
  const actionButtonClassName = iconButtonClassName;

  return (
    <section className={sectionClassName}>
      <div
        className={headerClassName}
        onClick={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest("button")) {
            return;
          }
          handleToggleExpanded();
        }}
      >
        <button
          type="button"
          className={iconButtonClassName}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleExpanded();
          }}
          title={isExpanded ? "折叠" : "展开"}
        >
          <ChevronDown className={`size-5 ${isExpanded ? "" : "-rotate-90"}`} />
        </button>

        <span className="flex-1 cursor-pointer truncate select-none">{title}</span>

        {onAction && actionTitle && (
          <button
            type="button"
            className={actionButtonClassName}
            title={actionTitle}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAction();
            }}
          >
            <span className="inline-flex size-5 items-center justify-center">
              {actionIcon ?? <AddIcon />}
            </span>
          </button>
        )}
      </div>

      {isExpanded && <div className={`mt-0.5 space-y-1 ${contentClassName ?? ""}`}>{children}</div>}
    </section>
  );
}
