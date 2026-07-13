import type { HTMLAttributes, ReactNode } from "react";

import { XIcon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import type { InterfaceDensity } from "@/components/common/DesignLanguage";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "error";
export type BadgeAppearance = "solid" | "outline" | "ghost";
export type LoadingIndicatorSize = "compact" | "default" | "large";

const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-base-300 bg-base-200 text-base-content/70",
  info: "border-info/25 bg-info/10 text-info",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-error/25 bg-error/10 text-error",
};

const BADGE_APPEARANCE_TONE_CLASS: Record<Exclude<BadgeAppearance, "solid">, Record<StatusTone, string>> = {
  outline: {
    neutral: "border-base-300 bg-transparent text-base-content/70",
    info: "border-info/25 bg-transparent text-info",
    success: "border-success/25 bg-transparent text-success",
    warning: "border-warning/30 bg-transparent text-warning",
    error: "border-error/25 bg-transparent text-error",
  },
  ghost: {
    neutral: "border-transparent bg-transparent text-base-content/70",
    info: "border-transparent bg-transparent text-info",
    success: "border-transparent bg-transparent text-success",
    warning: "border-transparent bg-transparent text-warning",
    error: "border-transparent bg-transparent text-error",
  },
};

const COUNT_BADGE_TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-neutral text-white",
  info: "bg-info text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  error: "bg-error text-white",
};

/** 生成实心计数标记的颜色、尺寸和文字样式。 */
export function countBadgeClassName({
  tone = "error",
  className = "",
}: {
  tone?: StatusTone;
  className?: string;
}) {
  return [
    "tc-count-badge inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.6875rem] font-semibold leading-none whitespace-nowrap",
    COUNT_BADGE_TONE_CLASS[tone],
    className,
  ].filter(Boolean).join(" ");
}

const LOADING_SIZE_CLASS: Record<LoadingIndicatorSize, string> = {
  compact: "size-icon-compact border-2",
  default: "size-icon-default border-2",
  large: "size-8 border-[3px]",
};

const PONG_FRAME_INTERVAL_MS = 80;
const PONG_FRAMES = [
  "▐⠂       ▌",
  "▐⠈       ▌",
  "▐ ⠂      ▌",
  "▐ ⠠      ▌",
  "▐  ⡀     ▌",
  "▐  ⠠     ▌",
  "▐   ⠂    ▌",
  "▐   ⠈    ▌",
  "▐    ⠂   ▌",
  "▐    ⠠   ▌",
  "▐     ⡀  ▌",
  "▐     ⠠  ▌",
  "▐      ⠂ ▌",
  "▐      ⠈ ▌",
  "▐       ⠂▌",
  "▐       ⠠▌",
  "▐       ⡀▌",
  "▐      ⠠ ▌",
  "▐      ⠂ ▌",
  "▐     ⠈  ▌",
  "▐     ⠂  ▌",
  "▐    ⠠   ▌",
  "▐    ⡀   ▌",
  "▐   ⠠    ▌",
  "▐   ⠂    ▌",
  "▐  ⠈     ▌",
  "▐  ⠂     ▌",
  "▐ ⠠      ▌",
  "▐ ⡀      ▌",
  "▐⠠       ▌",
] as const;

