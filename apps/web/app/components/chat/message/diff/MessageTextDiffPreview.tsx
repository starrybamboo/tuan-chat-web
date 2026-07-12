import { useDeferredValue } from "react";

import { Button } from "@/components/common/Button";

import type { MessageTextDiff, MessageTextDiffSegment } from "@/components/chat/message/diff/messageTextDiff";

type MessageTextDiffPreviewProps = {
  diff: MessageTextDiff | null;
  isStreaming?: boolean;
  emptyAfterText?: string;
  footerAction?: React.ReactNode;
  onAccept?: () => void;
  onCancel?: () => void;
}

type DiffLineTone = "before" | "after";

function renderSegments(segments: MessageTextDiffSegment[], tone: DiffLineTone): React.ReactNode {
  if (segments.length === 0) {
    return <span className="text-base-content/50">暂无内容</span>;
  }

  return segments.map((segment, index) => {
    const className = segment.kind === "equal"
      ? tone === "before" ? "text-base-content/50" : "text-base-content/85"
      : segment.kind === "delete"
        ? `
          rounded-sm bg-error/10 px-0.5 text-error/85 line-through
          decoration-error/70 decoration-1
        `
        : `
          rounded-sm bg-success/15 px-0.5 text-success underline
          decoration-success/60 decoration-1 underline-offset-2
        `;
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
  emptyAfterText = "暂无内容",
  footerAction,
  onAccept,
  onCancel,
}: MessageTextDiffPreviewProps) {
  const deferredDiff = useDeferredValue(diff);
  const activeDiff = deferredDiff ?? diff;

  if (!activeDiff) {
    return null;
  }

  const isPendingRewrite = isStreaming && !activeDiff.afterText;

  return (
    <div className="
      rounded-lg border border-base-300/55 bg-base-100/75 p-3 shadow-sm
      backdrop-blur-md
    ">
      <div className="space-y-2">
        <section className="
          rounded-md border-l-2 border-error/50 bg-error/5 px-3 py-2
        ">
          <div className="whitespace-pre-wrap wrap-break-word text-sm/6">
            {isPendingRewrite
              ? (activeDiff.beforeText || <span className="text-base-content/50">暂无内容</span>)
              : renderSegments(activeDiff.beforeSegments, "before")}
          </div>
        </section>

        <section className="
          rounded-md border-l-2 border-success/60 bg-success/5 px-3 py-2
        ">
          <div className="whitespace-pre-wrap wrap-break-word text-sm/6">
            {activeDiff.afterText
              ? renderSegments(activeDiff.afterSegments, "after")
              : <span className="text-base-content/50">{emptyAfterText}</span>}
          </div>
        </section>
      </div>

      {(footerAction || onCancel || onAccept) && (
        <div className="mt-3 flex justify-end gap-2">
          <span className="mr-auto text-xs text-base-content/60">接受后会替换当前消息文本</span>
          {footerAction}
          {onCancel && (
            <Button type="button" variant="ghost" size="xs" onClick={onCancel} title="拒绝，保留当前消息文本">
              拒绝
            </Button>
          )}
          {onAccept && (
            <Button
              type="button"
              variant="primary"
              size="xs"
              onClick={onAccept}
              disabled={!activeDiff.afterText || isStreaming}
              title="接受后会替换当前消息文本"
            >
              接受
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
