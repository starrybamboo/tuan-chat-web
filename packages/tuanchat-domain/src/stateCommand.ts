import type { StateEventExtra } from "./state-event";

import { buildCommandStateEventExtra, buildRoleStateEventScope, STATE_EVENT_VAR_OP } from "./state-event";

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

const SIMPLE_ST_SPACED_RE = /^[.。/]st\s+(\S+)\s+([+-]?\d+(?:\.\d+)?)\s*$/i;
const SIMPLE_ST_PREFIX_RE = /^[.。/]st\s/i;
const SIMPLE_SIGNED_NUMBER_RE = /^[+-]\d+(?:\.\d+)?$/;
const SIMPLE_NEXT_RE = /^[.。/]next\s*$/i;

function parseCompactSignedStateCommand(inputText: string): [rawKey: string, rawValue: string] | null {
  if (!SIMPLE_ST_PREFIX_RE.test(inputText)) {
    return null;
  }
  const body = inputText.slice(3).trim();
  const valueStartIndex = Math.max(body.lastIndexOf("+"), body.lastIndexOf("-"));
  if (valueStartIndex <= 0) {
    return null;
  }

  const rawKey = body.slice(0, valueStartIndex).trim();
  const rawValue = body.slice(valueStartIndex).trim();
  if (!rawKey || !SIMPLE_SIGNED_NUMBER_RE.test(rawValue)) {
    return null;
  }
  return [rawKey, rawValue];
}

export function parseSimpleStateCommand({
  inputText,
  inputTextWithoutMentions,
  curRoleId,
  mentionedRoleCount,
}: ParseSimpleStateCommandParams): ParsedSimpleStateCommand | null {
  const trimmedInputText = inputText.trim();
  const trimmedWithoutMentions = inputTextWithoutMentions.trim();

  const nextMatch = SIMPLE_NEXT_RE.exec(trimmedWithoutMentions);
  if (nextMatch) {
    return {
      content: trimmedInputText,
      stateEvent: buildCommandStateEventExtra("next", [{ type: "nextTurn" }]),
    };
  }

  if (mentionedRoleCount > 0 || curRoleId <= 0) {
    return null;
  }

  const stMatch = SIMPLE_ST_SPACED_RE.exec(trimmedWithoutMentions);
  const compactMatch = stMatch ? null : parseCompactSignedStateCommand(trimmedWithoutMentions);
  if (!stMatch && !compactMatch) {
    return null;
  }

  const rawKey = stMatch?.[1] ?? compactMatch?.[0] ?? "";
  const rawValue = stMatch?.[2] ?? compactMatch?.[1] ?? "";
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
