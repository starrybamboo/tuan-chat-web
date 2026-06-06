export type CombatRoundPrimaryAction = "end" | "start";

export type CombatRoundControlState = {
  canAdvanceTurn: boolean;
  canEndCombat: boolean;
  canStartCombat: boolean;
  primaryAction: CombatRoundPrimaryAction;
};

export function getCombatRoundControlState(combatRoundActive: boolean): CombatRoundControlState {
  return {
    canAdvanceTurn: combatRoundActive,
    canEndCombat: combatRoundActive,
    canStartCombat: !combatRoundActive,
    primaryAction: combatRoundActive ? "end" : "start",
  };
}
