import type { SideDrawerState } from "@/components/chat/stores/sideDrawerStore";

export type RunSideDrawerTarget = "clue" | "combat" | "map";
export type RunSideDrawerState = "map" | "combat" | "clue" | "initiative" | "state";

export function isCombatDrawerState(state: string): state is "combat" | "initiative" | "state" {
  return state === "combat" || state === "initiative" || state === "state";
}

export function isRunSideDrawerState(state: SideDrawerState): state is RunSideDrawerState {
  return state === "map" || state === "clue" || isCombatDrawerState(state);
}

export function isRunSideDrawerTargetOpen(state: SideDrawerState, target: RunSideDrawerTarget): boolean {
  if (target === "combat") {
    return state === "combat" || state === "initiative" || state === "state";
  }
  return state === target;
}

export function getNextRunSideDrawerState(
  state: SideDrawerState,
  target: RunSideDrawerTarget,
): SideDrawerState {
  return isRunSideDrawerTargetOpen(state, target) ? "none" : target;
}
