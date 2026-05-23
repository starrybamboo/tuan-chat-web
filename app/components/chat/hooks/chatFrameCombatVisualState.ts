import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../../../api";

const COMBAT_START_EVENT_TYPES = new Set(["combatRoundStart", "combatStart"]);
const COMBAT_END_EVENT_TYPES = new Set(["combatRoundEnd", "combatEnd"]);
const INITIATIVE_COMMAND_PATTERN = /^[.。/]ri(?:\s|$)/i;
const COMBAT_START_TEXT_PATTERN = /(?:战斗轮?|combat)\s*(?:开始|开启|启动|start)|(?:进入|开始)\s*(?:战斗轮?|combat)/i;
const COMBAT_END_TEXT_PATTERN = /(?:战斗轮?|combat)\s*(?:结束|终止|关闭|end)|(?:退出|结束)\s*(?:战斗轮?|combat)/i;

type CombatVisualSignal = "start" | "end" | null;

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getCommandRequestCommand(extra: unknown): string {
  const commandRequest = toRecord(toRecord(extra)?.commandRequest);
  const command = commandRequest?.command;
  return typeof command === "string" ? command.trim() : "";
}

function getStateEventSignal(extra: unknown): CombatVisualSignal {
  const stateEvent = toRecord(toRecord(extra)?.stateEvent);
  const events = stateEvent?.events;
  if (!Array.isArray(events)) {
    return null;
  }

  let signal: CombatVisualSignal = null;
  events.forEach((event) => {
    const type = toRecord(event)?.type;
    if (typeof type !== "string") {
      return;
    }
    if (COMBAT_START_EVENT_TYPES.has(type)) {
      signal = "start";
    }
    if (COMBAT_END_EVENT_TYPES.has(type)) {
      signal = "end";
    }
  });
  return signal;
}

export function getCombatVisualSignal(message: ChatMessageResponse["message"]): CombatVisualSignal {
  if (message.status === 1) {
    return null;
  }

  const stateEventSignal = getStateEventSignal(message.extra);
  if (stateEventSignal) {
    return stateEventSignal;
  }

  const content = String(message.content ?? "").trim();
  if (COMBAT_END_TEXT_PATTERN.test(content)) {
    return "end";
  }
  if (COMBAT_START_TEXT_PATTERN.test(content)) {
    return "start";
  }

  if ((message.messageType as number) === MESSAGE_TYPE.COMMAND_REQUEST) {
    const command = getCommandRequestCommand(message.extra) || content;
    if (INITIATIVE_COMMAND_PATTERN.test(command)) {
      return "start";
    }
  }

  return null;
}

export function deriveCombatVisualActiveAtMessageIndex(
  messages: ChatMessageResponse[],
  currentMessageIndex: number,
): boolean {
  let active = false;
  const lastIndex = Math.min(currentMessageIndex, messages.length - 1);
  for (let index = 0; index <= lastIndex; index++) {
    const signal = getCombatVisualSignal(messages[index]!.message);
    if (signal === "start") {
      active = true;
    }
    else if (signal === "end") {
      active = false;
    }
  }
  return active;
}
