import type { Message } from "../../../../api";

import React from "react";
import { useOptionalStateRuntimeContext } from "@/components/chat/state/stateRuntimeContext";
import { formatStateEventAtomDetail, formatStateEventPreviewText, getNormalizedStateEventExtra } from "@/types/stateEvent";

type StateMessageCardProps = {
  message: Pick<Message, "content" | "extra"> & Partial<Pick<Message, "messageId">>;
};

export default function StateMessageCard({ message }: StateMessageCardProps) {
  const runtime = useOptionalStateRuntimeContext();
  const [expanded, setExpanded] = React.useState(false);
  const normalizedStateEvent = React.useMemo(() => getNormalizedStateEventExtra(message.extra), [message.extra]);
  const summary = typeof message.messageId === "number"
    ? runtime?.messageSummariesByMessageId[message.messageId]
    : undefined;
  const fallbackDetailLines = React.useMemo(() => {
    if (!normalizedStateEvent) {
      return ["消息缺少可解析的 stateEvent 结构。"];
    }
    return normalizedStateEvent.events.map(event => formatStateEventAtomDetail(event));
  }, [normalizedStateEvent]);

  const primaryText = summary?.primaryText
    ?? formatStateEventPreviewText(message.extra, message.content).replace(/^\[状态\]\s*/, "");
  const secondaryText = summary?.secondaryText;
  const detailLines = summary?.detailLines ?? fallbackDetailLines;
  const sourceLabel = normalizedStateEvent
    ? `${normalizedStateEvent.source.kind}${normalizedStateEvent.source.commandName ? ` / ${normalizedStateEvent.source.commandName}` : ""} / ${normalizedStateEvent.source.parserVersion}`
    : "未知来源";

  return (
    <div className="w-full max-w-[30rem] rounded-2xl border border-base-300/80 bg-base-100/85 px-3 py-2 shadow-sm backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <span className="badge badge-outline badge-sm shrink-0">状态</span>
        <div className="min-w-0 flex-1">
          <div className="break-words text-sm font-medium text-base-content">
            {primaryText}
          </div>
          {secondaryText && (
            <div className="mt-1 break-words text-xs text-base-content/60">
              {secondaryText}
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-xs shrink-0"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded(value => !value);
          }}
        >
          {expanded ? "收起" : "展开"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-base-300/70 pt-3 text-xs">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-base-content/50">
              原始命令
            </div>
            <div className="break-words rounded-xl bg-base-200/60 px-2 py-2 font-mono text-[12px] text-base-content/80">
              {message.content || "[空命令]"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-base-content/60">
            <span className="badge badge-ghost badge-xs">来源</span>
            <span className="break-all">{sourceLabel}</span>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-base-content/50">
              结构化详情
            </div>
            <div className="space-y-1">
              {detailLines.map((line, index) => (
                <div
                  key={`${message.messageId}:detail:${index}`}
                  className="break-words rounded-xl bg-base-200/40 px-2 py-1.5 text-base-content/75"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
