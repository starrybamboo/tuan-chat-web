export type CombatEventSubmitState = {
  combatEventInFlight: boolean;
  messageSendInFlight: boolean;
};

export function canSubmitCombatEvent(state: CombatEventSubmitState): boolean {
  return !state.combatEventInFlight && !state.messageSendInFlight;
}
