import type { ReactNode } from "react";

import { Button } from "@/components/common/Button";
import { PongLoader, ProgressBar } from "@/components/common/StatusPrimitives";

export type StateViewTone = "default" | "info" | "warning" | "error" | "success";
export type StateViewKind = "custom" | "empty" | "loading" | "error" | "offline" | "refreshing" | "progress";

export type StateViewProps = {
  title?: ReactNode;
  description?: ReactNode;
  tone?: StateViewTone;
  icon?: ReactNode;
  loading?: boolean;
  kind?: StateViewKind;
  progress?: number;
  progressMax?: number;
  compact?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

const TONE_CLASS: Record<StateViewTone, string> = {
  default: "text-base-content/60",
  info: "text-info",
  warning: "text-warning",
  error: "text-error",
  success: "text-success",
};

const DEFAULT_TITLE: Partial<Record<StateViewKind, string>> = {
  empty: "暂无内容",
  loading: "正在加载",
  error: "加载失败",
  offline: "当前处于离线状态",
  refreshing: "正在刷新",
  progress: "正在处理",
};

/**
 * 统一空态、加载态、错误态容器，收敛文案层级、loading 和主操作按钮。
 */
export function StateView({
  title,
  description,
  tone = "default",
  icon,
  loading = false,
  kind = loading ? "loading" : "custom",
  progress,
  progressMax = 100,
  compact = false,
  actionLabel,
  onAction,
  className = "",
}: StateViewProps) {
  const resolvedKind = loading ? "loading" : kind;
  const resolvedTone = tone === "default" && resolvedKind === "error" ? "error" : tone;
  const resolvedTitle = title ?? DEFAULT_TITLE[resolvedKind];
  const isBusy = resolvedKind === "loading" || resolvedKind === "refreshing" || resolvedKind === "progress";

  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-3 px-5 text-center",
        compact ? "py-6" : "py-16",
        TONE_CLASS[resolvedTone],
        className,
      ].filter(Boolean).join(" ")}
      role={resolvedTone === "error" ? "alert" : "status"}
      aria-live={resolvedTone === "error" ? "assertive" : "polite"}
      aria-busy={isBusy || undefined}
    >
      {resolvedKind === "loading" || resolvedKind === "refreshing"
        ? <PongLoader announce={false} label={typeof resolvedTitle === "string" ? resolvedTitle : "正在加载"} />
        : icon}
      {resolvedTitle
        ? (
            <div className={isBusy ? "text-sm font-medium text-base-content/75" : "text-lg font-medium text-base-content"}>
              {resolvedTitle}
            </div>
          )
        : null}
      {description ? <div className="max-w-md text-sm text-base-content/60">{description}</div> : null}
      {resolvedKind === "progress"
        ? <ProgressBar value={progress} max={progressMax} className="max-w-xs" label={typeof resolvedTitle === "string" ? resolvedTitle : "处理进度"} />
        : null}
      {actionLabel && onAction
        ? (
            <Button
              variant="outline"
              size="sm"
              className={resolvedTone === "error" ? "border-error/45 text-error hover:border-error/70 hover:bg-error/10" : undefined}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )
        : null}
    </div>
  );
}
