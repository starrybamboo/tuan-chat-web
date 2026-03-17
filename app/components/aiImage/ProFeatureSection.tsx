import type { ReactNode } from "react";

interface ProFeatureSectionProps {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function ProFeatureSection({
  title,
  description,
  open,
  onToggle,
  badge,
  action,
  children,
}: ProFeatureSectionProps) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
      <div className="flex items-start gap-3 px-4 py-3">
        <button type="button" className="flex flex-1 items-start gap-3 text-left" onClick={onToggle}>
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-200 text-base-content/60">
            <svg
              viewBox="0 0 16 16"
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 3.5 10.5 8 6 12.5" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-base-content">{title}</span>
              {badge
                ? <span className="rounded-full bg-base-200 px-2 py-0.5 text-[11px] font-medium text-base-content/70">{badge}</span>
                : null}
            </div>
            <div className="mt-1 text-xs leading-5 text-base-content/60">{description}</div>
          </div>
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {open ? <div className="border-t border-base-300 px-4 py-4">{children}</div> : null}
    </div>
  );
}
