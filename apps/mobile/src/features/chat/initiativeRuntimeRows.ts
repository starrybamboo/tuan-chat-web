import type { ActiveStateInstance, CombatParticipant } from "@tuanchat/domain/state-runtime";

export type MobileInitiativeRow = {
  activeStates: ActiveStateInstance[];
  hp: number | null;
  index: number;
  initiative: number;
  maxHp: number | null;
  name: string;
  participantId: string;
};

function readNumber(values: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = values[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

export function buildMobileInitiativeRows(participants: CombatParticipant[]): MobileInitiativeRow[] {
  return participants.map((participant, index) => {
    const stateValues = {
      ...participant.baseValues,
      ...participant.derivedValues,
    };

    return {
      activeStates: participant.activeStates,
      hp: readNumber(participant.derivedValues, ["hp"]) ?? readNumber(participant.values, ["hp"]),
      index,
      initiative: participant.initiative,
      maxHp: readNumber(stateValues, ["maxHp", "maxhp", "hpMax", "hpmax"]) ?? readNumber(participant.values, ["maxHp", "maxhp"]),
      name: participant.name,
      participantId: participant.participantId,
    };
  });
}
