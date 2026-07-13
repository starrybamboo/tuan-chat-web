export type ChatShellBackNavigationAction
  = | "allow-system-back"
    | "back-from-dm"
    | "back-to-route-page"
    | "close-action-menu"
    | "close-clue-scope"
    | "close-create-room"
    | "close-create-space"
    | "close-expression-picker"
    | "close-map-sheet"
    | "close-member-invite"
    | "close-profile-sheet"
    | "close-right-drawer"
    | "close-role-switch"
    | "close-search"
    | "close-st-show-card";

export type ChatShellBackNavigationState = {
  actionMenuVisible: boolean;
  clueScopeOpen: boolean;
  createRoomVisible: boolean;
  createSpaceVisible: boolean;
  currentContactId: number | null;
  expressionPickerVisible: boolean;
  isRoutePage: boolean;
  mapSheetVisible: boolean;
  memberInviteVisible: boolean;
  profileSheetOpen: boolean;
  rightDrawerOpen: boolean;
  roleSwitchVisible: boolean;
  searchPageVisible: boolean;
  stShowCardOpen: boolean;
};

export function resolveChatShellBackNavigationAction(
  state: ChatShellBackNavigationState,
): ChatShellBackNavigationAction {
  if (state.actionMenuVisible) {
    return "close-action-menu";
  }
  if (state.clueScopeOpen) {
    return "close-clue-scope";
  }
  if (state.roleSwitchVisible) {
    return "close-role-switch";
  }
  if (state.expressionPickerVisible) {
    return "close-expression-picker";
  }
  if (state.mapSheetVisible) {
    return "close-map-sheet";
  }
  if (state.memberInviteVisible) {
    return "close-member-invite";
  }
  if (state.createRoomVisible) {
    return "close-create-room";
  }
  if (state.createSpaceVisible) {
    return "close-create-space";
  }
  if (state.profileSheetOpen) {
    return "close-profile-sheet";
  }
  if (state.stShowCardOpen) {
    return "close-st-show-card";
  }
  if (state.rightDrawerOpen) {
    return "close-right-drawer";
  }
  if (state.searchPageVisible) {
    return "close-search";
  }
  if (state.currentContactId != null) {
    return "back-from-dm";
  }
  if (!state.isRoutePage) {
    return "back-to-route-page";
  }
  return "allow-system-back";
}
