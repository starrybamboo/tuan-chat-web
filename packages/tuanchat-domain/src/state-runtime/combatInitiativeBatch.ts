import type { StateEventExtra } from "../state-event";

export function buildCombatInitiativeBatchPrimaryText(extra: Pick<StateEventExtra, "events" | "source"> | null | undefined): string | null {
  if (!extra || extra.source.kind !== "ui") {
    return null;
  }

  let participantCount = 0;
  let sawCombatRoundEnd = false;
  let sawOrderSet = false;

  for (const atom of extra.events) {
    if (atom.type === "combatParticipantUpsert") {
      participantCount += 1;
      continue;
    }
    if (atom.type === "combatRoundEnd") {
      sawCombatRoundEnd = true;
      continue;
    }
    if (atom.type === "combatOrderSet") {
      sawOrderSet = true;
      continue;
    }
    return null;
  }

  if (sawCombatRoundEnd) {
    return participantCount === 0 && !sawOrderSet
      ? "战斗结束"
      : null;
  }

  return sawOrderSet && participantCount > 0
    ? `全员先攻 ${participantCount} 人`
    : null;
}
