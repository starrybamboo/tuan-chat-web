import type { Message } from "../../../../api";

import React from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import { useOptionalStateRuntimeContext } from "@/components/chat/state/stateRuntimeContext";
import { collectStateEventScopeLabels, formatStateEventAtomDetail, formatStateEventPreviewText, formatStateScopeLabel, getNormalizedStateEventExtra } from "@/types/stateEvent";

interface StateMessageCardProps {
  message: Pick<Message, "content" | "extra"> & Partial<Pick<Message, "messageId">>;
}

export default function StateMessageCard({ message }: StateMessageCardProps) {
  const roomContext = React.use(RoomContext);
  const runtime = useOptionalStateRuntimeContext();
  const [expanded, setExpanded] = React.useState(false);
  const normalizedStateEvent = React.useMemo(() => getNormalizedStateEventExtra(message.extra), [message.extra]);
  const roleNameById = React.useMemo(() => {
    const nextMap: Record<number, string> = {};
    const allRoles = roomContext.roomAllRoles ?? roomContext.roomRolesThatUserOwn;
    allRoles.forEach((role) => {
      const roleId = Number(role.roleId ?? 0);
      const roleName = String(role.roleName ?? "").trim();
      if (roleId > 0 && roleName) {
        nextMap[roleId] = roleName;
      }
    });
    return nextMap;
  }, [roomContext.roomAllRoles, roomContext.roomRolesThatUserOwn]);
  const summary = typeof message.messageId === "number"
    ? runtime?.messageSummariesByMessageId[message.messageId]
    : undefined;
  const scopeLabels = React.useMemo(() => {
    if (!normalizedStateEvent) {
      return [];
    }
    return collectStateEventScopeLabels(normalizedStateEvent.events, { roleNameById });
  }, [normalizedStateEvent, roleNameById]);
  const scopeLabelReplacements = React.useMemo(() => {
    if (!normalizedStateEvent) {
      return [];
    }

    const seen = new Set<string>();
    return normalizedStateEvent.events.flatMap((event) => {
      if (event.type === "nextTurn") {
        return [];
      }
      const rawLabel = formatStateScopeLabel(event.scope);
      if (seen.has(rawLabel)) {
        return [];
      }
      seen.add(rawLabel);
      const displayLabel = formatStateScopeLabel(event.scope, { roleNameById });
      return rawLabel === displayLabel ? [] : [{ rawLabel, displayLabel }];
    });
  }, [normalizedStateEvent, roleNameById]);
  const fallbackDetailLines = React.useMemo(() => {
    if (!normalizedStateEvent) {
      return ["消息缺少可解析的 stateEvent 结构。"];
    }
    return normalizedStateEvent.events.map(event => formatStateEventAtomDetail(event, { roleNameById }));
  }, [normalizedStateEvent, roleNameById]);

  const primaryText = summary?.primaryText
    ?? formatStateEventPreviewText(message.extra, message.content).replace(/^\[状态\]\s*/, "");
  const compactPrimaryText = primaryText.replace(/\s*->\s*/g, "→");
  const compactText = scopeLabels.length > 0
    ? `${scopeLabels.join(" / ")} · ${compactPrimaryText}`
    : compactPrimaryText;
  const detailLines = React.useMemo(() => {
    const baseLines = summary?.detailLines ?? fallbackDetailLines;
    if (scopeLabelReplacements.length === 0) {
      return baseLines;
    }
    return baseLines.map(line => scopeLabelReplacements.reduce(
      (nextLine, pair) => nextLine.replaceAll(pair.rawLabel, pair.displayLabel),
      line,
    ));
  }, [fallbackDetailLines, scopeLabelReplacements, summary?.detailLines]);
  const sourceLabel = normalizedStateEvent
    ? `${normalizedStateEvent.source.kind}${normalizedStateEvent.source.commandName ? ` / ${normalizedStateEvent.source.commandName}` : ""} / ${normalizedStateEvent.source.parserVersion}`
    : "未知来源";

  return (
    <div className="inline-flex max-w-full flex-col items-center">
      <div className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded px-1.5 py-px text-[12px] leading-5 text-base-content/54 transition-colors duration-150 hover:bg-base-200/20">
        <span className="min-w-0 break-words text-center text-base-content/68">
          {compactText}
        </span>
        <button
          type="button"
          className="shrink-0 text-[11px] font-medium text-base-content/38 transition-colors hover:text-base-content/72"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded(value => !value);
          }}
        >
          {expanded ? "收起" : "详情"}
        </button>
      </div>

      {expanded && (
        <div className="mt-1 w-full max-w-[32rem] space-y-2 border-t border-base-300/40 pt-2 text-xs">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-base-content/50">
              原始命令
            </div>
            <div className="break-words rounded-md bg-base-200/35 px-2 py-1.5 font-mono text-[12px] text-base-content/76">
              {message.content || "[空命令]"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-base-content/60">
            <span className="uppercase tracking-wide text-base-content/42">来源</span>
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
                  className="break-words rounded-md bg-base-200/30 px-2 py-1.5 text-base-content/70"
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
