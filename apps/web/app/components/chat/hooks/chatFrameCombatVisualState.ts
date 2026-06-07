import type { ChatMessageResponse } from "../../../../api";

const COMBAT_START_EVENT_TYPES = new Set(["combatRoundStart", "combatStart"]);
const COMBAT_END_EVENT_TYPES = new Set(["combatRoundEnd", "combatEnd"]);

type CombatVisualSignal = "start" | "end" | null;

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
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
