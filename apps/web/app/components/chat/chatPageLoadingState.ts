type RoomSelectionLoadingParams = {
  activeSpaceId: number | null;
  activeRoomId: number | null;
  isSidebarTreeReady: boolean;
  isUserRoomsPending: boolean;
};

export function shouldShowRoomSelectionLoading({
  activeSpaceId,
  activeRoomId,
  isSidebarTreeReady,
  isUserRoomsPending,
}: RoomSelectionLoadingParams): boolean {
  if (!activeSpaceId || activeRoomId != null) {
    return false;
  }

  return !isSidebarTreeReady || isUserRoomsPending;
}
