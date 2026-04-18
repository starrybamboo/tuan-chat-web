import { useState } from "react";

import { NOVELAI_V45_CONTEXT_LIMIT } from "@/components/aiImage/novelaiV45TokenMeter";

type MeterRow = {
  label: string;
  value: string;
};

interface AiImageContextLimitMeterProps {
  localUsed: number;
  totalUsed: number;
  remaining: number;
  overflow: number;
  rows: MeterRow[];
  status: "loading" | "ready" | "fallback";
  footerLabel?: string;
  footerHint?: string;
  className?: string;
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(2)}%`;
}

export function AiImageContextLimitMeter({
  localUsed,
  totalUsed,
  remaining,
  overflow,
  rows,
  status,
  footerLabel,
  footerHint,
  className,
}: AiImageContextLimitMeterProps) {
  const localPercent = localUsed <= 0
    ? 0
    : Math.max(1.5, (localUsed / NOVELAI_V45_CONTEXT_LIMIT) * 100);
  const totalPercent = totalUsed <= 0
    ? 0
    : Math.max(1.5, (totalUsed / NOVELAI_V45_CONTEXT_LIMIT) * 100);
  const fillPercent = overflow > 0 ? 100 : localPercent;
  const statusLabel = status === "loading"
    ? "加载中"
    : status === "fallback"
      ? "估算"
      : "";
  const [footerTooltipState, setFooterTooltipState] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const showFooterTooltipAtPointer = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFooterTooltipState({
      x: event.clientX,
      y: event.clientY,
      visible: true,
    });
  };

  const showFooterTooltipAtButton = (event: React.FocusEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setFooterTooltipState({
      x: rect.left,
      y: rect.bottom,
      visible: true,
    });
  };

  return (
    <div className={className}>
      <div className="relative">
        <div
          className="peer relative h-1 w-full overflow-hidden rounded-md bg-base-content/12"
          role="img"
          aria-label={`Context Limit ${totalUsed}/${NOVELAI_V45_CONTEXT_LIMIT}`}
          tabIndex={0}
        >
          {totalPercent > 0
            ? (
                <div
                  className="absolute inset-y-0 left-0 rounded-md bg-base-content/18"
                  style={{ width: formatPercent(totalPercent) }}
                />
              )
            : null}
          {fillPercent > 0
            ? (
                <div
                  className={`absolute inset-y-0 left-0 rounded-md ${overflow > 0 ? "bg-warning" : "bg-base-content/80"}`}
                  style={{ width: formatPercent(fillPercent) }}
                />
              )
            : null}
        </div>

        {(footerLabel || footerHint)
          ? (
              <div className="mt-[13px] flex items-center gap-1 text-[11px] leading-none text-base-content/58">
                {footerLabel
                  ? <span>{footerLabel}</span>
                  : null}
                {footerHint
                  ? (
                      <button
                        type="button"
                        className="flex size-4 cursor-help items-center justify-center rounded-full bg-transparent text-base-content/28 transition hover:text-base-content/55 focus:outline-none"
                        aria-label={footerHint}
                        onBlur={() => setFooterTooltipState(prev => ({ ...prev, visible: false }))}
                        onFocus={showFooterTooltipAtButton}
                        onMouseEnter={showFooterTooltipAtPointer}
                        onMouseLeave={() => setFooterTooltipState(prev => ({ ...prev, visible: false }))}
                        onMouseMove={showFooterTooltipAtPointer}
                      >
                        <span className="flex size-3.5 items-center justify-center rounded-full border border-base-content/16 text-[9px] font-medium leading-none text-current">
                          ?
                        </span>
                      </button>
                    )
                  : null}
              </div>
            )
          : null}

        {footerHint && footerTooltipState.visible
          ? (
              <div
                className="pointer-events-none fixed z-30 flex min-h-[80px] w-[300px] items-center rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-[11px] leading-5 text-base-content/72 shadow-xl"
                style={{
                  left: footerTooltipState.x,
                  top: footerTooltipState.y,
                  transform: "translate(calc(-100% - 10px), 10px)",
                }}
              >
                {footerHint}
              </div>
            )
          : null}

        <div className="pointer-events-none absolute left-0 top-[calc(100%+0.5rem)] z-20 w-72 rounded-md border border-[#D6DCE3] bg-[#F3F5F7] p-3 opacity-0 shadow-[0_18px_36px_rgba(15,23,42,0.16)] transition duration-150 peer-hover:opacity-100 peer-focus:opacity-100 peer-focus-visible:opacity-100 dark:border-[#2A3138] dark:bg-[#161A1F] dark:shadow-[0_20px_40px_rgba(0,0,0,0.38)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-base-content">Context Limit</div>
            <div className="flex items-center gap-2 text-[11px] leading-none text-base-content/62">
              {statusLabel
                ? <span className="rounded-md bg-base-content/8 px-1.5 py-1">{statusLabel}</span>
                : null}
              <span>{`${totalUsed}/${NOVELAI_V45_CONTEXT_LIMIT}`}</span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {rows.map(row => (
              <div key={row.label} className="flex items-center justify-between gap-4 text-[11px] leading-none text-base-content/68">
                <span>{row.label}</span>
                <span className="font-medium text-base-content">{row.value}</span>
              </div>
            ))}
            <div className="border-t border-base-content/8 pt-2">
              <div className="flex items-center justify-between gap-4 text-[11px] leading-none text-base-content/68">
                <span>剩余</span>
                <span className="font-medium text-base-content">{`${remaining}`}</span>
              </div>
              {overflow > 0
                ? (
                    <div className="mt-2 flex items-center justify-between gap-4 text-[11px] leading-none text-warning">
                      <span>超出</span>
                      <span className="font-medium">{`${overflow}`}</span>
                    </div>
                  )
                : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
