type QueryReadyState = {
  isError?: boolean;
  isFetched?: boolean;
};

type RoomBlocksuitePrewarmReadyParams = {
  abilityLoading: boolean;
  historyLoading: boolean;
  membersReady: boolean;
  roomInfoReady: boolean;
  rolesReady: boolean;
  spaceInfoReady: boolean;
};

export function isInitialQueryReady(query: QueryReadyState): boolean {
  return Boolean(query.isFetched || query.isError);
}

export function isRoomBlocksuitePrewarmReady({
  abilityLoading,
  historyLoading,
  membersReady,
  roomInfoReady,
  rolesReady,
  spaceInfoReady,
}: RoomBlocksuitePrewarmReadyParams): boolean {
  return spaceInfoReady
    && roomInfoReady
    && membersReady
    && rolesReady
    && !historyLoading
    && !abilityLoading;
}
