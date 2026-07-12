import type { ReactNode } from "react";

import { surfaceClassName } from "@/components/common/DesignLanguage";

import { ChevronRightIcon } from "@/icons";

type RoleSidebarActionCardProps = {
  title: string;
  subtitle: string;
  subtitleClassName?: string;
  actionLabel: string;
  icon: ReactNode;
  onClick: () => void;
  extraContent?: ReactNode;
  className?: string;
}

export default function RoleSidebarActionCard({
  title,
  subtitle,
  subtitleClassName = "",
  actionLabel,
  icon,
  onClick,
  extraContent,
  className = "",
}: RoleSidebarActionCardProps) {
  return (
    <div className={surfaceClassName({ level: "content", className: `
      w-full transition-all duration-200
      motion-reduce:transition-none
      ${className}
    ` })}>
      <div className="flex flex-col gap-3 p-4">
        <button
          type="button"
          className="
            flex min-w-0 items-center justify-between gap-3 rounded-xl p-2
            text-left transition-colors motion-reduce:transition-none
            hover:bg-base-300/80
          "
          onClick={onClick}
          title={`${actionLabel}：${title}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center">
              {icon}
            </div>
            <div className="min-w-0 space-y-0.5">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p
                className={`
                truncate text-xs/5 font-medium
                ${subtitleClassName}
              `}
                title={subtitle}
              >
                {subtitle}
              </p>
            </div>
          </div>
          <div className="
            flex shrink-0 items-center gap-1 whitespace-nowrap pl-3
            text-base-content/50
          ">
            <span className="text-xs">{actionLabel}</span>
            <ChevronRightIcon className="size-4" />
          </div>
        </button>

        {extraContent}
      </div>
    </div>
  );
}
