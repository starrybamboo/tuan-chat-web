import type { StateEventExtra } from "@/types/stateEvent";

import { buildCommandStateEventExtra, buildRoleStateEventScope, STATE_EVENT_VAR_OP } from "@/types/stateEvent";

type ParseSimpleStateCommandParams = {
  inputText: string;
  inputTextWithoutMentions: string;
  curRoleId: number;
  mentionedRoleCount: number;
};

export type ParsedSimpleStateCommand = {
  content: string;
  stateEvent: StateEventExtra;
};

const SIMPLE_ST_RE = /^[.。/]st\s+([^\s]+)\s+([+-]?\d+(?:\.\d+)?)\s*$/i;
const SIMPLE_NEXT_RE = /^[.。/]next\s*$/i;

export function parseSimpleStateCommand({
  inputText,
  inputTextWithoutMentions,
  curRoleId,
  mentionedRoleCount,
}: ParseSimpleStateCommandParams): ParsedSimpleStateCommand | null {
  if (mentionedRoleCount > 0 || curRoleId <= 0) {
    return null;
  }

  const trimmedInputText = inputText.trim();
  const trimmedWithoutMentions = inputTextWithoutMentions.trim();

  const nextMatch = SIMPLE_NEXT_RE.exec(trimmedWithoutMentions);
  if (nextMatch) {
    return {
      content: trimmedInputText,
      stateEvent: buildCommandStateEventExtra("next", [{ type: "nextTurn" }]),
    };
  }

  const stMatch = SIMPLE_ST_RE.exec(trimmedWithoutMentions);
  if (!stMatch) {
    return null;
  }

  const [, rawKey, rawValue] = stMatch;
  const key = rawKey.trim();
  if (!key) {
    return null;
  }
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    return null;
  }

  const op = rawValue.startsWith("+")
    ? STATE_EVENT_VAR_OP.ADD
    : rawValue.startsWith("-")
      ? STATE_EVENT_VAR_OP.SUB
      : STATE_EVENT_VAR_OP.SET;

  return {
    content: trimmedInputText,
    stateEvent: buildCommandStateEventExtra("st", [{
      type: "varOp",
      scope: buildRoleStateEventScope(curRoleId),
      key,
      op,
      value: op === STATE_EVENT_VAR_OP.SET ? value : Math.abs(value),
    }]),
  };
}
