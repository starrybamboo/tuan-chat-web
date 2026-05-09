import type { ReactNode } from "react";

interface SidebarCardProps {
  leading: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  active?: boolean;
  descriptionClassName?: string;
}

export function SidebarCard({
  leading,
  title,
  description,
  action,
  active = false,
  descriptionClassName = "mt-1 break-words text-xs leading-5 text-base-content/70 whitespace-normal",
}: SidebarCardProps) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-lg p-3 transition-all duration-150 ${
        active ? "bg-base-100" : "hover:bg-base-100"
      }`}
    >
      <div className="shrink-0">{leading}</div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <h3 className="truncate font-medium">{title}</h3>
        <p className={descriptionClassName}>{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