/** 统一局部告警、成功和状态提示的语义色与可访问角色。 */
export function InlineAlert({
  children,
  tone = "neutral",
  icon,
  role = tone === "error" ? "alert" : "status",
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: StatusTone;
  icon?: ReactNode;
}) {
  return (
    <div
      {...rest}
      role={role}
      className={`flex items-start gap-3 rounded-md border p-3 text-sm leading-6 ${STATUS_TONE_CLASS[tone]} ${className}`}
    >
      {icon != null ? <span className="mt-0.5 shrink-0" aria-hidden="true">{icon}</span> : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** 统一按钮和区域级不确定加载指示，并尊重 reduced-motion。 */
export function LoadingIndicator({
  size = "default",
  label = "正在加载",
  className = "",
}: {
  size?: LoadingIndicatorSize;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-current border-r-transparent motion-reduce:animate-none ${LOADING_SIZE_CLASS[size]} ${className}`}
    />
  );
}

/** 使用 cli-spinners `pong` 帧表达区域级不确定加载状态。 */
export function PongLoader({
  label = "正在加载",
  announce = true,
  className = "",
}: {
  label?: string;
  announce?: boolean;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setFrameIndex(current => (current + 1) % PONG_FRAMES.length);
    }, PONG_FRAME_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [shouldReduceMotion]);

  return (
    <span
      role={announce ? "status" : undefined}
      aria-label={announce ? label : undefined}
      aria-hidden={announce ? undefined : true}
      className={`inline-flex w-[10ch] items-center justify-center whitespace-pre font-mono text-sm font-medium leading-none text-info ${className}`}
    >
      {PONG_FRAMES[frameIndex]}
    </span>
  );
}

/** 统一骨架屏的颜色、圆角、动画与 reduced-motion 行为。 */
export function Skeleton({
  className = "h-4 w-full",
  rounded = "default",
}: {
  className?: string;
  rounded?: "default" | "full";
}) {
  return <span aria-hidden="true" className={`tc-skeleton block ${rounded === "full" ? "rounded-full" : ""} ${className}`} />;
}

/** 生成状态标记的语义色、密度与外观类。 */
export function badgeClassName({
  tone = "neutral",
  density = "compact",
  appearance = "solid",
  className = "",
}: {
  tone?: StatusTone;
  density?: InterfaceDensity;
  appearance?: BadgeAppearance;
  className?: string;
}) {
  return [
    "tc-badge whitespace-nowrap",
    density === "compact" ? "min-h-5 px-2 text-xs" : "min-h-7 px-2.5 text-sm",
    appearance === "solid" ? STATUS_TONE_CLASS[tone] : BADGE_APPEARANCE_TONE_CLASS[appearance][tone],
    className,
  ].filter(Boolean).join(" ");
}

/** 统一不可交互状态标记的颜色、边框和两档密度。 */
export function Badge({
  children,
  tone = "neutral",
  density = "compact",
  appearance = "solid",
  className = "",
}: {
  children: ReactNode;
  tone?: StatusTone;
  density?: InterfaceDensity;
  appearance?: BadgeAppearance;
  className?: string;
}) {
  return (
    <span className={badgeClassName({ tone, density, appearance, className })}>
      {children}
    </span>
  );
}

/** 统一未读、数量和计数反馈，使用实心底色与白色数字。 */
export function CountBadge({
  children,
  tone = "error",
  className = "",
}: {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span className={countBadgeClassName({ tone, className })}>
      {children}
    </span>
  );
}

/** 统一头像、图标等对象右上角的状态角标定位。 */
export function StatusIndicator({
  children,
  indicator,
  className = "",
  indicatorClassName = "",
}: {
  children: ReactNode;
  indicator?: ReactNode;
  className?: string;
  indicatorClassName?: string;
}) {
  return (
    <span className={`relative inline-flex ${className}`}>
      {children}
      {indicator != null
        ? (
            <span
              className={`pointer-events-none absolute right-0 top-0 z-10 translate-x-1/2 -translate-y-1/2 ${indicatorClassName}`}
            >
              {indicator}
            </span>
          )
        : null}
    </span>
  );
}

/** 统一可移除标签的选中、焦点和移除热区。 */
export function Tag({
  children,
  selected = false,
  disabled = false,
  onRemove,
  removeLabel = "移除标签",
  className = "",
}: {
  children: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}) {
  return (
    <span
      data-selected={selected ? "true" : undefined}
      aria-disabled={disabled || undefined}
      className={[
        "inline-flex min-h-control-compact items-center gap-1 rounded-md border px-2 text-sm transition-colors",
        selected ? "border-info/35 bg-info/10 text-info" : "border-base-300 bg-base-100 text-base-content/75",
        disabled ? "opacity-45" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
      {onRemove
        ? (
            <button
              type="button"
              className="inline-flex size-hit-compact items-center justify-center rounded-md hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-info/20"
              aria-label={removeLabel}
              title={removeLabel}
              disabled={disabled}
              onClick={onRemove}
            >
              <XIcon className="size-icon-compact" weight="regular" />
            </button>
          )
        : null}
    </span>
  );
}

/** 统一水平或垂直分隔线的颜色与语义。 */
export function Divider({
  orientation = "horizontal",
  children,
  className = "",
}: {
  orientation?: "horizontal" | "vertical";
  children?: ReactNode;
  className?: string;
}) {
  if (children != null && orientation === "horizontal") {
    return (
      <div role="separator" aria-orientation="horizontal" className={`flex w-full items-center gap-3 ${className}`}>
        <span className="tc-divider flex-1" aria-hidden="true" />
        <span className="shrink-0 text-supporting text-base-content/60">{children}</span>
        <span className="tc-divider flex-1" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={`${orientation === "horizontal" ? "tc-divider w-full" : "h-full w-px bg-base-content/15"} ${className}`}
    />
  );
}

const PROGRESS_TONE_CLASS: Record<Exclude<StatusTone, "neutral">, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
};

/** 生成进度条的统一语义色与项目原语类。 */
export function progressBarClassName({
  tone = "info",
  className = "",
}: {
  tone?: Exclude<StatusTone, "neutral">;
  className?: string;
} = {}) {
  return ["tc-progress", PROGRESS_TONE_CLASS[tone], className].filter(Boolean).join(" ");
}

/** 统一确定进度与不确定进度，并提供可访问标签。 */
export function ProgressBar({
  value,
  max = 100,
  label = "进度",
  tone = "info",
  className = "",
}: {
  value?: number;
  max?: number;
  label?: string;
  tone?: Exclude<StatusTone, "neutral">;
  className?: string;
}) {
  return (
    <progress
      className={progressBarClassName({ tone, className })}
      value={value}
      max={max}
      aria-label={label}
    />
  );
}
