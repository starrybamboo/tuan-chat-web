import type { ReactNode } from "react";
import { ChevronRightIcon } from "app/icons";

interface RoleSidebarActionCardProps {
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
    <div className={`card rounded-xl bg-base-100 transition-all duration-200 ${className}`}>
      <div className="card-body gap-3 p-4">
        <button
          type="button"
          className="flex min-w-0 items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-base-300/80"
          onClick={onClick}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center">
              {icon}
            </div>
            <div className="min-w-0 space-y-0.5">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className={`text-sm font-medium ${subtitleClassName}`}>
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 whitespace-nowrap pl-3 text-base-content/50">
            <span className="text-xs">{actionLabel}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </div>
        </button>

        {extraContent}
      </div>
    </div>
  );
}
