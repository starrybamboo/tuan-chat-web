import type { ReactNode } from "react";

interface ProFeatureSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function ProFeatureSection({
  title,
  open,
  onToggle,
  badge,
  action,
  children,
}: ProFeatureSectionProps) {
  return (
    <div className="rounded-md border border-base-300 bg-base-100 shadow-none">
      <div className="flex items-center gap-3 px-4 py-4">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onToggle}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold text-base-content">{title}</span>
              {badge
                ? <span className="rounded-full bg-base-200 px-2 py-0.5 text-[11px] font-medium text-base-content/72">{badge}</span>
                : null}
            </div>
          </div>
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {open ? <div className="border-t border-base-300 px-4 py-4">{children}</div> : null}
    </div>
  );
}
