type QueryInvalidator = {
  invalidateQueries: (options: { queryKey: readonly unknown[] }) => unknown;
};

type MemberChangeEventData = {
  roomId?: number | null;
  spaceId?: number | null;
};

type RoleChangeEventData = {
  roomId?: number | null;
  spaceId?: number | null;
};

function isPositiveId(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function invalidateMemberChangeQueries(
  queryClient: QueryInvalidator,
  eventData: MemberChangeEventData | undefined,
) {
  const roomId = eventData?.roomId;
  if (isPositiveId(roomId)) {
    queryClient.invalidateQueries({ queryKey: ["getRoomMemberList", roomId] });
  }

  const spaceId = eventData?.spaceId;
  if (isPositiveId(spaceId)) {
    queryClient.invalidateQueries({ queryKey: ["getSpaceMemberList", spaceId] });
    return;
  }

  queryClient.invalidateQueries({ queryKey: ["getSpaceMemberList"] });
}

export function invalidateRoleChangeQueries(
  queryClient: QueryInvalidator,
  eventData: RoleChangeEventData | undefined,
) {
  const roomId = eventData?.roomId;
  if (isPositiveId(roomId)) {
    queryClient.invalidateQueries({ queryKey: ["roomRole", roomId] });
  }

  const spaceId = eventData?.spaceId;
  if (isPositiveId(spaceId)) {
    queryClient.invalidateQueries({ queryKey: ["spaceRole", spaceId] });
    queryClient.invalidateQueries({ queryKey: ["spaceRepositoryRole", spaceId] });
    return;
  }

  queryClient.invalidateQueries({ queryKey: ["spaceRole"] });
  queryClient.invalidateQueries({ queryKey: ["spaceRepositoryRole"] });
}
