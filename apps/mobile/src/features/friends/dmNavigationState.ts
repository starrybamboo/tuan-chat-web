import type { DmTab } from "./DmTopTabs";

export type DmBackTarget = "conversation" | "friend";

export type DmEntryNavigationState = {
  activeDmTab: DmTab;
  backTarget: DmBackTarget;
  currentContactId: number;
  shouldCloseDrawer: boolean;
};

export const DEFAULT_DM_TAB: DmTab = "chat";
export const DEFAULT_DM_BACK_TARGET: DmBackTarget = "conversation";

export function getDmTabForBackTarget(backTarget: DmBackTarget): DmTab {
  return backTarget === "friend" ? "friends" : "chat";
}

export function resolveDmEntryNavigationState(
  contactId: number,
  source: DmBackTarget = DEFAULT_DM_BACK_TARGET,
): DmEntryNavigationState {
  return {
    activeDmTab: getDmTabForBackTarget(source),
    backTarget: source,
    currentContactId: contactId,
    shouldCloseDrawer: true,
  };
}
