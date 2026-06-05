import type { StateEventExtra, StateEventVarOpKind } from "./state-event";

import { buildCommandStateEventExtra, buildRoleStateEventScope, buildUiStateEventExtra, formatStateKeyLabel, formatStateNumericValue, STATE_EVENT_VAR_OP } from "./state-event";

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

export const START_COMBAT_CONTENT = "战斗开始";
export const END_COMBAT_CONTENT = "战斗结束：回合归零";
export const NEXT_TURN_CONTENT = "下一回合";

const SIMPLE_ST_SPACED_RE = /^[.。/]st\s+(\S+) +([+-]?\d+(?:\.\d+)?)\s*$/i;
// eslint-disable-next-line regexp/no-super-linear-backtracking -- anchored regex on short user input, no real risk
const SIMPLE_ST_COMPACT_SIGNED_RE = /^[.。/]st\s+(.+?)([+-]\d+(?:\.\d+)?)\s*$/i;
const SIMPLE_ST_COMPACT_UNSIGNED_RE = /^[.。/]st\s+([^\s\d+-]+)(\d+(?:\.\d+)?)\s*$/i;
const SIMPLE_NEXT_RE = /^[.。/]next\s*$/i;
const SIMPLE_COMBAT_START_RE = /^[.。/](?:combat\s+start|startcombat|start-combat)\s*$/i;
const SIMPLE_COMBAT_END_RE = /^[.。/](?:combat\s+end|endcombat|end-combat)\s*$/i;

function buildStateVarOpContent(key: string, op: StateEventVarOpKind, value: number): string {
  const opLabel = op === STATE_EVENT_VAR_OP.SET
    ? "="
    : op === STATE_EVENT_VAR_OP.ADD
      ? "+"
      : "-";
  const valueText = formatStateNumericValue(value);
  return op === STATE_EVENT_VAR_OP.SET
    ? `状态更新：${formatStateKeyLabel(key)} ${opLabel} ${valueText}`
    : `状态更新：${formatStateKeyLabel(key)} ${opLabel}${valueText}`;
}

export function buildStartCombatStateEventExtra(): StateEventExtra {
  return buildUiStateEventExtra([{ type: "combatRoundStart" }]);
}

export function buildEndCombatStateEventExtra(): StateEventExtra {
  return buildUiStateEventExtra([{ type: "combatRoundEnd" }]);
}

export function parseSimpleStateCommand({
  inputTextWithoutMentions,
  curRoleId,
  mentionedRoleCount,
}: ParseSimpleStateCommandParams): ParsedSimpleStateCommand | null {
  const trimmedWithoutMentions = inputTextWithoutMentions.trim();

  const nextMatch = SIMPLE_NEXT_RE.exec(trimmedWithoutMentions);
  if (nextMatch) {
    return {
      content: NEXT_TURN_CONTENT,
      stateEvent: buildCommandStateEventExtra("next", [{ type: "nextTurn" }]),
    };
  }

  if (SIMPLE_COMBAT_START_RE.test(trimmedWithoutMentions)) {
    return {
      content: START_COMBAT_CONTENT,
      stateEvent: buildStartCombatStateEventExtra(),
    };
  }

  if (SIMPLE_COMBAT_END_RE.test(trimmedWithoutMentions)) {
    return {
      content: END_COMBAT_CONTENT,
      stateEvent: buildEndCombatStateEventExtra(),
    };
  }

  if (mentionedRoleCount > 0 || curRoleId <= 0) {
    return null;
  }

  const stMatch = SIMPLE_ST_SPACED_RE.exec(trimmedWithoutMentions)
    ?? SIMPLE_ST_COMPACT_SIGNED_RE.exec(trimmedWithoutMentions)
    ?? SIMPLE_ST_COMPACT_UNSIGNED_RE.exec(trimmedWithoutMentions);
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
    content: buildStateVarOpContent(key, op, op === STATE_EVENT_VAR_OP.SET ? value : Math.abs(value)),
    stateEvent: buildCommandStateEventExtra("st", [{
      type: "varOp",
      scope: buildRoleStateEventScope(curRoleId),
      key,
      op,
      value: op === STATE_EVENT_VAR_OP.SET ? value : Math.abs(value),
    }]),
  };
}
