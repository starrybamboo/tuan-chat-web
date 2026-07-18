import type { HTMLAttributes, ReactNode } from "react";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import {
  SEMANTIC_APPEARANCES,
  type InterfaceDensity,
  type SemanticAppearance,
} from "@/components/common/DesignLanguage";

/** 公共状态与反馈原语支持的完整颜色语义清单。 */
export const STATUS_TONES = ["neutral", "info", "success", "warning", "error"] as const;
export type StatusTone = typeof STATUS_TONES[number];
/** 状态与反馈原语共享的四档强调强度。 */
export const STATUS_APPEARANCES = SEMANTIC_APPEARANCES;
export type BadgeAppearance = SemanticAppearance;
export type LoadingIndicatorSize = "compact" | "default" | "large";

const STATUS_APPEARANCE_TONE_CLASS: Record<SemanticAppearance, Record<StatusTone, string>> = {
  solid: {
    neutral: "border-base-content bg-base-content text-base-100",
    info: "border-info bg-info text-info-content",
    success: "border-success bg-success text-success-content",
    warning: "border-warning bg-warning text-warning-content",
    error: "border-error bg-error text-error-content",
  },
  soft: {
    neutral: "border-base-content/15 bg-base-content/10 text-base-content",
    info: "border-info/25 bg-info/10 text-info",
    success: "border-success/25 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    error: "border-error/25 bg-error/10 text-error",
  },
  outline: {
    neutral: "border-base-content/50 bg-transparent text-base-content",
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

/** 生成语义色表面的四档强调颜色类。 */
export function statusSurfaceClassName({
  tone = "neutral",
  appearance = "soft",
}: {
  tone?: StatusTone;
  appearance?: SemanticAppearance;
} = {}) {
  return STATUS_APPEARANCE_TONE_CLASS[appearance][tone];
}

const COUNT_BADGE_APPEARANCE_TONE_CLASS: Record<SemanticAppearance, Record<StatusTone, string>> = {
  solid: {
    neutral: "border-base-content bg-base-content text-base-100",
    info: "border-info bg-info text-info-content",
    success: "border-success bg-success text-success-content",
    warning: "border-warning bg-warning text-warning-content",
    error: "border-error bg-error text-error-content",
  },
  soft: {
    neutral: "border-base-content/15 bg-base-content/10 text-base-content",
    info: "border-info/25 bg-info/10 text-info",
    success: "border-success/25 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    error: "border-error/25 bg-error/10 text-error",
  },
  outline: {
    neutral: "border-base-content/50 bg-transparent text-base-content",
    info: "border-info/60 bg-transparent text-info",
    success: "border-success/60 bg-transparent text-success",
    warning: "border-warning/65 bg-transparent text-warning",
    error: "border-error/60 bg-transparent text-error",
  },
  ghost: {
    neutral: "border-transparent bg-transparent text-base-content/70",
    info: "border-transparent bg-transparent text-info",
    success: "border-transparent bg-transparent text-success",
    warning: "border-transparent bg-transparent text-warning",
    error: "border-transparent bg-transparent text-error",
  },
};

/** 生成实心计数标记的颜色、尺寸和文字样式。 */
export function countBadgeClassName({
  tone = "error",
  appearance = "solid",
  className = "",
}: {
  tone?: StatusTone;
  appearance?: SemanticAppearance;
  className?: string;
}) {
  return [
    `tc-count-badge tc-count-badge-${appearance} inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[0.6875rem] font-semibold leading-none whitespace-nowrap`,
    COUNT_BADGE_APPEARANCE_TONE_CLASS[appearance][tone],
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

/** 生成局部反馈的语义色、四档外观与结构类。 */
export function inlineAlertClassName({
  tone = "neutral",
  appearance = "soft",
  className = "",
}: {
  tone?: StatusTone;
  appearance?: SemanticAppearance;
  className?: string;
} = {}) {
  return [
    `tc-inline-alert tc-inline-alert-${appearance} flex items-start gap-3 rounded-md border p-3 text-sm leading-6`,
    statusSurfaceClassName({ tone, appearance }),
    className,
  ].filter(Boolean).join(" ");
}

/** 统一局部告警、成功和状态提示的语义色、外观与可访问角色。 */
export function InlineAlert({
  children,
  tone = "neutral",
  appearance = "soft",
  icon,
  role = tone === "error" ? "alert" : "status",
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: StatusTone;
  appearance?: SemanticAppearance;
  icon?: ReactNode;
}) {
  return (
    <div
      {...rest}
      role={role}
      className={inlineAlertClassName({ tone, appearance, className })}
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
  appearance = "soft",
  className = "",
}: {
  tone?: StatusTone;
  density?: InterfaceDensity;
  appearance?: BadgeAppearance;
  className?: string;
}) {
  return [
    `tc-badge tc-badge-${appearance} whitespace-nowrap`,
    density === "compact" ? "min-h-5 px-2 text-xs" : "min-h-7 px-2.5 text-sm",
    statusSurfaceClassName({ tone, appearance }),
    className,
  ].filter(Boolean).join(" ");
}

/** 统一不可交互状态标记的颜色、边框和两档密度。 */
export function Badge({
  children,
  tone = "neutral",
  density = "compact",
  appearance = "soft",
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

/** 统一未读、数量和计数反馈，默认使用最高识别度的实心外观。 */
export function CountBadge({
  children,
  tone = "error",
  appearance = "solid",
  className = "",
}: {
  children: ReactNode;
  tone?: StatusTone;
  appearance?: SemanticAppearance;
  className?: string;
}) {
  return (
    <span className={countBadgeClassName({ tone, appearance, className })}>
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
