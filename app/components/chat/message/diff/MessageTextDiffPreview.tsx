import { useDeferredValue } from "react";

import type { MessageTextDiff, MessageTextDiffSegment } from "@/components/chat/message/diff/messageTextDiff";

type MessageTextDiffPreviewProps = {
  diff: MessageTextDiff | null;
  isStreaming?: boolean;
  title?: string;
  beforeLabel?: string;
  afterLabel?: string;
  emptyAfterText?: string;
  onAccept?: () => void;
  onCancel?: () => void;
};

function renderSegments(segments: MessageTextDiffSegment[]): React.ReactNode {
  if (segments.length === 0) {
    return <span className="text-base-content/40">暂无内容</span>;
  }

  return segments.map((segment, index) => {
    const className = segment.kind === "equal"
      ? "text-base-content/80"
      : segment.kind === "delete"
        ? "rounded bg-error/15 px-0.5 text-error line-through"
        : "rounded bg-success/15 px-0.5 text-success";
    return (
      <span key={`${segment.kind}:${index}:${segment.text.length}`} className={className}>
        {segment.text}
      </span>
    );
  });
}

export default function MessageTextDiffPreview({
  diff,
  isStreaming = false,
  title = "消息差异",
  beforeLabel = "原内容",
  afterLabel = "新内容",
  emptyAfterText = "暂无内容",
  onAccept,
  onCancel,
}: MessageTextDiffPreviewProps) {
  const deferredDiff = useDeferredValue(diff);
  const activeDiff = deferredDiff ?? diff;

  if (!activeDiff) {
    return null;
  }

  const isPendingRewrite = isStreaming && !activeDiff.afterText;
  const { summary } = activeDiff;

  return (
    <div className="rounded-xl border border-base-300/80 bg-base-100/95 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {isStreaming && <span className="badge badge-outline badge-info">生成中</span>}
          {isPendingRewrite
            ? (
                <span className="badge badge-outline">等待结果</span>
              )
            : activeDiff.hasChanges
            ? (
                <>
                  <span className="badge badge-outline badge-success">{`+${summary.insertedChars}`}</span>
                  <span className="badge badge-outline badge-error">{`-${summary.deletedChars}`}</span>
                </>
              )
            : (
                <span className="badge badge-outline">无文本变化</span>
              )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={onCancel}>
              取消
            </button>
          )}
          {onAccept && (
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={onAccept}
              disabled={!activeDiff.afterText || isStreaming}
            >
              应用修改
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <section className="rounded-lg border border-base-300/70 bg-base-200/40 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-base-content/50">
            {beforeLabel}
          </div>
          <div className="whitespace-pre-wrap break-words text-sm leading-6">
            {isPendingRewrite
              ? (activeDiff.beforeText || <span className="text-base-content/40">暂无内容</span>)
              : renderSegments(activeDiff.beforeSegments)}
          </div>
        </section>

        <section className="rounded-lg border border-base-300/70 bg-base-200/20 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-base-content/50">
            {afterLabel}
          </div>
          <div className="whitespace-pre-wrap break-words text-sm leading-6">
            {activeDiff.afterText
              ? renderSegments(activeDiff.afterSegments)
              : <span className="text-base-content/40">{emptyAfterText}</span>}
          </div>
        </section>
      </div>

      <div className="mt-3 text-xs text-base-content/55">
        {isStreaming
          ? "正在生成新版本内容。"
          : "可先查看差异，再决定是否应用修改。"}
      </div>
    </div>
  );
}
