import React from "react";

import { RoomContext } from "@/components/chat/core/roomContext";
import { useOptionalStateRuntimeContext } from "@/components/chat/state/stateRuntimeContext";
import { collectStateEventScopeLabels, formatStateEventAtomDetail, formatStateEventPreviewText, formatStateRoleLabel, formatStateScopeLabel, getNormalizedStateEventExtra } from "@/types/stateEvent";

import type { Message } from "../../../../api";

type StateMessageCardProps = {
  message: Pick<Message, "content" | "extra"> & Partial<Pick<Message, "messageId">>;
}

const STATE_MESSAGE_CARD_CLASS = "inline-flex min-w-0 max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[11px] leading-4 transition-colors duration-150";
const STATE_MESSAGE_IDLE_CLASS = "text-base-content/50 hover:text-base-content/70";
const STATE_MESSAGE_TEXT_CLASS = "min-w-0 break-words text-center text-current";
const STATE_MESSAGE_ACTION_CLASS = "shrink-0 text-[11px] text-current opacity-45 transition-opacity hover:opacity-75";
const STATE_MESSAGE_DETAIL_CLASS = "mt-1 w-full max-w-[32rem] space-y-2 rounded-md border border-base-content/8 bg-base-100/75 px-2.5 py-2 text-xs text-base-content/65 shadow-sm backdrop-blur-sm";

export function buildStateRoleLabelReplacements(
  events: NonNullable<ReturnType<typeof getNormalizedStateEventExtra>>["events"],
  roleNameById: Record<number, string>,
): Array<{ rawLabel: string; displayLabel: string }> {
  const seen = new Set<string>();
  const replacements = events.flatMap((event) => {
    if (event.type === "mapTokenUpsert" || event.type === "mapTokenRemove") {
      const rawLabel = `地图角色 #${event.roleId}`;
      if (seen.has(rawLabel)) {
        return [];
      }
      seen.add(rawLabel);
      const displayLabel = formatStateRoleLabel(event.roleId, { roleNameById });
      return rawLabel === displayLabel ? [] : [{ rawLabel, displayLabel }];
    }

    if (event.type === "nextTurn" || !("scope" in event)) {
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
  return replacements.sort((left, right) => right.rawLabel.length - left.rawLabel.length);
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
  const roleLabelReplacements = React.useMemo(() => {
    if (!normalizedStateEvent) {
      return [];
    }

    return buildStateRoleLabelReplacements(normalizedStateEvent.events, roleNameById);
  }, [normalizedStateEvent, roleNameById]);
  const fallbackDetailLines = React.useMemo(() => {
    if (!normalizedStateEvent) {
      return ["消息缺少可解析的 stateEvent 结构。"];
    }
    return normalizedStateEvent.events.map(event => formatStateEventAtomDetail(event, { roleNameById }));
  }, [normalizedStateEvent, roleNameById]);

  const primaryText = summary?.primaryText
    ?? formatStateEventPreviewText(message.extra, message.content).replace(/^\[状态\]\s*/, "");
  const displayPrimaryText = roleLabelReplacements.reduce(
    (nextText, pair) => nextText.replaceAll(pair.rawLabel, pair.displayLabel),
    primaryText,
  );
  const compactPrimaryText = displayPrimaryText.replace(/\s*->\s*/g, "→");
  const isCombatInitiativeBatchSummary = primaryText.startsWith("全员先攻 ");
  const compactText = !isCombatInitiativeBatchSummary && scopeLabels.length > 0
    ? `${scopeLabels.join(" / ")} · ${compactPrimaryText}`
    : compactPrimaryText;
  const detailLines = React.useMemo(() => {
    const baseLines = summary?.detailLines ?? fallbackDetailLines;
    if (roleLabelReplacements.length === 0) {
      return baseLines;
    }
    return baseLines.map(line => roleLabelReplacements.reduce(
      (nextLine, pair) => nextLine.replaceAll(pair.rawLabel, pair.displayLabel),
      line,
    ));
  }, [fallbackDetailLines, roleLabelReplacements, summary?.detailLines]);
  const sourceLabel = normalizedStateEvent
    ? `${normalizedStateEvent.source.kind}${normalizedStateEvent.source.commandName ? ` / ${normalizedStateEvent.source.commandName}` : ""} / ${normalizedStateEvent.source.parserVersion}`
    : "未知来源";

  return (
    <div className="inline-flex max-w-full flex-col items-center gap-1">
      <div className={`
        ${STATE_MESSAGE_CARD_CLASS}
        ${STATE_MESSAGE_IDLE_CLASS}
      `}>
        <span className={STATE_MESSAGE_TEXT_CLASS}>
          {compactText}
        </span>
        <button
          type="button"
          className={STATE_MESSAGE_ACTION_CLASS}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded(value => !value);
          }}
        >
          {expanded ? "收起" : "详情"}
        </button>
      </div>

      {expanded && (
        <div className={STATE_MESSAGE_DETAIL_CLASS}>
          <div>
            <div className="
              mb-1 text-[11px] font-semibold uppercase tracking-wide
              text-base-content/50
            ">
              记录文本
            </div>
            <div className="
              wrap-break-word rounded-md bg-base-200/35 px-2 py-1.5 font-mono
              text-[12px] text-base-content/76
            ">
              {message.content || "[空记录]"}
            </div>
          </div>

          <div className="
            flex flex-wrap items-center gap-2 text-base-content/60
          ">
            <span className="uppercase tracking-wide text-base-content/50">来源</span>
            <span className="break-all">{sourceLabel}</span>
          </div>

          <div className="space-y-1">
            <div className="
              text-[11px] font-semibold uppercase tracking-wide
              text-base-content/50
            ">
              结构化详情
            </div>
            <div className="space-y-1">
              {detailLines.map((line, index) => (
                <div
                  key={`${message.messageId}:detail:${index}`}
                  className="
                    wrap-break-word rounded-md bg-base-200/30 px-2 py-1.5
                    text-base-content/70
                  "
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
